import { URL } from 'url';

import { Injectable } from '@guarani/di';

import { HttpResponse } from '../../http/response/http-response';
import { Logger } from '../../logger/logger';
import { addParametersToUrl } from '../../utils/add-parameters-to-url/add-parameters-to-url';
import { Display } from '../display';
import { DisplayName } from '../display-name.type';

/**
 * Returns a formatted html document to be used as the body of the Http Response.
 *
 * @param redirectUri Redirect URI that the User Agent will be redirected to.
 * @returns Formatted html document to be used as the body of the Http Response.
 */
const templateFn = (redirectUri: URL) =>
  `
<!DOCTYPE html>
<html>
  <head></head>
  <body onload="openWindow('${redirectUri.href}');">
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

/**
 * Implementation of the Popup Display.
 */
@Injectable()
export class PopupDisplay extends Display {
  /**
   * Name of the Display.
   */
  public readonly name: DisplayName = 'popup';

  /**
   * Instantiates a new Popup Display.
   *
   * @param logger Logger of the Identity Provider.
   */
  public constructor(protected readonly logger: Logger) {
    super();
  }

  /**
   * Creates an Http Response to the provided Redirect URI based on the provided Parameters.
   *
   * @param redirectUri Url to be redirected.
   * @param parameters Parameters used to build the Http Response.
   * @returns Http Response to the provided Redirect URI.
   */
  public createHttpResponse<T extends NodeJS.Dict<unknown>>(redirectUri: URL, parameters: T): HttpResponse {
    this.logger.debug(
      `[${this.constructor.name}] Called createHttpResponse()`,
      'b3af8410-9e82-42b7-80dc-d19b4d595265',
      { redirect_uri: redirectUri.href, parameters },
    );

    const url = addParametersToUrl(redirectUri, parameters);
    const html = templateFn(url);

    const response = new HttpResponse().html(html);

    this.logger.debug(
      `[${this.constructor.name}] Completed createHttpResponse()`,
      '7eab86b9-068b-446b-bcf2-b01f56bddafb',
      { redirect_uri: redirectUri.href, parameters, response },
    );

    return response;
  }
}
