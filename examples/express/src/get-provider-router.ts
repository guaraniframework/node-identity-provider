import dotenv from 'dotenv';
import { Router } from 'express';
import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';

import { JsonWebKeySet, jwks } from '@guarani/jose';
import { jsonParse } from '@guarani/primitives';

import { ClientAuthenticationName } from '../../../src/lib/client-authentication/client-authentication-name.type';
import { IdentityProviderFactory } from '../../../src/lib/factory/identity-provider.factory';
import { ExpressIdentityProvider } from '../../../src/lib/http/providers/express/express.identity-provider';
import { ConsoleLogger } from '../../../src/lib/loggers/console/console.logger';
import { LoggerLevel } from '../../../src/lib/loggers/logger-level.enum';
import { Settings } from '../../../src/lib/settings/settings';
import { CustomDataAccess } from './app/custom.data-access';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

export async function getProviderRouter(): Promise<Router> {
  const clientAuthenticationMethods: ClientAuthenticationName[] = [
    'client_secret_basic',
    'client_secret_jwt',
    'client_secret_post',
    'none',
    'private_key_jwt',
  ];

  const jsonWebKeySet = await jwks.create(jsonParse(fs.readFileSync(process.env['JWKS_PATH']!, 'utf8')));

  const settings = new Settings({
    issuer: 'https://localhost:4000',
    secretKey: process.env['SECRET_KEY']!,
    idTokenSignatureAlgorithms: ['HS256', 'RS256'],
    idTokenKeyWrapAlgorithms: ['RSA-OAEP'],
    idTokenContentEncryptionAlgorithms: ['A128GCM'],
    clientAuthenticationSigningAlgorithms: ['HS256', 'RS256'],
    clientAuthenticationEncryptionKeyWrapAlgorithms: ['RSA-OAEP'],
    clientAuthenticationEncryptionContentEncryptionAlgorithms: ['A128GCM'],
    jwtBearerGrantSigningAlgorithms: ['HS256', 'RS256'],
    jwtBearerGrantEncryptionKeyWrapAlgorithms: ['RSA-OAEP'],
    jwtBearerGrantEncryptionContentEncryptionAlgorithms: ['A128GCM'],
    uiLocales: ['en-US'],
    acrValues: ['urn:guarani:acr:1fa', 'urn:guarani:acr:2fa'],
    interactions: {
      accountSelectionUrl: 'https://localhost:4000/auth/account-selection',
      consentUrl: 'https://localhost:4000/auth/consent',
      errorUrl: 'https://localhost:4000/oidc/error',
      loginUrl: 'https://localhost:4000/auth/login',
      registrationUrl: 'https://localhost:4000/auth/registration',
    },
    enableAuthorizationResponseIssuerIdentifier: true,
    enableRefreshTokenRotation: true,
    sessionCookie: '_guarani_session',
  });

  return new IdentityProviderFactory()
    .addAuthorizationEndpoint((options) => {
      options
        .useDisplays(['page', 'popup', 'touch', 'wap'])
        .usePKCEs(['S256', 'plain'])
        .useResponseModes(['form_post', 'fragment', 'query'])
        .useResponseTypes([
          'code',
          'code id_token',
          'code id_token token',
          'code token',
          'id_token',
          'id_token token',
          'none',
          'token',
        ])
        .build();
    })
    .addDataAccess(CustomDataAccess)
    .addDiscoveryEndpoint()
    .addInteractionEndpoint((options) => {
      options.useClientAuthenticationMethods(clientAuthenticationMethods).build();
    })
    .addLogger(new ConsoleLogger(LoggerLevel.DEBUG))
    .addRevocationEndpoint()
    .addSettings(settings)
    .addSubjectTypes(['pairwise', 'public'])
    .addTokenEndpoint((options) => {
      options
        .useClientAuthenticationMethods(clientAuthenticationMethods)
        .useGrantTypes([
          'authorization_code',
          'client_credentials',
          'password',
          'refresh_token',
          'urn:ietf:params:oauth:grant-type:jwt-bearer',
        ])
        .build();
    })
    .add(DatabaseSync, new DatabaseSync(process.env['SQLITE_PATH']!))
    .add(JsonWebKeySet, jsonWebKeySet)
    .create(ExpressIdentityProvider)
    .handle();
}
