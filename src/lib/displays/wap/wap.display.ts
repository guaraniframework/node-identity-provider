import { URL } from 'url';

import { Injectable } from '@guarani/di';

import { HttpResponse } from '../../http/response/http-response';
import { Logger } from '../../logger/logger';
import { addParametersToUrl } from '../../utils/add-parameters-to-url/add-parameters-to-url';
import { Display } from '../display';
import { DisplayName } from '../display-name.type';

/**
 * Implementation of the Wap Display.
 */
@Injectable()
export class WapDisplay extends Display {
  /**
   * Name of the Display.
   */
  public readonly name: DisplayName = 'wap';

  /**
   * Instantiates a new Wap Display.
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
      'c7745899-61d6-4b2a-b81e-8c08c58bb750',
      { redirect_uri: redirectUri.href, parameters },
    );

    const url = addParametersToUrl(redirectUri, parameters);
    const response = new HttpResponse().redirect(url);

    this.logger.debug(
      `[${this.constructor.name}] Completed createHttpResponse()`,
      'c08ae1b3-8ce9-4826-9fc8-fb4307f7f387',
      { redirect_uri: redirectUri.href, parameters, response },
    );

    return response;
  }
}
