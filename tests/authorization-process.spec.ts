import fs from 'fs';
import { DatabaseSync } from 'node:sqlite';
import path from 'path';

import { getContainer } from '@guarani/di';
import { EllipticCurveJsonWebKey, JsonWebKeySet } from '@guarani/jose';

import { ClientAuthentication } from '../src/lib/client-authentication/client-authentication';
import { clientAuthenticationRegistry } from '../src/lib/client-authentication/client-authentication.registry';
import { DataAccess } from '../src/lib/data-access/data-access';
import { DefaultDataAccess } from '../src/lib/data-access/default/default.data-access';
import { Display } from '../src/lib/displays/display';
import { displayRegistry } from '../src/lib/displays/display.registry';
import { AuthorizationEndpoint } from '../src/lib/endpoints/authorization/authorization.endpoint';
import { InteractionEndpoint } from '../src/lib/endpoints/interaction/interaction.endpoint';
import { ClientAuthenticationHandler } from '../src/lib/handlers/client-authentication/client-authentication.handler';
import { IdTokenHandler } from '../src/lib/handlers/id-token/id-token.handler';
import { ScopeHandler } from '../src/lib/handlers/scope/scope.handler';
import { InteractionType } from '../src/lib/interaction-types/interaction-type';
import { interactionTypeRegistry } from '../src/lib/interaction-types/interaction-type.registry';
import { ConsoleLogger } from '../src/lib/logger/console.logger';
import { Logger } from '../src/lib/logger/logger';
import { CONTAINER } from '../src/lib/metadata/container.token';
import { Pkce } from '../src/lib/pkce/pkce';
import { pkceRegistry } from '../src/lib/pkce/pkce.registry';
import { ResponseMode } from '../src/lib/response-modes/response-mode';
import { responseModeRegistry } from '../src/lib/response-modes/response-mode.registry';
import { ResponseType } from '../src/lib/response-types/response-type';
import { responseTypeRegistry } from '../src/lib/response-types/response-type.registry';
import { Settings } from '../src/lib/settings/settings';
import { SETTINGS } from '../src/lib/settings/settings.token';
import { SubjectType } from '../src/lib/subject-types/subject-type';
import { subjectTypeRegistry } from '../src/lib/subject-types/subject-type.registry';
import { AuthorizationRequestValidator } from '../src/lib/validators/authorization/authorization-request.validator';
import { authorizationRequestValidatorRegistry } from '../src/lib/validators/authorization/authorization-request-validator.registry';
import { ContextInteractionRequestValidator } from '../src/lib/validators/interaction/context/context.interaction-request.validator';
import { contextInteractionRequestValidatorRegistry } from '../src/lib/validators/interaction/context/context-interaction-request-validator.registry';
import { DecisionInteractionRequestValidator } from '../src/lib/validators/interaction/decision/decision.interaction-request.validator';
import { decisionInteractionRequestValidatorRegistry } from '../src/lib/validators/interaction/decision/decision-interaction-request-validator.registry';

describe('Authorization Process', () => {
  let authorizationEndpoint: AuthorizationEndpoint;
  let interactionEndpoint: InteractionEndpoint;
  let dataAccess: DefaultDataAccess;

  const dbPath = path.join(__dirname, 'database.db');

  const container = getContainer(CONTAINER);

  const settings: Partial<Settings> = {};

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

  beforeEach(() => {
    container.bind(Logger).toClass(ConsoleLogger).asSingleton();
    container.bind(IdTokenHandler).toSelf().asSingleton();
    container.bind(DataAccess).toClass(DefaultDataAccess).asSingleton();
    container.bind<Partial<Settings>>(SETTINGS).toValue(settings);

    Object.values(authorizationRequestValidatorRegistry).forEach((validator) => {
      container.bind(AuthorizationRequestValidator).toClass(validator).asSingleton();
    });

    Object.values(contextInteractionRequestValidatorRegistry).forEach((validator) => {
      container.bind(ContextInteractionRequestValidator).toClass(validator).asSingleton();
    });

    Object.values(decisionInteractionRequestValidatorRegistry).forEach((validator) => {
      container.bind(DecisionInteractionRequestValidator).toClass(validator).asSingleton();
    });

    container.bind(DatabaseSync).toValue(new DatabaseSync(dbPath));
    container.bind(JsonWebKeySet).toValue(jsonWebKeySet);

    Object.values(subjectTypeRegistry).forEach((subjectType) => {
      container.bind(SubjectType).toClass(subjectType).asSingleton();
    });

    container.bind(ScopeHandler).toSelf().asSingleton();

    container.bind(AuthorizationEndpoint).toSelf().asSingleton();
    container.bind(InteractionEndpoint).toSelf().asSingleton();

    Object.values(responseTypeRegistry).forEach((responseType) => {
      container.bind(ResponseType).toClass(responseType).asSingleton();
    });

    Object.values(responseModeRegistry).forEach((responseMode) => {
      container.bind(ResponseMode).toClass(responseMode).asSingleton();
    });

    Object.values(displayRegistry).forEach((display) => {
      container.bind(Display).toClass(display).asSingleton();
    });

    Object.values(pkceRegistry).forEach((pkce) => {
      container.bind(Pkce).toClass(pkce).asSingleton();
    });

    Object.values(interactionTypeRegistry).forEach((interactionType) => {
      container.bind(InteractionType).toClass(interactionType).asSingleton();
    });

    container.bind(ClientAuthenticationHandler).toSelf().asSingleton();

    Object.values(clientAuthenticationRegistry).forEach((clientAuthentication) => {
      container.bind(ClientAuthentication).toClass(clientAuthentication).asSingleton();
    });

    authorizationEndpoint = container.resolve(AuthorizationEndpoint);
    interactionEndpoint = container.resolve(InteractionEndpoint);
    dataAccess = container.resolve(DataAccess) as DefaultDataAccess;

    dataAccess.setup();
  });

  afterEach(() => {
    dataAccess.teardown();
    container.clear();

    fs.rmSync(dbPath);
  });

  it('should work', () => {
    expect(authorizationEndpoint.name).toEqual('authorization');
  });
});
