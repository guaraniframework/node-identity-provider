import { Injectable } from '@guarani/di';

import { AuthorizationContext } from '../../context/authorization/authorization-context';
import { HttpResponse } from '../../http/response/http-response';
import { Logger } from '../../logger/logger';
import { addParametersToUrl } from '../../utils/add-parameters-to-url/add-parameters-to-url';
import { ResponseMode } from '../response-mode';
import { ResponseModeName } from '../response-mode-name.type';

/**
 * Implementation of the Query Response Mode.
 */
@Injectable()
export class QueryResponseMode extends ResponseMode {
  /**
   * Name of the Response Mode.
   */
  public readonly name: ResponseModeName = 'query';

  /**
   * Instantiates a new Query Response Mode.
   *
   * @param logger Logger of the Identity Provider.
   */
  public constructor(private readonly logger: Logger) {
    super();
  }

  /**
   * Creates a Redirect Response to the provided Redirect URI with the provided Parameters at the Query of the URI.
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
      '8619f179-0aec-4495-a526-c9c64c26ee11',
      { context, parameters },
    );

    const url = addParametersToUrl(context.redirectUri, parameters, 'search');
    const response = new HttpResponse().redirect(url);

    this.logger.debug(
      `[${this.constructor.name}] Completed createHttpResponse()`,
      '8ae9339e-e990-4dfc-8c17-ba7054361319',
      { context, parameters, response },
    );

    return response;
  }
}
