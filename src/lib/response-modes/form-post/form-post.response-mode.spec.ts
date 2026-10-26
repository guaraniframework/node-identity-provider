import { Buffer } from 'buffer';
import { OutgoingHttpHeaders } from 'http';
import { URL } from 'url';

import { getContainer } from '@guarani/di';

import { CONTAINER } from '../../constants';
import { AuthorizationContext } from '../../context/authorization/authorization-context';
import { HttpResponseStatus } from '../../http/response/http-response-status.enum';
import { Logger } from '../../loggers/logger';
import { AuthorizationResponse } from '../../responses/authorization/authorization-response';
import { ResponseModeName } from '../response-mode-name.type';
import { FormPostResponseMode } from './form-post.response-mode';

jest.mock('../../loggers/logger');

const body = `
<!DOCTYPE html>
<html>
<head>
  <title>Authorizing...</title>
</head>
<body onload="document.forms[0].submit();">
  <form method="POST" action="https:&#x2F;&#x2F;client.example.com&#x2F;oidc&#x2F;callback">
    <input type="hidden" name="state" value="client_state" />
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
`.trim();

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
      expect(responseMode.name).toBe<ResponseModeName>('form_post');
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

      expect(response.status).toBe(HttpResponseStatus.OK);
      expect(response.cookies).toBeEmptyObject();
      expect(response.headers).toStrictEqual<OutgoingHttpHeaders>({ 'content-type': 'text/html; charset=UTF-8' });
      expect(response.body).toStrictEqual(Buffer.from(body, 'utf8'));
    });
  });
});
