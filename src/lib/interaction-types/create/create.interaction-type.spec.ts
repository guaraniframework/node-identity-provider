import { URL } from 'url';

import { getContainer } from '@guarani/di';

import { CreateContextInteractionContext } from '../../context/interaction/context/create/create-context.interaction-context';
import { CreateDecisionInteractionContext } from '../../context/interaction/decision/create/create-decision.interaction-context';
import { DataAccess } from '../../data-access/data-access';
import { Client } from '../../entities/client';
import { Grant } from '../../entities/grant';
import { Session } from '../../entities/session';
import { User } from '../../entities/user';
import { AccessDeniedError } from '../../errors/access-denied/access-denied.error';
import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { AuthorizationRequest } from '../../requests/authorization/authorization-request';
import { CreateContextInteractionResponse } from '../../responses/interaction/context/create/create-context.interaction-response';
import { CreateDecisionInteractionResponse } from '../../responses/interaction/decision/create/create-decision.interaction-response';
import { Settings } from '../../settings/settings';
import { SETTINGS } from '../../settings/settings.token';
import { addParametersToUrl } from '../../utils/add-parameters-to-url/add-parameters-to-url';
import { InteractionTypeName } from '../interaction-type-name.type';
import { CreateInteractionType } from './create.interaction-type';

jest.mock('../../logger/logger');

describe('Create Interaction Type', () => {
  let interactionType: CreateInteractionType;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      atomic: jest.fn(),
      createUser: jest.fn(),
      login: jest.fn(),
      removeGrant: jest.fn(),
      saveGrant: jest.fn(),
    }),
  );

  const settings: Partial<Settings> = { issuer: new URL('https://idp.example.com') };

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind<Partial<Settings>>(SETTINGS).toValue(settings);
    container.bind(CreateInteractionType).toSelf().asSingleton();

    interactionType = container.resolve(CreateInteractionType);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('name', () => {
    it('should have "create" as its value.', () => {
      expect(interactionType.name).toEqual<InteractionTypeName>('create');
    });
  });

  describe('handleContext()', () => {
    let grantParameters: AuthorizationRequest;

    beforeEach(() => {
      grantParameters = { display: 'page', prompt: 'create', ui_locales: 'en' } as AuthorizationRequest;
    });

    it('should throw when the Grant is expired.', async () => {
      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        expiresAt: new Date(Date.now() - 3600000),
      });

      const context = { grant } as CreateContextInteractionContext;

      const error = new AccessDeniedError('Expired Grant.');
      await expect(interactionType.handleContext(context)).rejects.toThrowWithMessage(AccessDeniedError, error.message);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CreateInteractionType] Expired Grant',
        '0f2c6985-07d7-416e-b8dc-5ea7f2c9f586',
        { grant },
        error,
      );

      expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);
    });

    it('should return a non-skip Create Context Interaction Response.', async () => {
      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        parameters: grantParameters,
        interactions: [],
        expiresAt: new Date(Date.now() + 3600000),
      });

      const context = { grant } as CreateContextInteractionContext;

      const requestUrl = addParametersToUrl(new URL('/oidc/authorization', settings.issuer!.href), grantParameters);

      await expect(interactionType.handleContext(context)).resolves.toStrictEqual<CreateContextInteractionResponse>({
        skip: false,
        request_url: requestUrl.href,
        context: { display: 'page', prompts: ['create'], ui_locales: ['en'] },
      });

      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
    });

    it('should return a skip Create Context Interaction Response.', async () => {
      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        parameters: grantParameters,
        interactions: ['create'],
        expiresAt: new Date(Date.now() + 3600000),
      });

      const context = { grant } as CreateContextInteractionContext;

      const requestUrl = addParametersToUrl(new URL('/oidc/authorization', settings.issuer!.href), grantParameters);

      await expect(interactionType.handleContext(context)).resolves.toStrictEqual<CreateContextInteractionResponse>({
        skip: true,
        request_url: requestUrl.href,
        context: { display: 'page', prompts: ['create'], ui_locales: ['en'] },
      });

      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
    });

    it('should return a Create Context Interaction Response with an empty Context.', async () => {
      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        parameters: {} as AuthorizationRequest,
        interactions: ['create'],
        expiresAt: new Date(Date.now() + 3600000),
      });

      const context = { grant } as CreateContextInteractionContext;

      const requestUrl = addParametersToUrl(new URL('/oidc/authorization', settings.issuer!.href), {});

      await expect(interactionType.handleContext(context)).resolves.toStrictEqual<CreateContextInteractionResponse>({
        skip: true,
        request_url: requestUrl.href,
        context: {},
      });

      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
    });
  });

  describe('handleDecision()', () => {
    const data: NodeJS.Dict<unknown> = {
      email: 'john.doe@email.com',
      password: 'S3cr&tP4sSw0rD',
    };

    const grantParameters = { display: 'page', prompt: 'create', ui_locales: 'en' } as AuthorizationRequest;

    const client: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), { id: 'client_id' });

    it('should throw when the Grant is expired.', async () => {
      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        expiresAt: new Date(Date.now() - 3600000),
      });

      const context = { grant } as CreateDecisionInteractionContext;

      const error = new AccessDeniedError('Expired Grant.');
      await expect(interactionType.handleDecision(context)).rejects.toThrowWithMessage(
        AccessDeniedError,
        error.message,
      );

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[CreateInteractionType] Expired Grant',
        '0f2c6985-07d7-416e-b8dc-5ea7f2c9f586',
        { grant },
        error,
      );

      expect(dataAccessMock.removeGrant).toHaveBeenCalledExactlyOnceWith(grant);
    });

    it('should return a first time Create Decision Interaction Response.', async () => {
      const session: Session = Object.assign<Session, Partial<Session>>(Reflect.construct(Session, []), {
        id: 'session_id',
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        parameters: grantParameters,
        interactions: [],
        expiresAt: new Date(Date.now() + 3600000),
        client,
        session,
      });

      const user: User = Object.assign<User, Partial<User>>(Reflect.construct(User, []), { id: 'user_id', ...data });

      const context = { grant, data } as CreateDecisionInteractionContext;

      dataAccessMock.atomic.mockImplementationOnce(async (operations) => await operations());
      dataAccessMock.createUser.mockResolvedValueOnce(user);

      const redirectTo = addParametersToUrl(new URL('/oidc/authorization', settings.issuer!.href), grantParameters);

      await expect(interactionType.handleDecision(context)).resolves.toStrictEqual<CreateDecisionInteractionResponse>({
        redirect_to: redirectTo.href,
      });

      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
      expect(dataAccessMock.createUser).toHaveBeenCalledExactlyOnceWith(data);
      expect(dataAccessMock.login).toHaveBeenCalledExactlyOnceWith(user, client, session, [], null);
      expect(dataAccessMock.saveGrant).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining<Grant>({ ...grant, interactions: ['create'] }),
      );
    });

    it('should return a subsequent Create Decision Interaction Response.', async () => {
      const grant: Grant = Object.assign<Grant, Partial<Grant>>(Reflect.construct(Grant, []), {
        id: 'grant_id',
        parameters: grantParameters,
        interactions: ['create'],
        expiresAt: new Date(Date.now() + 3600000),
      });

      const context = { grant } as CreateDecisionInteractionContext;

      const redirectTo = addParametersToUrl(new URL('/oidc/authorization', settings.issuer!.href), grantParameters);

      await expect(interactionType.handleDecision(context)).resolves.toStrictEqual<CreateDecisionInteractionResponse>({
        redirect_to: redirectTo.href,
      });

      expect(dataAccessMock.removeGrant).not.toHaveBeenCalled();
      expect(dataAccessMock.createUser).not.toHaveBeenCalled();
      expect(dataAccessMock.login).not.toHaveBeenCalled();
      expect(dataAccessMock.saveGrant).not.toHaveBeenCalled();
    });
  });
});
