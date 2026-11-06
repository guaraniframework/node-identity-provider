import cookieParser from 'cookie-parser';
import express, { Express } from 'express';
import { OutgoingHttpHeaders } from 'http';
import { DatabaseSync } from 'node:sqlite';
import request, { Agent } from 'supertest';

import { getContainer } from '@guarani/di';
import { JsonWebKeySet } from '@guarani/jose';

import { CONTAINER } from '../../../constants';
import { DataAccess } from '../../../data-access/data-access';
import { SQLiteDataAccess } from '../../../data-access/sqlite/sqlite.data-access';
import { InvalidClientError } from '../../../errors/invalid-client/invalid-client.error';
import { InvalidRequestError } from '../../../errors/invalid-request/invalid-request.error';
import { IdentityProviderFactory } from '../../../factory/identity-provider.factory';
import { ConsoleLogger } from '../../../loggers/console/console.logger';
import { LoggerLevel } from '../../../loggers/logger-level.enum';
import { Settings } from '../../../settings/settings';
import { addParametersToUrl } from '../../../utils/add-parameters-to-url/add-parameters-to-url';
import { HttpResponseStatus } from '../../response/http-response-status.enum';
import { ExpressIdentityProvider } from './express.identity-provider';

describe('Express Identity Provider', () => {
  let provider: ExpressIdentityProvider;
  const container = getContainer(CONTAINER);

  let agent: Agent;
  let app: Express;
  let database: DatabaseSync;
  let jsonWebKeySet: JsonWebKeySet;
  let dataAccess: SQLiteDataAccess;

  const settings = new Settings({
    issuer: 'https://provider.example.com',
    secretKey: '0xBHeVjZgynYc0SQLqn7L1PYcba97SajmnEludmUiyYiPH2I94bHq9CtsVXMmhuR',
    interactions: {
      accountSelectionUrl: 'https://provider.example.com/auth/account-selection',
      consentUrl: 'https://provider.example.com/auth/consent',
      errorUrl: 'https://provider.example.com/oidc/error',
      loginUrl: 'https://provider.example.com/auth/login',
      registrationUrl: 'https://provider.example.com/auth/registration',
    },
  });

  beforeEach(async () => {
    database = new DatabaseSync(':memory:');
    jsonWebKeySet = new JsonWebKeySet([]);

    provider = new IdentityProviderFactory()
      .addAuthorizationEndpoint()
      .addDiscoveryEndpoint()
      .addInteractionEndpoint()
      .addLogger(new ConsoleLogger(LoggerLevel.ERROR))
      .addRevocationEndpoint()
      .addSettings(settings)
      .addTokenEndpoint()
      .add(DatabaseSync, database)
      .add(JsonWebKeySet, jsonWebKeySet)
      .create(ExpressIdentityProvider);

    dataAccess = container.resolve(DataAccess) as SQLiteDataAccess;

    await dataAccess.up();
    await dataAccess.seed();

    app = express();

    app.use(cookieParser(settings.secretKey));
    app.use(provider.handle());

    agent = request.agent(app);
  });

  afterEach(() => {
    container.clear();
    jest.restoreAllMocks();
  });

  describe('Smoke Endpoints', () => {
    it('should have an Authorization Endpoint.', async () => {
      const error = new InvalidRequestError('Invalid parameter "response_type".');

      const response = await agent.get('/oidc/authorization');

      const location = addParametersToUrl(settings.interactions.errorUrl, error.toJSON());

      expect(response.status).toBe(HttpResponseStatus.SeeOther);
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>(
        expect.objectContaining<OutgoingHttpHeaders>({ location: location.href }),
      );
    });

    it('should have a Discovery Endpoint.', async () => {
      const response = await agent.get('/.well-known/openid-configuration');
      expect(response.status).toBe(HttpResponseStatus.OK);
    });

    it('should have an Interaction Endpoint.', async () => {
      const error = new InvalidRequestError('Invalid parameter "interaction_type".');

      const response = await agent.get('/oidc/interaction');

      expect(response.status).toBe(HttpResponseStatus.BadRequest);
      expect(response.body).toStrictEqual(error.toJSON());
    });

    it('should have a Revocation Endpoint.', async () => {
      const error = new InvalidClientError('No Client Authentication Method detected.');

      const response = await agent.post('/oidc/revocation').set('Content-Type', 'application/x-www-form-urlencoded');

      expect(response.status).toBe(HttpResponseStatus.Unauthorized);
      expect(response.body).toStrictEqual(error.toJSON());
    });

    it('should have a Token Endpoint.', async () => {
      const error = new InvalidRequestError('Invalid parameter "grant_type".');

      const response = await agent.post('/oidc/token').set('Content-Type', 'application/x-www-form-urlencoded');

      expect(response.status).toBe(HttpResponseStatus.BadRequest);
      expect(response.body).toStrictEqual(error.toJSON());
    });
  });
});
