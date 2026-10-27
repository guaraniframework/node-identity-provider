import { Injectable } from '@guarani/di';
import { DigitalSignatureAlgorithm, JsonWebKey, jwk } from '@guarani/jose';

import { JwtBearerClientAssertion } from '../../client-assertions/jwt-bearer/jwt-bearer.client-assertion';
import { DataAccess } from '../../data-access/data-access';
import { Client } from '../../entities/client';
import { InvalidClientError } from '../../errors/invalid-client/invalid-client.error';
import { Logger } from '../../loggers/logger';
import { Settings } from '../../settings/settings';
import { ClientAuthenticationName } from '../client-authentication-name.type';

/**
 * Implementation of the Client Secret JWT Client Authentication Method.
 */
@Injectable()
export class ClientSecretJwtClientAuthentication extends JwtBearerClientAssertion {
  /**
   * Name of the Client Authentication Method.
   */
  public readonly name: ClientAuthenticationName = 'client_secret_jwt';

  /**
   * JSON Web Signature Algorithms.
   */
  protected readonly algorithms: Exclude<DigitalSignatureAlgorithm, 'none'>[] = ['HS256', 'HS384', 'HS512'];

  /**
   * Instantiates a new Client Secret JWT Client Authentication Method.
   *
   * @param logger Logger of the Identity Provider.
   * @param clientService Data Access of the Identity Provider.
   * @param settings Settings of the Identity Provider.
   */
  public constructor(
    protected override readonly logger: Logger,
    protected override readonly dataAccess: DataAccess,
    protected override readonly settings: Settings,
  ) {
    super(logger, dataAccess, settings);
  }

  /**
   * Returns the Client Secret as a JSON Web Key to validate the Client Assertion.
   *
   * @param client Client of the Request.
   * @throws {InvalidClientError} Failed to obtain the Client's Client Assertion Sign JSON Web Key.
   * @returns Client Secret as a JSON Web Key.
   */
  protected async getClientAssertionClientSignJsonWebKey(client: Client): Promise<JsonWebKey> {
    this.logger.debug(
      `[${this.constructor.name}] Called getClientAssertionClientSignJsonWebKey()`,
      '9262eedc-c5e5-4ebf-a50a-297b92a8f34e',
      { client_id: client.id },
    );

    const clientSecret = client.secrets[0]!;

    if (new Date() > clientSecret.expiresAt) {
      const error = new InvalidClientError('Failed to authenticate the Client.');

      this.logger.error(
        `[${this.constructor.name}] The Client Secret is expired`,
        '20cad821-ca2d-4b04-a5d8-a6644e93f98e',
        { client_id: client.id },
        error,
      );

      throw error;
    }

    const jsonWebKey = await jwk.create({
      kty: 'oct',
      k: Buffer.from(clientSecret.secret, 'utf8').toString('base64url'),
    });

    this.logger.debug(
      `[${this.constructor.name}] Completed getClientAssertionClientSignJsonWebKey()`,
      '5bd942b9-16c4-4743-b9ca-307587eed769',
      { client_id: client.id, jwk: jsonWebKey },
    );

    return jsonWebKey;
  }
}
