import { URL } from 'url';

import { Injectable } from '@guarani/di';

import { HttpResponse } from '../../http/response/http-response';
import { Logger } from '../../logger/logger';
import { addParametersToUrl } from '../../utils/add-parameters-to-url/add-parameters-to-url';
import { Display } from '../display';
import { DisplayName } from '../display-name.type';

/**
 * Implementation of the Page Display.
 */
@Injectable()
export class PageDisplay extends Display {
  /**
   * Name of the Display.
   */
  public readonly name: DisplayName = 'page';

  /**
   * Instantiates a new Page Display.
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
      '7030d2dc-d0e2-415e-a78e-06dbc8528816',
      { redirect_uri: redirectUri.href, parameters },
    );

    const url = addParametersToUrl(redirectUri, parameters);
    const response = new HttpResponse().redirect(url);

    this.logger.debug(
      `[${this.constructor.name}] Completed createHttpResponse()`,
      '48f15e51-f41c-42db-8a82-dc6b3f7eddc8',
      { redirect_uri: redirectUri.href, parameters, response },
    );

    return response;
  }
}
