/* istanbul ignore file */
import { DatabaseSync } from 'node:sqlite';

import { getContainer } from '@guarani/di';
import { JsonWebKeySet, jwks } from '@guarani/jose';

import { CONTAINER } from '../../src/lib/constants';
import { DataAccess } from '../../src/lib/data-access/data-access';
import { SQLiteDataAccess } from '../../src/lib/data-access/sqlite/sqlite.data-access';
import { IdentityProviderFactory } from '../../src/lib/factory/identity-provider.factory';
import { NodeIdentityProvider } from '../../src/lib/http/providers/node/node.identity-provider';
import { ConsoleLogger } from '../../src/lib/loggers/console/console.logger';
import { LoggerLevel } from '../../src/lib/loggers/logger-level.enum';
import { Settings } from '../../src/lib/settings/settings';

export async function createTestProvider(): Promise<NodeIdentityProvider> {
  const container = getContainer(CONTAINER);

  const jsonWebKeySet = await jwks.create({
    keys: [
      {
        kty: 'RSA',
        n:
          'xjpFydzTbByzL5jhEa2yQO63dpS9d9SKaN107AR69skKiTR4uK1c4SzDt4YcurDB' +
          'yhgKNzeBo6Vq3IRrkrltp97LKWfeZdM-leGt8-UTZEWqrNf3UGOEj8kI6lbjiG-S' +
          'n_yNHcVA9qBV22norZkgXctHLeFbY6TmpD-I8_UiplZUHoc9KlYc7crCQRa-O7tK' +
          'FDULNTMjjifc0dmuYP7ZcYAZXmRmoOpQuDr8s7OZY7TAqN0btMfA7RpUCWLT6TMR' +
          'QPX8GcyTxfbkOrSTFueKMHVNdXDtl068XXJ9mkjORiEmwlzqSBoxdeLWcNf_u20S' +
          '5JG5iK0nsm1uZYu-02XN-w',
        e: 'AQAB',
        d:
          'cc2YrWia9LGRad0SMe0PrlmeeHSyRe5-u--QJcP4uF_5LYYzXIsjDJ9_iYh0S_YY' +
          'e6bLjqHOSp44OHvJqoXMX5j3-ECKnNjnUHMtRB2awXGBqBOhB8TqoQXgmXDi1jx_' +
          '6Fu8xH-vaSfpwrsN-0QzIcYHil6b8hwE0f0r6istBmL7iayJbnONp7na9ow2fUQl' +
          'nr41vsHZa4knTZ2E2kq5ntgaXlF6AIdc4DD_BZpf2alEbhQMX9T168ZsSyAs7wKS' +
          'd3ivhHRQayXEapUfZ_ykvnF4-DoVI1iRoowgZ-dlnv4Ff3YrKQ3Zv3uHJcF1BtWQ' +
          'VipOIHx4GyIc4bmTSA5PEQ',
        p:
          '-ZFuDg38cG-e5L6h1Jbn8ngifWgHx8m1gybkY7yEpU1V02fvQAMI1XG-1WpZm2xj' +
          'j218wNCj0BCEdmdBqZMk5RlzLagtfzQ3rPO-ucYPZ_SDmy8Udzr-sZLCqMFyLtxk' +
          'gMfGo4QZ6UJWYpTCCmZ92nS_pa4ePrQdlpnS4DLv_SM',
        q:
          'y1YdZtsbYfCOdsYBZrDpcvubwMN2fKRAzETYW5sqYv8XkxHG1J1zHH-zWJBQfZhT' +
          'biHPgHvoaFykEm9xhuA77RFGRXxFUrGBtfqIx_OG-kRWudmH83EyMzMoKQaW98RX' +
          'WqRO1JDlcs4_vzf_KN63zQKv5i4UdiiObQkZCYIOVUk',
        dp:
          'vqtDX-2DjgtZY_3Y-eiJMRBjmVgfiZ4r1RWjrCddWEVrauafPVKULy6F09s6tqnq' +
          'rqvBgjZk0ROtgCCHZB0NNRNqkdlJWUP1vWdDsf8FyjBfU_J2OlmSOOydV_zjVbX_' +
          '-vumYUsN2M5b3Vk1nmiLgplryhLq_JDzghnnqG6CN-0',
        dq:
          'tKczxBhSwbcpu5i70fLH1iJ5BNAkSyTbdSCNYQYAqKee2Elo76lbhixmuP6upIdb' +
          'SHO9mZd8qov0MXTV1lEOrNc2KbH5HTkb1wRZ1dwlReDFdKUxxjYBtb9zpM93_XVx' +
          'btSgPPbnBBL-S_OCPVtyzS_f-49hGoF52KHGns3v0hE',
        qi:
          'C4q9uIi-1fYhE0NTWVNzdhSi7fA3uznTWaW1X5LWBF4gBOcWvMMTfOZEaPjtY2WP' +
          'XaTWU4bdVN0GgktVLUDPLrSj533W1cOQZb_mm_7BFNrleelruT87bZhWPYQ979kl' +
          '6590ySgbH81pEM8FQW1JBATz0MYtUNZAt8N360vayE4',
        alg: 'RS256',
        kid: '03bf969a-e23b-42f7-8955-199e52faa09f',
        use: 'sig',
      },
    ],
  });

  const settings = new Settings({
    issuer: 'https://provider.example.com',
    secretKey: 'Z3Px2SPubQ9wfsx7qeEGh6rkm5Y4BJK1gsev6VwAV6e9uW6YzfKJxOlOxMQo9tYs',
    idTokenSignatureAlgorithms: ['RS256'],
    idTokenKeyWrapAlgorithms: ['RSA-OAEP'],
    idTokenContentEncryptionAlgorithms: ['A128GCM'],
    uiLocales: ['en-US'],
    acrValues: ['urn:guarani:acr:1fa', 'urn:guarani:acr:2fa'],
    interactions: {
      accountSelectionUrl: 'https://provider.example.com/auth/account-selection',
      consentUrl: 'https://provider.example.com/auth/consent',
      errorUrl: 'https://provider.example.com/oidc/error',
      loginUrl: 'https://provider.example.com/auth/login',
      registrationUrl: 'https://provider.example.com/auth/registration',
    },
  });

  const provider = new IdentityProviderFactory()
    .addAuthorizationEndpoint((options) => {
      options.useResponseModes(['fragment', 'query']).useResponseTypes(['code', 'id_token', 'id_token token']).build();
    })
    .addDiscoveryEndpoint()
    .addInteractionEndpoint()
    .addLogger(new ConsoleLogger(LoggerLevel.ERROR))
    .addRevocationEndpoint()
    .addSettings(settings)
    .addSubjectTypes(['pairwise', 'public'])
    .addTokenEndpoint()
    .add(DatabaseSync, new DatabaseSync(':memory:'))
    .add(JsonWebKeySet, jsonWebKeySet)
    .create(NodeIdentityProvider);

  const dataAccess = container.resolve(DataAccess) as SQLiteDataAccess;

  await dataAccess.up();
  await dataAccess.seed();

  return provider;
}
