import { OutgoingHttpHeaders } from 'http';
import { URL } from 'url';

import { getContainer } from '@guarani/di';

import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { DisplayName } from '../display-name.type';
import { PopupDisplay } from './popup.display';

jest.mock('../../logger/logger');

const body = `
<!DOCTYPE html>
<html>
  <head></head>
  <body onload="openWindow('https://example.com/?var1=string&var2=123&var3=true');">
    <script type="text/javascript">
      function callback(redirectTo) {
        window.location.replace(redirectTo);
      }
      function openWindow(url) {
        const top = Math.floor((window.outerHeight - 640) / 2);
        const left = Math.floor((window.outerWidth - 360) / 2);
        window.open(url, '_blank', \`top=\${top},left=\${left},width=360,height=640\`);
      }
    </script>
  </body>
</html>
`.trim();

describe('Popup Display', () => {
  let display: PopupDisplay;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(PopupDisplay).toSelf().asSingleton();

    display = container.resolve(PopupDisplay);
  });

  afterEach(() => {
    container.clear();
  });

  describe('name', () => {
    it('should have "popup" as its value.', () => {
      expect(display.name).toEqual<DisplayName>('popup');
    });
  });

  describe('createHttpResponse()', () => {
    it('should create an Http Response with a populated Html Body.', () => {
      const response = display.createHttpResponse(new URL('https://example.com'), {
        var1: 'string',
        var2: 123,
        var3: true,
        var4: null,
        var5: undefined,
      });

      expect(response.status).toEqual(200);
      expect(response.cookies).toStrictEqual<NodeJS.Dict<unknown>>({});
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({ 'content-type': 'text/html; charset=UTF-8' });
      expect(response.body).toEqual(Buffer.from(body, 'utf8'));
    });
  });
});
