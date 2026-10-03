import { Buffer } from 'buffer';
import { URL } from 'url';

import { getContainer } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { ConsentContextInteractionContext } from '../../../../context/interaction/context/consent/consent-context.interaction-context';
import { DataAccess } from '../../../../data-access/data-access';
import { Client } from '../../../../entities/client';
import { Grant } from '../../../../entities/grant';
import { AccessDeniedError } from '../../../../errors/access-denied/access-denied.error';
import { InvalidRequestError } from '../../../../errors/invalid-request/invalid-request.error';
import { HttpRequest } from '../../../../http/request/http-request';
import { InteractionType } from '../../../../interaction-types/interaction-type';
import { InteractionTypeName } from '../../../../interaction-types/interaction-type-name.type';
import { Logger } from '../../../../logger/logger';
import { CONTAINER } from '../../../../metadata/container.token';
import { ConsentContextInteractionRequest } from '../../../../requests/interaction/context/consent/consent-context.interaction-request';
import { addParametersToUrl } from '../../../../utils/add-parameters-to-url/add-parameters-to-url';
import { ContextInteractionRequestValidator } from '../context.interaction-request.validator';
import { ConsentContextInteractionRequestValidator } from './consent-context.interaction-request.validator';

jest.mock('../../../../logger/logger');

const invalidConsentChallenges: any[] = [undefined, ''];

describe('Consent Context Interaction Request Validator', () => {
  let validator: ConsentContextInteractionRequestValidator;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      findClientById: jest.fn(),
      findGrantByConsentChallenge: jest.fn(),
    }),
  );

  const interactionTypeMock = jest.mocked<InteractionType>(
    Object.assign<InteractionType, Partial<InteractionType>>(Reflect.construct(InteractionType, []), {
      name: 'consent',
    }),
  );

  let superValidateSpy: jest.SpyInstance<Promise<any>, [request: HttpRequest], any>;

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(InteractionType).toValue(interactionTypeMock);
    container.bind(ConsentContextInteractionRequestValidator).toSelf().asSingleton();

    validator = container.resolve(ConsentContextInteractionRequestValidator);

    superValidateSpy = jest.spyOn(ContextInteractionRequestValidator.prototype, 'validate');
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
    let parameters: ConsentContextInteractionRequest;

    const client: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), { id: 'client_id' });

    const requestFactory = (data: Partial<ConsentContextInteractionRequest> = {}): HttpRequest => {
      removeNullishValues<ConsentContextInteractionRequest>(Object.assign(parameters, data));

      return new HttpRequest({
        body: Buffer.alloc(0),
        cookies: {},
        headers: {},
        method: 'GET',
        url: addParametersToUrl(new URL('https://idp.example.com/oidc/interaction'), parameters),
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
        await expect(validator.validate(request)).rejects.toThrowWithMessage(InvalidRequestError, error.message);

        expect(superValidateSpy).toHaveBeenCalledExactlyOnceWith(request);

        expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
          '[ConsentContextInteractionRequestValidator] Invalid parameter "consent_challenge"',
          'f23bd294-4050-4587-b082-a0602c60d831',
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
        '[ConsentContextInteractionRequestValidator] Invalid Consent Challenge',
        '0694bac5-ddf7-4045-9aed-b61086e3e18b',
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
        '[ConsentContextInteractionRequestValidator] The Grant was not issued to this Client',
        'f2a39eda-ffd9-4e7f-8e6a-81b590aae025',
        { parameters, client },
        error,
      );
    });

    it('should return a Consent Context Interaction Context.', async () => {
      const request = requestFactory();

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        client,
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
