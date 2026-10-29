import { OutgoingHttpHeaders } from 'http';
import { URL } from 'url';

import { getContainer } from '@guarani/di';

import { CONTAINER } from '../../constants';
import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { Logger } from '../../loggers/logger';
import { DisplayName } from '../display-name.type';
import { PageDisplay } from './page.display';

jest.mock('../../loggers/logger');

describe('Page Display', () => {
  let display: PageDisplay;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(PageDisplay).toSelf().asSingleton();

    display = container.resolve(PageDisplay);
  });

  afterEach(() => {
    container.clear();
  });

  describe('name', () => {
    it('should have "page" as its value.', () => {
      expect(display.name).toBe<DisplayName>('page');
    });
  });

  describe('createHttpResponse()', () => {
    it('should create a Redirect Http Response with a populated URL Query.', () => {
      const response = display.createHttpResponse(new URL('https://example.com'), {
        var1: 'string',
        var2: 123,
        var3: true,
        var4: null,
        var5: undefined,
      });

      expect(response.status).toBe(HttpResponseStatus.SeeOther);
      expect(response.cookies).toBeEmptyObject();
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        location: 'https://example.com/?var1=string&var2=123&var3=true',
      });
    });

    it('should create a Redirect Http Response with a populated URL Query preserving the previous Parameters.', () => {
      const response = display.createHttpResponse(new URL('https://example.com/?tenant=tenant_id'), {
        var1: 'string',
        var2: 123,
        var3: true,
        var4: null,
        var5: undefined,
      });

      expect(response.status).toBe(HttpResponseStatus.SeeOther);
      expect(response.cookies).toBeEmptyObject();
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        location: 'https://example.com/?tenant=tenant_id&var1=string&var2=123&var3=true',
      });
    });
  });
});
