import { OutgoingHttpHeaders } from 'http';
import { URL } from 'url';

import { getContainer } from '@guarani/di';

import { AuthorizationContext } from '../../context/authorization/authorization-context';
import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { ResponseModeName } from '../response-mode-name.type';
import { FragmentResponseMode } from './fragment.response-mode';

jest.mock('../../logger/logger');

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
      expect(responseMode.name).toEqual<ResponseModeName>('fragment');
    });
  });

  describe('createHttpResponse()', () => {
    it('should create a Redirect Http Response with a populated URL Fragment.', async () => {
      const context = { redirectUri: new URL('https://example.com') } as AuthorizationContext;

      const response = await responseMode.createHttpResponse(context, {
        var1: 'string',
        var2: 123,
        var3: true,
        var4: null,
        var5: undefined,
      });

      expect(response.status).toEqual(303);
      expect(response.cookies).toStrictEqual<NodeJS.Dict<unknown>>({});
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        location: 'https://example.com/#var1=string&var2=123&var3=true',
      });
    });

    it('should create a Redirect Http Response with a populated URL Fragment while preserving the previous Parameters.', async () => {
      const context = { redirectUri: new URL('https://example.com/#tenant=tenant_id') } as AuthorizationContext;

      const response = await responseMode.createHttpResponse(context, {
        var1: 'string',
        var2: 123,
        var3: true,
        var4: null,
        var5: undefined,
      });

      expect(response.status).toEqual(303);
      expect(response.cookies).toStrictEqual<NodeJS.Dict<unknown>>({});
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        location: 'https://example.com/#tenant=tenant_id&var1=string&var2=123&var3=true',
      });
    });
  });
});
