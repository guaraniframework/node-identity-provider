import { Buffer } from 'buffer';
import { stringify as stringifyQs } from 'querystring';
import { URL } from 'url';

import { getContainer } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { ConsentDecisionAcceptInteractionContext } from '../../../../context/interaction/decision/consent/consent-decision-accept.interaction-context';
import { ConsentDecisionDenyInteractionContext } from '../../../../context/interaction/decision/consent/consent-decision-deny.interaction-context';
import { DataAccess } from '../../../../data-access/data-access';
import { Client } from '../../../../entities/client';
import { Grant } from '../../../../entities/grant';
import { AccessDeniedError } from '../../../../errors/access-denied/access-denied.error';
import { InvalidRequestError } from '../../../../errors/invalid-request/invalid-request.error';
import { ClientAuthenticationHandler } from '../../../../handlers/client-authentication/client-authentication.handler';
import { ScopeHandler } from '../../../../handlers/scope/scope.handler';
import { HttpRequest } from '../../../../http/request/http-request';
import { InteractionType } from '../../../../interaction-types/interaction-type';
import { InteractionTypeName } from '../../../../interaction-types/interaction-type-name.type';
import { Logger } from '../../../../logger/logger';
import { CONTAINER } from '../../../../metadata/container.token';
import { AuthorizationRequest } from '../../../../requests/authorization/authorization-request';
import { ConsentDecision } from '../../../../requests/interaction/decision/consent/consent-decision';
import { ConsentDecisionInteractionRequest } from '../../../../requests/interaction/decision/consent/consent-decision.interaction-request';
import { ConsentDecisionAcceptInteractionRequest } from '../../../../requests/interaction/decision/consent/consent-decision-accept.interaction-request';
import { ConsentDecisionDenyInteractionRequest } from '../../../../requests/interaction/decision/consent/consent-decision-deny.interaction-request';
import { DecisionInteractionRequestValidator } from '../decision.interaction-request.validator';
import { ConsentDecisionInteractionRequestValidator } from './consent-decision.interaction-request.validator';

jest.mock('../../../../logger/logger');
jest.mock('../../../../handlers/client-authentication/client-authentication.handler');
jest.mock('../../../../handlers/scope/scope.handler');

const invalidConsentChallenges: any[] = [undefined, ''];
const invalidDecisions: any[] = [undefined, ''];
const invalidSubjectIds: any[] = [undefined, ''];
const invalidErrorCodes: any[] = [undefined, ''];
const invalidErrorDescriptions: any[] = [undefined, ''];

describe('Consent Decision Interaction Request Validator', () => {
  let validator: ConsentDecisionInteractionRequestValidator;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      findGrantByConsentChallenge: jest.fn(),
    }),
  );

  const clientAuthenticationHandlerMock = jest.mocked(ClientAuthenticationHandler.prototype);
  const scopeHandlerMock = jest.mocked(ScopeHandler.prototype);

  const interactionTypeMock = jest.mocked<InteractionType>(
    Object.assign<InteractionType, Partial<InteractionType>>(Reflect.construct(InteractionType, []), {
      name: 'consent',
    }),
  );

  let superValidateSpy: jest.SpyInstance<Promise<any>, [request: HttpRequest], any>;

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(ClientAuthenticationHandler).toValue(clientAuthenticationHandlerMock);
    container.bind(ScopeHandler).toValue(scopeHandlerMock);
    container.bind(InteractionType).toValue(interactionTypeMock);
    container.bind(ConsentDecisionInteractionRequestValidator).toSelf().asSingleton();

    validator = container.resolve(ConsentDecisionInteractionRequestValidator);

    superValidateSpy = jest.spyOn(DecisionInteractionRequestValidator.prototype, 'validate');
  });

  afterEach(() => {
    container.clear();

    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('name', () => {
    it('should have "consent" as its value.', () => {
      expect(validator.name).toEqual<InteractionTypeName>('consent');
    });
  });

  describe('validate()', () => {
    let parameters: ConsentDecisionInteractionRequest;

    const client: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), {
      id: 'client_id',
      subjectType: 'public',
    });

    const requestFactory = <T extends ConsentDecisionInteractionRequest = ConsentDecisionInteractionRequest>(
      data: Partial<T> = {},
    ): HttpRequest => {
      removeNullishValues<ConsentDecisionInteractionRequest>(Object.assign(parameters, data));

      return new HttpRequest({
        body: Buffer.from(stringifyQs(parameters), 'utf8'),
        cookies: {},
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        method: 'POST',
        url: new URL('https://idp.example.com/oidc/interaction'),
      });
    };

    beforeEach(() => {
      // @ts-expect-error Missing decision parameter
      parameters = { interaction_type: 'consent', consent_challenge: 'consent_challenge' };

      clientAuthenticationHandlerMock.authenticate.mockResolvedValueOnce(client);
    });

    it.each(invalidConsentChallenges)(
      'should throw when the provided parameter "consent_challenge" is invalid.',
      async (consentChallenge) => {
        const request = requestFactory({ consent_challenge: consentChallenge });

        const error = new InvalidRequestError('Invalid parameter "consent_challenge".');
        await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

        expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[ConsentDecisionInteractionRequestValidator] Invalid parameter "consent_challenge"',
          'e93cd171-debc-480c-a17b-92da2cfe263d',
          { parameters, client },
          error,
        );
      },
    );

    it('should throw when no Grant is found.', async () => {
      const request = requestFactory();

      dataAccessMock.findGrantByConsentChallenge.mockResolvedValueOnce(null);

      const error = new AccessDeniedError('Invalid Consent Challenge.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(AccessDeniedError, error.message);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ConsentDecisionInteractionRequestValidator] Invalid Consent Challenge',
        '4e7a0b47-797e-4e8f-a716-10923b9b70c0',
        { parameters, client },
        error,
      );
    });

    it('should throw when the Client requests a Grant that was not issued to itself.', async () => {
      const request = requestFactory();

      const anotherClient: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), {
        id: 'another_client_id',
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        client: anotherClient,
      });

      dataAccessMock.findGrantByConsentChallenge.mockResolvedValueOnce(grant);

      const error = new AccessDeniedError('Invalid Consent Challenge.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(AccessDeniedError, error.message);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ConsentDecisionInteractionRequestValidator] The Grant was not issued to this Client',
        'ea6a88c5-adb4-4f54-8f97-879c848b1b31',
        { parameters, client },
        error,
      );
    });

    it.each(invalidDecisions)('should throw when the provided parameter "decision" is invalid.', async (decision) => {
      const request = requestFactory({ decision });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        client,
      });

      dataAccessMock.findGrantByConsentChallenge.mockResolvedValueOnce(grant);

      const error = new InvalidRequestError('Invalid parameter "decision".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ConsentDecisionInteractionRequestValidator] Invalid parameter "decision"',
        '2958a9e8-2244-4121-92b2-e8f5e3d867d9',
        { parameters },
        error,
      );
    });

    it('should throw when the provided parameter "decision" is unsupported.', async () => {
      const request = requestFactory({ decision: 'unknown' as ConsentDecision });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        client,
      });

      dataAccessMock.findGrantByConsentChallenge.mockResolvedValueOnce(grant);

      const error = new InvalidRequestError('Unsupported decision "unknown".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ConsentDecisionInteractionRequestValidator] Unsupported decision "unknown"',
        'ce5998f9-46da-4e44-9c21-9cfb77c3502e',
        { parameters },
        error,
      );
    });

    // #region Decision Accept
    it.each(invalidSubjectIds)(
      'should throw when the provided parameter "granted_scope" is invalid.',
      async (grantedScope) => {
        const request = requestFactory<ConsentDecisionAcceptInteractionRequest>({
          decision: 'accept',
          granted_scope: grantedScope,
        });

        const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
          id: 'grant_id',
          client,
        });

        dataAccessMock.findGrantByConsentChallenge.mockResolvedValueOnce(grant);

        const error = new InvalidRequestError('Invalid parameter "granted_scope".');
        await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

        expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[ConsentDecisionInteractionRequestValidator] Invalid parameter "granted_scope"',
          '9e47d7de-1242-40e2-9f72-102e2ebdb507',
          { parameters, grant },
          error,
        );
      },
    );

    it('should throw when the User granted a Scope not previously requested by the Client.', async () => {
      const request = requestFactory<ConsentDecisionAcceptInteractionRequest>({
        decision: 'accept',
        granted_scope: 'openid foo bar baz',
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        client,
        parameters: { scope: 'openid foo bar' } as AuthorizationRequest,
      });

      dataAccessMock.findGrantByConsentChallenge.mockResolvedValueOnce(grant);

      const error = new AccessDeniedError('The scope "baz" was not requested by the Client.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(AccessDeniedError, error.message);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ConsentDecisionInteractionRequestValidator] The scope "baz" was not requested by the Client',
        '37aed28e-2f3b-4b24-8cb1-1438cc647cd5',
        { parameters, grant },
        error,
      );
    });

    it('should return a Consent Decision Accept Interaction Context with all Scopes requested by the Client.', async () => {
      const request = requestFactory<ConsentDecisionAcceptInteractionRequest>({
        decision: 'accept',
        granted_scope: 'openid foo bar',
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        client,
        parameters: { scope: 'openid foo bar' } as AuthorizationRequest,
      });

      dataAccessMock.findGrantByConsentChallenge.mockResolvedValueOnce(grant);

      await expect(validator.validate(request)).resolves.toMatchObject<ConsentDecisionAcceptInteractionContext>({
        parameters,
        interactionType: interactionTypeMock as InteractionType,
        client,
        grant,
        decision: 'accept',
        grantedScopes: ['openid', 'foo', 'bar'],
      });

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);
    });

    it('should return a Consent Decision Accept Interaction Context with a subset of the Scopes requested by the Client.', async () => {
      const request = requestFactory<ConsentDecisionAcceptInteractionRequest>({
        decision: 'accept',
        granted_scope: 'openid foo',
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        client,
        parameters: { scope: 'openid foo bar' } as AuthorizationRequest,
      });

      dataAccessMock.findGrantByConsentChallenge.mockResolvedValueOnce(grant);

      await expect(validator.validate(request)).resolves.toMatchObject<ConsentDecisionAcceptInteractionContext>({
        parameters,
        interactionType: interactionTypeMock as InteractionType,
        client,
        grant,
        decision: 'accept',
        grantedScopes: ['openid', 'foo'],
      });

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);
    });
    // #endregion

    // #region Decision Deny
    it.each(invalidErrorCodes)('should throw when the provided parameter "error" is invalid.', async (errorCode) => {
      const request = requestFactory<ConsentDecisionDenyInteractionRequest>({
        decision: 'deny',
        error: errorCode,
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        client,
      });

      dataAccessMock.findGrantByConsentChallenge.mockResolvedValueOnce(grant);

      const error = new InvalidRequestError('Invalid parameter "error".');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ConsentDecisionInteractionRequestValidator] Invalid parameter "error"',
        '735f8d04-b1f7-4425-86b3-02566a142fb8',
        { parameters },
        error,
      );
    });

    it.each(invalidErrorDescriptions)(
      'should throw when the provided parameter "error_description" is invalid.',
      async (errorDescription) => {
        const request = requestFactory<ConsentDecisionDenyInteractionRequest>({
          decision: 'deny',
          error: 'access_denied',
          error_description: errorDescription,
        });

        const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
          id: 'grant_id',
          client,
        });

        dataAccessMock.findGrantByConsentChallenge.mockResolvedValueOnce(grant);

        const error = new InvalidRequestError('Invalid parameter "error_description".');
        await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

        expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[ConsentDecisionInteractionRequestValidator] Invalid parameter "error_description"',
          'eca7594f-d588-4bff-9c92-37dd2aed6870',
          { parameters },
          error,
        );
      },
    );

    it('should return a Consent Decision Deny Interaction Context.', async () => {
      const request = requestFactory<ConsentDecisionDenyInteractionRequest>({
        decision: 'deny',
        error: 'access_denied',
        error_description: 'The User refused to grant the requested scope.',
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        client,
      });
      const error = new AccessDeniedError('The User refused to grant the requested scope.');

      dataAccessMock.findGrantByConsentChallenge.mockResolvedValueOnce(grant);

      await expect(validator.validate(request)).resolves.toMatchObject<ConsentDecisionDenyInteractionContext>({
        parameters,
        interactionType: interactionTypeMock as InteractionType,
        client,
        grant,
        decision: 'deny',
        error,
      });

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);
    });
    // #endregion
  });
});
