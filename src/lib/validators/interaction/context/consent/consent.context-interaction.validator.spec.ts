import { Buffer } from 'buffer';

import { Constructor, getContainer } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { CONTAINER } from '../../../../constants';
import { ConsentContextInteractionContext } from '../../../../context/interaction/context/consent/consent.context-interaction-context';
import { DataAccess } from '../../../../data-access/data-access';
import { Client } from '../../../../entities/client';
import { Grant } from '../../../../entities/grant';
import { Login } from '../../../../entities/login';
import { Session } from '../../../../entities/session';
import { AccessDeniedError } from '../../../../errors/access-denied/access-denied.error';
import { AccountSelectionRequiredError } from '../../../../errors/account-selection-required/account-selection-required.error';
import { IdentityProviderError } from '../../../../errors/identity-provider.error';
import { InteractionRequiredError } from '../../../../errors/interaction-required/interaction-required.error';
import { InvalidRequestError } from '../../../../errors/invalid-request/invalid-request.error';
import { LoginRequiredError } from '../../../../errors/login-required/login-required.error';
import { HttpRequest } from '../../../../http/request/http-request';
import { HttpRequestMethod } from '../../../../http/request/http-request-method.enum';
import { InteractionType } from '../../../../interaction-types/interaction-type';
import { InteractionTypeName } from '../../../../interaction-types/interaction-type-name.type';
import { Logger } from '../../../../loggers/logger';
import { AuthorizationRequest } from '../../../../requests/authorization/authorization-request';
import { ConsentContextInteractionRequest } from '../../../../requests/interaction/context/consent/consent.context-interaction-request';
import { addParametersToUrl } from '../../../../utils/add-parameters-to-url/add-parameters-to-url';
import { ContextInteractionValidator } from '../context-interaction.validator';
import { ConsentContextInteractionValidator } from './consent.context-interaction.validator';

jest.mock('../../../../loggers/logger');

const invalidConsentChallenges: any[] = [undefined, ''];

const noLoginPromptsAndErrors: [string, IdentityProviderError][] = [
  ['create', new InteractionRequiredError('Account Creation required.')],
  ['create consent', new InteractionRequiredError('Account Creation required.')],
  ['select_account', new AccountSelectionRequiredError('Account Selection required.')],
  ['select_account consent', new AccountSelectionRequiredError('Account Selection required.')],
  ['login', new LoginRequiredError('Login required.')],
  ['login consent', new LoginRequiredError('Login required.')],
  ['', new LoginRequiredError('Login required.')],
  ['consent', new LoginRequiredError('Login required.')],
];

describe('Consent Context Interaction Validator', () => {
  let validator: ConsentContextInteractionValidator;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      findClientById: jest.fn(),
      findGrantByConsentChallenge: jest.fn(),
      removeGrant: jest.fn(),
    }),
  );

  const interactionTypeMock = jest.mocked<InteractionType>(
    Object.assign<InteractionType, Partial<InteractionType>>(Reflect.construct(InteractionType, []), {
      name: 'consent',
    }),
  );

  let superValidateSpy: jest.SpyInstance;

  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-08-12T00:00:00Z'));
  });

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(InteractionType).toValue(interactionTypeMock);
    container.bind(ConsentContextInteractionValidator).toSelf().asSingleton();

    validator = container.resolve(ConsentContextInteractionValidator);

    superValidateSpy = jest.spyOn(ContextInteractionValidator.prototype, 'validate');
  });

  afterEach(() => {
    container.clear();

    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  describe('name', () => {
    it('should have "consent" as its value.', () => {
      expect(validator.name).toBe<InteractionTypeName>('consent');
    });
  });

  describe('validate()', () => {
    let parameters: ConsentContextInteractionRequest;

    const client: Client = Object.assign<Client, Partial<Client>>(new Client(), { id: 'client_id' });

    const requestFactory = (data: Partial<ConsentContextInteractionRequest> = {}): HttpRequest => {
      removeNullishValues<ConsentContextInteractionRequest>(Object.assign(parameters, data));

      return new HttpRequest({
        body: Buffer.alloc(0),
        cookies: {},
        headers: {},
        method: HttpRequestMethod.GET,
        url: addParametersToUrl('https://provider.example.com/oidc/interaction', parameters),
      });
    };

    beforeEach(() => {
      parameters = { interaction_type: 'consent', consent_challenge: 'consent_challenge', client_id: 'client_id' };

      dataAccessMock.findClientById.mockResolvedValueOnce(client);
    });

    it.each(invalidConsentChallenges)(
      'should throw when the provided parameter "consent_challenge" is invalid.',
      async (consentChallenge) => {
        const request = requestFactory({ consent_challenge: consentChallenge });

        const error = new InvalidRequestError('Invalid parameter "consent_challenge".');
        await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.description);

        expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[ConsentContextInteractionValidator] Invalid parameter "consent_challenge"',
          'f23bd294-4050-4587-b082-a0602c60d831',
          { parameters, client_id: client.id },
          error,
        );
      },
    );

    it('should throw when no Grant is found.', async () => {
      const request = requestFactory();

      dataAccessMock.findGrantByConsentChallenge.mockResolvedValueOnce(null);

      const error = new AccessDeniedError('Invalid Consent Challenge.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(AccessDeniedError, error.description);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ConsentContextInteractionValidator] Invalid Consent Challenge',
        '0694bac5-ddf7-4045-9aed-b61086e3e18b',
        { parameters, client_id: client.id },
        error,
      );
    });

    it('should throw when the Client requests a Grant that was not issued to itself.', async () => {
      const request = requestFactory();

      const anotherClient: Client = Object.assign<Client, Partial<Client>>(new Client(), {
        id: 'another_client_id',
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        client: anotherClient,
      });

      dataAccessMock.findGrantByConsentChallenge.mockResolvedValueOnce(grant);

      const error = new AccessDeniedError('Invalid Consent Challenge.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(AccessDeniedError, error.description);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ConsentContextInteractionValidator] The Grant was not issued to this Client',
        'f2a39eda-ffd9-4e7f-8e6a-81b590aae025',
        { parameters, client_id: client.id },
        error,
      );
    });

    it('should throw when the Grant is expired.', async () => {
      const request = requestFactory();

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        expiresAt: new Date(Date.now() - 300000),
        client,
      });

      dataAccessMock.findGrantByConsentChallenge.mockResolvedValueOnce(grant);

      const error = new AccessDeniedError('Invalid Consent Challenge.');
      await expect(validator.validate(request)).rejects.toThrowWithMessage(AccessDeniedError, error.description);

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

      expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ConsentContextInteractionValidator] Expired Grant',
        'a81f618b-ba00-4f3f-ae41-6b4123b7f1b4',
        { parameters, client_id: client.id },
        error,
      );
    });

    it.each(noLoginPromptsAndErrors)(
      'should throw when the Session does not have an Active Login.',
      async (prompt, error) => {
        const request = requestFactory();

        const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
          id: 'session_id',
          activeLogin: null,
        });

        const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
          id: 'grant_id',
          parameters: { prompt } as AuthorizationRequest,
          expiresAt: new Date(Date.now() + 300000),
          client,
          session,
        });

        dataAccessMock.findGrantByConsentChallenge.mockResolvedValueOnce(grant);

        await expect(validator.validate(request)).rejects.toThrowWithMessage(
          error.constructor as Constructor<IdentityProviderError>,
          error.description,
        );

        expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

        expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[ConsentContextInteractionValidator] No Active Login found',
          '560cfa29-5ac8-4bc2-8b1d-51c8496432bd',
          { parameters, client_id: client.id },
          error,
        );
      },
    );

    it('should return a Consent Context Interaction Context.', async () => {
      const request = requestFactory();

      const login: Login = Object.assign<Login, Partial<Login>>(new Login(), { id: 'login_id' });

      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
        activeLogin: login,
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        parameters: {} as AuthorizationRequest,
        expiresAt: new Date(Date.now() + 300000),
        client,
        session,
      });

      dataAccessMock.findGrantByConsentChallenge.mockResolvedValueOnce(grant);

      await expect(validator.validate(request)).resolves.toMatchObject<ConsentContextInteractionContext>({
        parameters,
        interactionType: interactionTypeMock,
        grant,
        client,
      });

      expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);
    });
  });
});
