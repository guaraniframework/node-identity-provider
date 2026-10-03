import { URL } from 'url';

import { Injectable } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { AuthorizationContext } from '../../context/authorization/authorization-context';
import { HttpResponse } from '../../http/response/http-response';
import { Logger } from '../../logger/logger';
import { sanitizeHtml } from '../../utils/sanitize-html/sanitize-html';
import { ResponseMode } from '../response-mode';
import { ResponseModeName } from '../response-mode-name.type';

/**
 * Returns a formatted HTML document to be used as the body of the Http Response.
 *
 * @param redirectUri Redirect URI that the User Agent will be redirected to.
 * @param parameters Authorization Response Parameters that will be returned to the Client Application.
 * @returns Formatted HTML document to be used as the body of the Http Response.
 */
const templateFn = (redirectUri: URL, parameters: NodeJS.Dict<unknown>) =>
  `
<!DOCTYPE html>
<html>
<head>
  <title>Authorizing...</title>
</head>
<body onload="document.forms[0].submit();">
  <form method="POST" action="${sanitizeHtml(redirectUri.href)}">
    ${Object.entries(parameters)
      .map(([key, value]) => {
        return `<input type="hidden" name="${sanitizeHtml(key)}" value="${sanitizeHtml(String(value))}" />`;
      })
      .join('\n    ')}
    <noscript>
      <p>Your browser does not support javascript or it is disabled.</p>
      <button autofocus type="submit">Continue</button>
    </noscript>
  </form>
</body>
</html>
`.trim();

/**
 * Implementation of the Form Post Response Mode.
 */
@Injectable()
export class FormPostResponseMode extends ResponseMode {
  /**
   * Name of the Response Mode.
   */
  public readonly name: ResponseModeName = 'form_post';

  /**
   * Instantiates a new Form Post Response Mode.
   *
   * @param logger Logger of the Identity Provider.
   */
  public constructor(private readonly logger: Logger) {
    super();
  }

  /**
   * Creates an HTML form with its action as the Redirect URI and its fields as hidden inputs
   * containing the provided Authorization Response Parameters.
   *
   * If the User-Agent supports Javascript, the form is automatically submitted as soon as the page finishes loading,
   * otherwise, a submit button is displayed for manual redirection.
   *
   * @param context Context of the Authorization Request.
   * @param parameters Authorization Response Parameters that will be returned to the Client Application.
   * @returns Http Response containing the Authorization Response Parameters.
   */
  public async createHttpResponse(
    context: AuthorizationContext,
    parameters: NodeJS.Dict<unknown>,
  ): Promise<HttpResponse> {
    this.logger.debug(
      `[${this.constructor.name}] Called createHttpResponse()`,
      'c965cabc-1d04-4446-b46f-2ee8a1cb1bd8',
      { context, parameters },
    );

    const html = templateFn(context.redirectUri, removeNullishValues(parameters));
    const response = new HttpResponse().html(html);

    this.logger.debug(
      `[${this.constructor.name}] Completed createHttpResponse()`,
      '46c64fee-cc4f-4f68-b7eb-b9e751f27710',
      { context, parameters, response },
    );

    return response;
  }
}
