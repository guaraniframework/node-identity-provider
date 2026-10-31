import { URL } from 'url';

import { Injectable, InjectAll } from '@guarani/di';
import { DigitalSignatureAlgorithm, JsonWebKey, JsonWebSignatureHeaderParameters, jwe, jwt } from '@guarani/jose';
import { isNonEmptyString } from '@guarani/primitives';

import { ClientAuthentication } from '../../../client-authentication/client-authentication';
import { TOKEN_CLIENT_AUTHENTICATION } from '../../../constants';
import { JwtBearerTokenContext } from '../../../context/token/jwt-bearer/jwt-bearer.token-context';
import { DataAccess } from '../../../data-access/data-access';
import { Client } from '../../../entities/client';
import { Scope } from '../../../entities/scope';
import { User } from '../../../entities/user';
import { IdentityProviderError } from '../../../errors/identity-provider.error';
import { InvalidGrantError } from '../../../errors/invalid-grant/invalid-grant.error';
import { InvalidRequestError } from '../../../errors/invalid-request/invalid-request.error';
import { GrantType } from '../../../grant-types/grant-type';
import { GrantTypeName } from '../../../grant-types/grant-type-name.type';
import { ClientAuthenticationHandler } from '../../../handlers/client-authentication/client-authentication.handler';
import { ScopeHandler } from '../../../handlers/scope/scope.handler';
import { HttpRequest } from '../../../http/request/http-request';
import { Logger } from '../../../loggers/logger';
import { JwtBearerTokenRequest } from '../../../requests/token/jwt-bearer/jwt-bearer.token-request';
import { Settings } from '../../../settings/settings';
import { getClientJsonWebKey } from '../../../utils/get-client-jsonwebkey/get-client-jsonwebkey';
import { getClientSecretAsJsonWebKey } from '../../../utils/get-client-secret-as-jsonwebkey/get-client-secret-as-jsonwebkey';
import { TokenValidator } from '../token.validator';

/**
 * Implementation of the JWT Bearer Token Validator.
 */
@Injectable()
export class JwtBearerTokenValidator extends TokenValidator<JwtBearerTokenContext> {
  /**
   * Name of the Grant Type that uses this Validator.
   */
  public readonly name: GrantTypeName = 'urn:ietf:params:oauth:grant-type:jwt-bearer';

  /**
   * Instantiates a new JWT Bearer Token Validator.
   *
   * @param logger Logger of the Identity Provider.
   * @param dataAccess Data Access of the Identity Provider.
   * @param clientAuthenticationHandler Client Authentication Handler of the Identity Provider.
   * @param scopeHandler Scope Handler of the Identity Provider.
   * @param settings Settings of the Identity Provider.
   * @param grantTypes Grant Types of the Identity Provider.
   * @param clientAuthenticationMethods Token Endpoint Client Authentication Methods of the Identity Provider.
   */
  public constructor(
    protected override readonly logger: Logger,
    private readonly dataAccess: DataAccess,
    protected override readonly clientAuthenticationHandler: ClientAuthenticationHandler,
    private readonly scopeHandler: ScopeHandler,
    private readonly settings: Settings,
    @InjectAll(GrantType) protected override readonly grantTypes: GrantType[],
    @InjectAll(TOKEN_CLIENT_AUTHENTICATION)
    protected override readonly clientAuthenticationMethods: ClientAuthentication[],
  ) {
    super(logger, clientAuthenticationHandler, grantTypes, clientAuthenticationMethods);

    if (typeof this.dataAccess.getJwtBearerGrantUnwrapJsonWebKey !== 'function') {
      const error = new TypeError(
        'Missing implementation of required method "DataAccess.getJwtBearerGrantUnwrapJsonWebKey".',
      );

      this.logger.fatal(
        `[${this.constructor.name}] Missing implementation of required method "DataAccess.getJwtBearerGrantUnwrapJsonWebKey"`,
        'b2d29f38-58ba-485d-a50b-844efe7f75b9',
        null,
        error,
      );

      throw error;
    }
  }

  /**
   * Validates the Http Request and returns the actors of the JWT Bearer Token Context.
   *
   * @param request Http Request.
   * @returns JWT Bearer Token Context.
   */
  public override async validate(request: HttpRequest): Promise<JwtBearerTokenContext> {
    this.logger.debug(`[${this.constructor.name}] Called validate()`, 'a8021085-541a-49a4-8683-ec324cee9ef7', {
      request,
    });

    const context = await super.validate(request);

    const { client, parameters } = context;

    const user = await this.getSubjectFromAssertion(request, parameters, client);
    const scopes = await this.getScopes(parameters, client);

    Object.assign<JwtBearerTokenContext, Partial<JwtBearerTokenContext>>(context, { user, scopes });

    this.logger.debug(`[${this.constructor.name}] Completed validate()`, 'c196e2a1-c423-4580-ad14-24d7983c610f', {
      request,
      context,
    });

    return context;
  }

  /**
   * Returns the User represented by the Client in its Assertion.
   *
   * @param request Http Request.
   * @param parameters Parameters of the JWT Bearer Token Request.
   * @param client Client requesting authorization.
   * @returns User represented in the Assertion.
   */
  private async getSubjectFromAssertion(
    request: HttpRequest,
    parameters: JwtBearerTokenRequest,
    client: Client,
  ): Promise<User> {
    this.logger.debug(
      `[${this.constructor.name}] Called getSubjectFromAssertion()`,
      'f8bcb301-0ce8-4d5f-abcc-66331f32ed7d',
      { request, parameters, client_id: client.id },
    );

    if (!('assertion' in parameters) || !isNonEmptyString(parameters.assertion)) {
      const error = new InvalidRequestError('Invalid parameter "assertion".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "assertion"`,
        'beb456cd-ce83-4b95-b595-4373f6d42695',
        { request, parameters, client_id: client.id },
        error,
      );

      throw error;
    }

    let assertion = parameters.assertion;

    try {
      if (assertion.split('.').length === 5) {
        const { plaintext } = await jwe.compact.deserialize(assertion, {
          expectedContentEncryptionAlgorithms: this.settings.jwtBearerGrantEncryptionContentEncryptionAlgorithms,
          expectedKeyManagementAlgorithms: this.settings.jwtBearerGrantEncryptionKeyWrapAlgorithms,
          jsonWebKey: await this.dataAccess.getJwtBearerGrantUnwrapJsonWebKey!(),
        });

        assertion = plaintext.toString('ascii');
      }

      const issuer = this.settings.issuer.href;
      const tokenEndpoint = new URL(request.path, this.settings.issuer.href).href;

      const {
        claims: { parameters: claims },
        header: { parameters: header },
      } = await jwt.signed.decode(assertion, {
        validationOptions: {
          iss: { essential: true, value: client.id },
          sub: { essential: true },
          aud: {
            essential: true,
            // TODO: Check if this behaves like a Set.
            values: [
              issuer,
              tokenEndpoint,
              [issuer],
              [tokenEndpoint],
              [issuer, tokenEndpoint],
              [tokenEndpoint, issuer],
            ],
          },
          exp: { essential: true },
        },
      });

      if (header.alg === 'none') {
        const error = new InvalidGrantError(
          'The Identity Provider disallows using the JSON Web Signature Algorithm "none".',
        );

        this.logger.error(
          `[${this.constructor.name}] The Client tried to use the JSON Web Signature Algorithm "none"`,
          'c9353b6a-02c1-425c-bc71-b8765c4e1b3a',
          { request, parameters, client_id: client.id },
          error,
        );

        throw error;
      }

      if (!this.settings.jwtBearerGrantSigningAlgorithms.includes(header.alg)) {
        const error = new InvalidGrantError(`Unsupported JSON Web Signature Algorithm "${header.alg}".`);

        this.logger.error(
          `[${this.constructor.name}] Unsupported JSON Web Signature Algorithm "${header.alg}"`,
          'ed9ac8df-0bad-4f38-85c7-7bfbe3410d7e',
          { request, parameters, client_id: client.id },
          error,
        );

        throw error;
      }

      const jsonWebKey = await this.getJwtBearerGrantClientSignJsonWebKey(client, header);

      await jwt.signed.deserialize(assertion, {
        expectedDigitalSignatureAlgorithms: this.settings.jwtBearerGrantSigningAlgorithms,
        jsonWebKey,
      });

      const user = await this.dataAccess.findUserById(claims.sub!);

      if (!(user instanceof User)) {
        const error = new InvalidGrantError('Could not find the User of the Assertion.');

        this.logger.error(
          `[${this.constructor.name}] Could not find the User of the Assertion`,
          '5e0d0a94-11d3-4a91-9b3e-085511a77a07',
          { request, parameters, client_id: client.id },
          error,
        );

        throw error;
      }

      this.logger.debug(
        `[${this.constructor.name}] Completed getSubjectFromAssertion()`,
        '0c1d3b8c-e9fb-4c59-8d40-feeb96a73545',
        { request, parameters, client_id: client.id, user_id: user.id },
      );

      return user;
    } catch (err: unknown) {
      if (err instanceof IdentityProviderError) {
        throw err;
      }

      const error = new InvalidGrantError('Invalid JSON Web Token Assertion.', { cause: err });

      this.logger.error(
        `[${this.constructor.name}] Invalid JSON Web Token Assertion`,
        '07fe7cd3-1cae-4ac0-bb32-14574ae8ef59',
        { request, parameters, client_id: client.id },
        error,
      );

      throw error;
    }
  }

  /**
   * Checks if the provided scope is supported by the Identity Provider and if the Client is allowed to request it,
   * then return the granted scopes for further processing.
   *
   * @param parameters Parameters of the JWT Bearer Token Request.
   * @param client Client of the Request.
   * @returns Scopes granted to the Client.
   */
  private async getScopes(parameters: JwtBearerTokenRequest, client: Client): Promise<Scope[]> {
    this.logger.debug(`[${this.constructor.name}] Called getScopes()`, '95fcf005-c370-4a9a-9a7b-82abe8a58d1c', {
      parameters,
      client_id: client.id,
    });

    if ('scope' in parameters && !isNonEmptyString(parameters.scope)) {
      const error = new InvalidRequestError('Invalid parameter "scope".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "scope"`,
        '1c4db530-a5ac-4587-93f7-ad9313812094',
        { parameters, client_id: client.id },
        error,
      );

      throw error;
    }

    const scopes = parameters.scope?.split(' ') ?? [];
    await this.scopeHandler.checkRequestedScopes(scopes);
    const allowedScopes = await this.scopeHandler.getAllowedScopes(client, scopes);

    this.logger.debug(`[${this.constructor.name}] Completed getScopes()`, '245ded41-ede5-411b-9c1a-402fe47f0cfc', {
      parameters,
      client_id: client.id,
      allowed_scopes: allowedScopes.map((scope) => scope.name),
    });

    return allowedScopes;
  }

  /**
   * Returns the JSON Web Key of the Client used to validate the Assertion.
   *
   * @param client Client of the Request.
   * @param header JSON Web Signature Header of the Assertion.
   * @returns JSON Web Key of the Client based on the JSON Web Signature Header.
   */
  private async getJwtBearerGrantClientSignJsonWebKey(
    client: Client,
    header: JsonWebSignatureHeaderParameters,
  ): Promise<JsonWebKey> {
    this.logger.debug(`[${this.constructor.name}] Called getClientKey()`, 'c98ecc74-6692-4f43-991c-089b45957e8e', {
      client_id: client.id,
      header,
    });

    let jsonWebKey!: JsonWebKey;

    switch (true) {
      case (<DigitalSignatureAlgorithm[]>['HS256', 'HS384', 'HS512']).includes(header.alg):
        jsonWebKey = await getClientSecretAsJsonWebKey(client);
        break;

      default:
        jsonWebKey = await getClientJsonWebKey(client, (jsonWebKey) => {
          return (
            jsonWebKey.kid === header.kid &&
            jsonWebKey.use === 'sig' &&
            (jsonWebKey.key_ops?.includes('verify') ?? true)
          );
        });

        break;
    }

    this.logger.debug(`[${this.constructor.name}] Completed getClientKey()`, 'd2739d6e-daa9-46c8-a915-56509180febe', {
      client_id: client.id,
      header,
      jwk: jsonWebKey,
    });

    return jsonWebKey;
  }
}
