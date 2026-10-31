import { Injectable } from '@guarani/di';
import { DigitalSignatureAlgorithm, JsonWebKey } from '@guarani/jose';

import { JwtBearerClientAssertion } from '../../client-assertions/jwt-bearer/jwt-bearer.client-assertion';
import { DataAccess } from '../../data-access/data-access';
import { Client } from '../../entities/client';
import { Logger } from '../../loggers/logger';
import { Settings } from '../../settings/settings';
import { getClientSecretAsJsonWebKey } from '../../utils/get-client-secret-as-jsonwebkey/get-client-secret-as-jsonwebkey';
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
    return await getClientSecretAsJsonWebKey(client);
  }
}
