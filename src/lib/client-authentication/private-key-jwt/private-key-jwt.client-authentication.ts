import { Injectable } from '@guarani/di';
import { DigitalSignatureAlgorithm, JsonWebKey, JsonWebSignatureHeaderParameters } from '@guarani/jose';

import { JwtBearerClientAssertion } from '../../client-assertions/jwt-bearer/jwt-bearer.client-assertion';
import { DataAccess } from '../../data-access/data-access';
import { Client } from '../../entities/client';
import { InvalidClientError } from '../../errors/invalid-client/invalid-client.error';
import { Logger } from '../../loggers/logger';
import { Settings } from '../../settings/settings';
import { getClientJsonWebKey } from '../../utils/get-client-jsonwebkey/get-client-jsonwebkey';
import { ClientAuthenticationName } from '../client-authentication-name.type';

/**
 * Implementation of the Private Key JWT Client Authentication Method.
 */
@Injectable()
export class PrivateKeyJwtClientAuthentication extends JwtBearerClientAssertion {
  /**
   * Name of the Client Authentication Method.
   */
  public readonly name: ClientAuthenticationName = 'private_key_jwt';

  /**
   * JSON Web Signature Algorithms.
   */
  protected readonly algorithms: Exclude<DigitalSignatureAlgorithm, 'none'>[] = [
    'ES256',
    'ES384',
    'ES512',
    'EdDSA',
    'PS256',
    'PS384',
    'PS512',
    'RS256',
    'RS384',
    'RS512',
  ];

  /**
   * Instantiates a new Private Key JWT Client Authentication Method.
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
   * @param header JSON Web Signature Header of the Client Assertion.
   * @throws {InvalidClientError} Failed to obtain the Client's Client Assertion Sign JSON Web Key.
   * @returns Client Secret as a JSON Web Key.
   */
  protected async getClientAssertionClientSignJsonWebKey(
    client: Client,
    header: JsonWebSignatureHeaderParameters,
  ): Promise<JsonWebKey> {
    this.logger.debug(
      `[${this.constructor.name}] Called getClientAssertionClientSignJsonWebKey()`,
      'dad5e475-9ed8-4d9a-9371-ae2ce3cbe8aa',
      { client_id: client.id, header },
    );

    try {
      const jsonWebKey = await getClientJsonWebKey(client, (jsonWebKey) => {
        return (
          jsonWebKey.kid === header.kid && jsonWebKey.use === 'sig' && (jsonWebKey.key_ops?.includes('verify') ?? true)
        );
      });

      this.logger.debug(
        `[${this.constructor.name}] Completed getClientAssertionClientSignJsonWebKey()`,
        '0cc291b6-9f7b-46a3-8f08-d0e5ead7e4ac',
        { client_id: client.id, header, jwk: jsonWebKey },
      );

      return jsonWebKey;
    } catch (err: unknown) {
      const error = new InvalidClientError('Failed to authenticate the Client.', { cause: err });

      this.logger.error(
        `[${this.constructor.name}] Failed to obtain the Client's Client Assertion Sign JSON Web Key`,
        'cd722fbb-4708-427a-a588-c1f1f85feca0',
        { client_id: client.id, header },
        error,
      );

      throw error;
    }
  }
}
