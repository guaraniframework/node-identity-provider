import { OutgoingHttpHeaders } from 'http';
import { URL } from 'url';

import { getContainer } from '@guarani/di';

import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { DisplayName } from '../display-name.type';
import { TouchDisplay } from './touch.display';

jest.mock('../../logger/logger');

describe('Touch Display', () => {
  let display: TouchDisplay;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(TouchDisplay).toSelf().asSingleton();

    display = container.resolve(TouchDisplay);
  });

  afterEach(() => {
    container.clear();
  });

  describe('name', () => {
    it('should have "touch" as its value.', () => {
      expect(display.name).toEqual<DisplayName>('touch');
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

      expect(response.status).toEqual(303);
      expect(response.cookies).toStrictEqual<NodeJS.Dict<unknown>>({});
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

      expect(response.status).toEqual(303);
      expect(response.cookies).toStrictEqual<NodeJS.Dict<unknown>>({});
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({
        location: 'https://example.com/?tenant=tenant_id&var1=string&var2=123&var3=true',
      });
    });
  });
});
