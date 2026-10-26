import { OutgoingHttpHeaders } from 'http';
import { URL } from 'url';

import { getContainer } from '@guarani/di';

import { CONTAINER } from '../../constants';
import { AuthorizationContext } from '../../context/authorization/authorization-context';
import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { Logger } from '../../loggers/logger';
import { AuthorizationResponse } from '../../responses/authorization/authorization-response';
import { ResponseModeName } from '../response-mode-name.type';
import { FragmentResponseMode } from './fragment.response-mode';

jest.mock('../../loggers/logger');

describe('Fragment Response Mode', () => {
  let responseMode: FragmentResponseMode;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(FragmentResponseMode).toSelf().asSingleton();

    responseMode = container.resolve(FragmentResponseMode);
  });

  afterEach(() => {
    container.clear();
  });

  describe('name', () => {
    it('should have "fragment" as its value.', () => {
      expect(responseMode.name).toBe<ResponseModeName>('fragment');
    });
  });

  describe('createHttpResponse()', () => {
    let parameters: AuthorizationResponse;

    beforeEach(() => {
      parameters = { state: 'client_state', var1: 'string', var2: 123, var3: true, var4: null, var5: undefined };
    });

    it('should create a Redirect Http Response with a populated URL Fragment.', async () => {
      const context = {
        redirectUri: new URL('https://client.example.com/oidc/callback'),
      } as AuthorizationContext;

      const response = await responseMode.createHttpResponse(context, parameters);

      expect(response.status).toBe(HttpResponseStatus.SeeOther);
      expect(response.cookies).toBeEmptyObject();
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        location: 'https://client.example.com/oidc/callback#state=client_state&var1=string&var2=123&var3=true',
      });
    });

    it('should create a Redirect Http Response with a populated URL Fragment while preserving the previous Parameters.', async () => {
      const context = {
        redirectUri: new URL('https://client.example.com/oidc/callback#tenant=tenant_id'),
      } as AuthorizationContext;

      const response = await responseMode.createHttpResponse(context, parameters);

      expect(response.status).toBe(HttpResponseStatus.SeeOther);
      expect(response.cookies).toBeEmptyObject();
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        location:
          'https://client.example.com/oidc/callback#tenant=tenant_id&state=client_state&var1=string&var2=123&var3=true',
      });
    });
  });
});
