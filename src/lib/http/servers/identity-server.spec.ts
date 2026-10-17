import { getContainer, Injectable } from '@guarani/di';

import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/tokens';
import { IdentityProvider } from '../identity-provider';
import { HttpRequestMethod } from '../request/http-request-method.enum';
import { HttpRouter } from '../router/http-router';
import { IdentityServer } from './identity-server';

jest.mock('../../logger/logger');
jest.mock('../identity-provider');
jest.mock('../router/http-router');

@Injectable()
class CustomIdentityServer extends IdentityServer {
  public constructor(logger: Logger, provider: IdentityProvider, router: HttpRouter) {
    super(logger, provider, router);
  }
}

describe('Identity Server', () => {
  let server: CustomIdentityServer;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);
  const providerMock = jest.mocked(IdentityProvider.prototype);
  const routerMock = jest.mocked(HttpRouter.prototype);

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(IdentityProvider).toValue(providerMock);
    container.bind(HttpRouter).toValue(routerMock);
    container.bind(CustomIdentityServer).toSelf().asSingleton();

    server = container.resolve(CustomIdentityServer);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('bootstrap()', () => {
    it('should map the Endpoints of the Identity Provider into the Http Router.', () => {
      expect(() => server.bootstrap()).not.toThrow();

      expect(routerMock.addEndpoint).toHaveBeenNthCalledWith(1, 'error', {
        path: '/oidc/error',
        routes: [
          { method: HttpRequestMethod.GET, handler: providerMock.error },
          { method: HttpRequestMethod.POST, handler: providerMock.error },
        ],
      });
    });
  });
});
