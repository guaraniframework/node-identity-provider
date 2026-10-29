/* istanbul ignore file */
import { DatabaseSync } from 'node:sqlite';

import { EllipticCurveJsonWebKey, JsonWebKeySet } from '@guarani/jose';

import { IdentityProviderFactory } from '../../src/lib/factory/identity-provider.factory';
import { NodeIdentityProvider } from '../../src/lib/http/providers/node/node.identity-provider';
import { ConsoleLogger } from '../../src/lib/loggers/console/console.logger';
import { LoggerLevel } from '../../src/lib/loggers/logger-level.enum';
import { Settings } from '../../src/lib/settings/settings';

export function createTestProvider(): NodeIdentityProvider {
  const jsonWebKeySet = new JsonWebKeySet([
    new EllipticCurveJsonWebKey({
      kty: 'EC',
      crv: 'P-256',
      x: '4c_cS6IT6jaVQeobt_6BDCTmzBaBOTmmiSCpjd5a6Og',
      y: 'mnrPnCFTDkGdEwilabaqM7DzwlAFgetZTmP9ycHPxF8',
      d: 'bwVX6Vx-TOfGKYOPAcu2xhaj3JUzs-McsC-suaHnFBo',
      alg: 'ES256',
      kid: '050c4e27-da77-4efe-a2d7-32dbd0fa0b62',
      use: 'sig',
    }),
  ]);

  const settings = new Settings({
    issuer: 'https://provider.example.com',
    secretKey: 'Z3Px2SPubQ9wfsx7qeEGh6rkm5Y4BJK1gsev6VwAV6e9uW6YzfKJxOlOxMQo9tYs',
    idTokenSignatureAlgorithms: ['ES256'],
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

  return new IdentityProviderFactory()
    .addAuthorizationEndpoint((options) => {
      options.useResponseModes(['fragment', 'query']).useResponseTypes(['code', 'id_token']);
    })
    .addInteractionEndpoint()
    .addLogger(Object.assign(new ConsoleLogger(LoggerLevel.ERROR)))
    .addSettings(settings)
    .addSubjectTypes(['pairwise', 'public'])
    .add(DatabaseSync, new DatabaseSync(':memory:'))
    .add(JsonWebKeySet, jsonWebKeySet)
    .create(NodeIdentityProvider);
}
