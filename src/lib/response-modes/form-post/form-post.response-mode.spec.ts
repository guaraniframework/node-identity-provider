import { Buffer } from 'buffer';
import { OutgoingHttpHeaders } from 'http';
import { URL } from 'url';

import { getContainer } from '@guarani/di';

import { AuthorizationContext } from '../../context/authorization/authorization-context';
import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { ResponseModeName } from '../response-mode-name.type';
import { FormPostResponseMode } from './form-post.response-mode';

jest.mock('../../logger/logger');

const body = `
<!DOCTYPE html>
<html>
<head>
  <title>Authorizing...</title>
</head>
<body onload="document.forms[0].submit();">
  <form method="POST" action="https:&#x2F;&#x2F;example.com&#x2F;">
    <input type="hidden" name="var1" value="string" />
    <input type="hidden" name="var2" value="123" />
    <input type="hidden" name="var3" value="true" />
    <noscript>
      <p>Your browser does not support javascript or it is disabled.</p>
      <button autofocus type="submit">Continue</button>
    </noscript>
  </form>
</body>
</html>
`;

describe('Form Post Response Mode', () => {
  let responseMode: FormPostResponseMode;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(FormPostResponseMode).toSelf().asSingleton();

    responseMode = container.resolve(FormPostResponseMode);
  });

  afterEach(() => {
    container.clear();
  });

  describe('name', () => {
    it('should have "form_post" as its value.', () => {
      expect(responseMode.name).toEqual<ResponseModeName>('form_post');
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

      expect(response.status).toEqual(200);
      expect(response.cookies).toStrictEqual<NodeJS.Dict<unknown>>({});
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({ 'content-type': 'text/html; charset=UTF-8' });
      expect(response.body).toEqual(Buffer.from(body.trim(), 'utf8'));
    });
  });
});
