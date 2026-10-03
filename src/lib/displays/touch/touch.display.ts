import { URL } from 'url';

import { Injectable } from '@guarani/di';

import { HttpResponse } from '../../http/response/http-response';
import { Logger } from '../../logger/logger';
import { addParametersToUrl } from '../../utils/add-parameters-to-url/add-parameters-to-url';
import { Display } from '../display';
import { DisplayName } from '../display-name.type';

/**
 * Implementation of the Touch Display.
 */
@Injectable()
export class TouchDisplay extends Display {
  /**
   * Name of the Display.
   */
  public readonly name: DisplayName = 'touch';

  /**
   * Instantiates a new Touch Display.
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
      '55aea079-610d-466c-9791-c797f24c392b',
      { redirect_uri: redirectUri.href, parameters },
    );

    const url = addParametersToUrl(redirectUri, parameters);
    const response = new HttpResponse().redirect(url);

    this.logger.debug(
      `[${this.constructor.name}] Completed createHttpResponse()`,
      'b45a2641-a3b0-49b6-9659-370665829dfb',
      { redirect_uri: redirectUri.href, parameters, response },
    );

    return response;
  }
}
