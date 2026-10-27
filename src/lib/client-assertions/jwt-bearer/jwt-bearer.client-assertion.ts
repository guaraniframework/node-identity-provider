import { URL } from 'url';

import { DigitalSignatureAlgorithm, JsonWebKey, JsonWebSignatureHeaderParameters, jwe, jwt } from '@guarani/jose';
import { isNonEmptyString } from '@guarani/primitives';

import { DataAccess } from '../../data-access/data-access';
import { Client } from '../../entities/client';
import { IdentityProviderError } from '../../errors/identity-provider.error';
import { InvalidClientError } from '../../errors/invalid-client/invalid-client.error';
import { InvalidRequestError } from '../../errors/invalid-request/invalid-request.error';
import { HttpRequest } from '../../http/request/http-request';
import { Logger } from '../../loggers/logger';
import { Settings } from '../../settings/settings';
import { ClientAssertion } from '../client-assertion';
import { ClientAssertionName } from '../client-assertion-name.type';
import { JwtBearerClientAssertionParameters } from './jwt-bearer.client-assertion.parameters';

/**
 * Implementation of the JWT Bearer Client Assertion.
 */
export abstract class JwtBearerClientAssertion extends ClientAssertion {
  /**
   * JSON Web Signature Algorithms.
   */
  protected abstract readonly algorithms: Exclude<DigitalSignatureAlgorithm, 'none'>[];

  /**
   * Name of the Client Assertion Type.
   */
  public readonly clientAssertionType: ClientAssertionName = 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';

  /**
   * Instantiates a new JWT Bearer Client Assertion.
   *
   * @param logger Logger of the Identity Provider.
   * @param clientService Data Access of the Identity Provider.
   * @param settings Settings of the Identity Provider.
   */
  public constructor(
    protected override readonly logger: Logger,
    protected readonly dataAccess: DataAccess,
    protected readonly settings: Settings,
  ) {
    super(logger);
  }

  /**
   * Authenticates and returns the Client of the Request.
   *
   * @param request Http Request.
   * @throws {InvalidClientError} Failed to authenticate the Client.
   * @throws {InvalidRequestError} One of the provided parameters is invalid.
   * @returns Authenticated Client.
   */
  public async getClient(request: HttpRequest): Promise<Client> {
    this.logger.debug(`[${this.constructor.name}] Called getClient()`, '973cc193-f980-4286-b24c-84f512e597e8', {
      request,
    });

    let { client_assertion: clientAssertion } = request.form<JwtBearerClientAssertionParameters>();

    if (!isNonEmptyString(clientAssertion)) {
      const error = new InvalidRequestError('Invalid parameter "client_assertion".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "client_assertion"`,
        '4c2364ef-15b8-4740-aa60-eb704942a561',
        { request },
        error,
      );

      throw error;
    }

    try {
      if (clientAssertion.split('.').length === 5) {
        const { plaintext } = await jwe.compact.deserialize(clientAssertion, {
          expectedContentEncryptionAlgorithms: this.settings.clientAuthenticationEncryptionContentEncryptionAlgorithms,
          expectedKeyManagementAlgorithms: this.settings.clientAuthenticationEncryptionKeyWrapAlgorithms,
          jsonWebKey: await this.dataAccess.getClientAssertionUnwrapJsonWebKey!(),
        });

        clientAssertion = plaintext.toString('ascii');
      }

      const aud = new URL(request.path, this.settings.issuer).href;

      const {
        claims: { parameters: claims },
        header: { parameters: header },
      } = await jwt.signed.decode(clientAssertion, {
        validationOptions: {
          iss: { essential: true },
          sub: { essential: true },
          aud: { essential: true, values: [aud, [aud]] },
          exp: { essential: true },
          jti: { essential: true },
        },
      });

      if (header.alg === 'none') {
        const error = new InvalidClientError(
          'The Identity Provider disallows using the JSON Web Signature Algorithm "none".',
        );

        this.logger.error(
          `[${this.constructor.name}] The Client tried to use the JSON Web Signature Algorithm "none"`,
          '0dc5e319-d161-4a3d-b58d-590750c60236',
          { request },
          error,
        );

        throw error;
      }

      if (!this.settings.clientAuthenticationSigningAlgorithms.includes(header.alg)) {
        const error = new InvalidClientError(`Unsupported JSON Web Signature Algorithm "${header.alg}".`);

        this.logger.error(
          `[${this.constructor.name}] The Client tried to use the unsupported JSON Web Signature Algorithm "${header.alg}"`,
          'd24fdb8d-461c-4eaa-a7f9-a278fdfc7cd8',
          { request },
          error,
        );

        throw error;
      }

      if (!this.algorithms.includes(header.alg)) {
        const error = new InvalidClientError(
          `Unsupported JSON Web Signature Algorithm "${header.alg}" for Authentication Method "${this.name}".`,
        );

        this.logger.error(
          `[${this.constructor.name}] The Client tried to use the unsupported JSON Web Signature Algorithm "${header.alg}" ` +
            `for the Authentication Method "${this.name}"`,
          '8db925c7-8bc2-4f24-b2ed-41b4b9221b67',
          { request },
          error,
        );

        throw error;
      }

      const client = await this.dataAccess.findClientById(claims.sub!);

      if (!(client instanceof Client)) {
        const error = new InvalidClientError('Failed to authenticate the Client.');

        this.logger.error(
          `[${this.constructor.name}] Could not find a Client with the provided Identifier`,
          'd92b5212-a625-4653-8451-d5584ebd7eec',
          { request },
          error,
        );

        throw error;
      }

      // TODO: allow the application to validate the claims as it sees fit.
      if (client.authenticationMethod !== this.name) {
        const error = new InvalidClientError('Failed to authenticate the Client.');

        this.logger.error(
          `[${this.constructor.name}] The Client is not allowed to use the Client Authentication Method "${this.name}"`,
          '17b31431-4732-4505-b4ba-7970af4127fc',
          { request },
          error,
        );

        throw error;
      }

      if (client.authenticationSigningAlgorithm! !== header.alg) {
        const error = new InvalidClientError('Failed to authenticate the Client.');

        this.logger.error(
          `[${this.constructor.name}] The Client cannot use the Client Authentication Signing Algorithm "${header.alg}"`,
          'ab1c3893-3b1a-438d-bae2-5e5d437657ba',
          { request },
          error,
        );

        throw error;
      }

      const jsonWebKey = await this.getClientAssertionClientSignJsonWebKey(client, header);

      await jwt.signed.deserialize(clientAssertion, {
        expectedDigitalSignatureAlgorithms: this.settings.clientAuthenticationSigningAlgorithms,
        jsonWebKey,
      });

      this.logger.debug(`[${this.constructor.name}] Completed getClient()`, 'c89ad02e-6bbf-42cc-a232-4ec84a835bad', {
        request,
        client_id: client.id,
      });

      return client;
    } catch (err: unknown) {
      if (err instanceof IdentityProviderError) {
        throw err;
      }

      const error = new InvalidClientError('Invalid JSON Web Token Client Assertion.', { cause: err });

      this.logger.error(
        `[${this.constructor.name}] Invalid JSON Web Token Client Assertion`,
        'a1aee754-0d3d-4985-ad3c-90e42e840c5d',
        { request },
        error,
      );

      throw error;
    }
  }

  /**
   * Returns the JSON Web Key of the Client used to validate the Client Assertion.
   *
   * @param client Client of the Request.
   * @param header JSON Web Signature Header of the Client Assertion.
   * @throws {InvalidClientError} Failed to obtain the Client's Client Assertion Sign JSON Web Key.
   * @returns JSON Web Key of the Client based on the JSON Web Signature Header.
   */
  protected abstract getClientAssertionClientSignJsonWebKey(
    client: Client,
    header: JsonWebSignatureHeaderParameters,
  ): Promise<JsonWebKey>;
}
