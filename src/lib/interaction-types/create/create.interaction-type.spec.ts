import { URL } from 'url';

import { getContainer } from '@guarani/di';

import { CONTAINER } from '../../constants';
import { CreateContextInteractionContext } from '../../context/interaction/context/create/create.context-interaction-context';
import { CreateDecisionInteractionContext } from '../../context/interaction/decision/create/create.decision-interaction-context';
import { DataAccess } from '../../data-access/data-access';
import { Endpoint } from '../../endpoints/endpoint';
import { Client } from '../../entities/client';
import { Grant } from '../../entities/grant';
import { Session } from '../../entities/session';
import { User } from '../../entities/user';
import { IdentityProvider } from '../../http/providers/identity-provider';
import { Logger } from '../../loggers/logger';
import { AuthorizationRequest } from '../../requests/authorization/authorization-request';
import { CreateContextInteractionResponse } from '../../responses/interaction/context/create/create.context-interaction-response';
import { CreateDecisionInteractionResponse } from '../../responses/interaction/decision/create/create.decision-interaction-response';
import { Settings } from '../../settings/settings';
import { addParametersToUrl } from '../../utils/add-parameters-to-url/add-parameters-to-url';
import { InteractionTypeName } from '../interaction-type-name.type';
import { CreateInteractionType } from './create.interaction-type';

jest.mock('../../loggers/logger');

describe('Create Interaction Type', () => {
  let interactionType: CreateInteractionType;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      atomic: jest.fn(),
      createUser: jest.fn(),
      createLogin: jest.fn(),
      saveGrant: jest.fn(),
    }),
  );

  const settingsMock = jest.mocked<Settings>(
    Object.assign<Settings, Partial<Settings>>(Object.create(Settings.prototype), {
      issuer: new URL('https://provider.example.com'),
    }),
  );

  const providerMock = jest.mocked<IdentityProvider>(
    Object.assign<IdentityProvider, Partial<IdentityProvider>>(Reflect.construct(IdentityProvider, []), {
      endpoints: [{ name: 'authorization', path: '/oidc/authorization' } as Endpoint],
    }),
  );

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(Settings).toValue(settingsMock);
    container.bind(IdentityProvider).toValue(providerMock);
    container.bind(CreateInteractionType).toSelf().asSingleton();

    interactionType = container.resolve(CreateInteractionType);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('name', () => {
    it('should have "create" as its value.', () => {
      expect(interactionType.name).toBe<InteractionTypeName>('create');
    });
  });

  describe('handleContext()', () => {
    let grantParameters: AuthorizationRequest;

    beforeEach(() => {
      grantParameters = { display: 'page', prompt: 'create', ui_locales: 'en-US' } as AuthorizationRequest;
    });

    it('should return a non-skip Create Context Interaction Response.', async () => {
      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        parameters: grantParameters,
        interactions: [],
        expiresAt: new Date(Date.now() + 3600000),
      });

      const context = { grant } as CreateContextInteractionContext;

      const requestUrl = addParametersToUrl(
        new URL(providerMock.endpoints[0]!.path, settingsMock.issuer!.href),
        grantParameters,
      );

      await expect(interactionType.handleContext(context)).resolves.toStrictEqual<CreateContextInteractionResponse>({
        skip: false,
        request_url: requestUrl.href,
        context: { display: 'page', prompts: ['create'], ui_locales: ['en-US'] },
      });
    });

    it('should return a skip Create Context Interaction Response.', async () => {
      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        parameters: grantParameters,
        interactions: ['create'],
        expiresAt: new Date(Date.now() + 3600000),
      });

      const context = { grant } as CreateContextInteractionContext;

      const requestUrl = addParametersToUrl(
        new URL(providerMock.endpoints[0]!.path, settingsMock.issuer!.href),
        grantParameters,
      );

      await expect(interactionType.handleContext(context)).resolves.toStrictEqual<CreateContextInteractionResponse>({
        skip: true,
        request_url: requestUrl.href,
        context: { display: 'page', prompts: ['create'], ui_locales: ['en-US'] },
      });
    });

    it('should return a Create Context Interaction Response with an empty Context.', async () => {
      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        parameters: {} as AuthorizationRequest,
        interactions: ['create'],
        expiresAt: new Date(Date.now() + 3600000),
      });

      const context = { grant } as CreateContextInteractionContext;

      const requestUrl = addParametersToUrl(new URL(providerMock.endpoints[0]!.path, settingsMock.issuer!.href), {});

      await expect(interactionType.handleContext(context)).resolves.toStrictEqual<CreateContextInteractionResponse>({
        skip: true,
        request_url: requestUrl.href,
        context: {},
      });
    });
  });

  describe('handleDecision()', () => {
    const data: NodeJS.Dict<unknown> = {
      email: 'john.doe@email.com',
      password: 'S3cr&tP4sSw0rD',
    };

    const grantParameters = { display: 'page', prompt: 'create', ui_locales: 'en-US' } as AuthorizationRequest;

    const client: Client = Object.assign<Client, Partial<Client>>(new Client(), { id: 'client_id' });

    it('should return a first time Create Decision Interaction Response.', async () => {
      const session: Session = Object.assign<Session, Partial<Session>>(new Session(), {
        id: 'session_id',
      });

      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        parameters: grantParameters,
        interactions: [],
        expiresAt: new Date(Date.now() + 3600000),
        client,
        session,
      });

      const user: User = Object.assign<User, Partial<User>>(new User(), { id: 'user_id', ...data });

      const context = { grant, data } as CreateDecisionInteractionContext;

      dataAccessMock.atomic.mockImplementationOnce(async (operations) => await operations());
      dataAccessMock.createUser.mockResolvedValueOnce(user);

      const redirectTo = addParametersToUrl(
        new URL(providerMock.endpoints[0]!.path, settingsMock.issuer!.href),
        grantParameters,
      );

      await expect(interactionType.handleDecision(context)).resolves.toStrictEqual<CreateDecisionInteractionResponse>({
        redirect_to: redirectTo.href,
      });

      expect(dataAccessMock.createUser).toHaveBeenCalledExactlyOnceWith(data);
      expect(dataAccessMock.createLogin).toHaveBeenCalledExactlyOnceWith(user, client, session, [], null);
      expect(dataAccessMock.saveGrant).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining<Grant>({ ...grant, interactions: ['create'] }),
      );
    });

    it('should return a subsequent Create Decision Interaction Response.', async () => {
      const grant: Grant = Object.assign<Grant, Partial<Grant>>(new Grant(), {
        id: 'grant_id',
        parameters: grantParameters,
        interactions: ['create'],
        expiresAt: new Date(Date.now() + 3600000),
      });

      const context = { grant } as CreateDecisionInteractionContext;

      const redirectTo = addParametersToUrl(
        new URL(providerMock.endpoints[0]!.path, settingsMock.issuer!.href),
        grantParameters,
      );

      await expect(interactionType.handleDecision(context)).resolves.toStrictEqual<CreateDecisionInteractionResponse>({
        redirect_to: redirectTo.href,
      });

      expect(dataAccessMock.createUser).not.toHaveBeenCalled();
      expect(dataAccessMock.createLogin).not.toHaveBeenCalled();
      expect(dataAccessMock.saveGrant).not.toHaveBeenCalled();
    });
  });
});
