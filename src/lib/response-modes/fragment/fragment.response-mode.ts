import { Injectable } from '@guarani/di';

import { AuthorizationContext } from '../../context/authorization/authorization-context';
import { HttpResponse } from '../../http/response/http-response';
import { Logger } from '../../logger/logger';
import { addParametersToUrl } from '../../utils/add-parameters-to-url/add-parameters-to-url';
import { ResponseMode } from '../response-mode';
import { ResponseModeName } from '../response-mode-name.type';

/**
 * Implementation of the Fragment Response Mode.
 */
@Injectable()
export class FragmentResponseMode extends ResponseMode {
  /**
   * Name of the Response Mode.
   */
  public readonly name: ResponseModeName = 'fragment';

  /**
   * Instantiates a new Fragment Response Mode.
   *
   * @param logger Logger of the Identity Provider.
   */
  public constructor(private readonly logger: Logger) {
    super();
  }

  /**
   * Creates a Redirect Response to the provided Redirect URI with the provided Parameters at the Fragment of the URI.
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
      '9be733ea-e62f-4aa2-92cc-696f6caa877f',
      { context, parameters },
    );

    const url = addParametersToUrl(context.redirectUri, parameters, 'hash');
    const response = new HttpResponse().redirect(url);

    this.logger.debug(
      `[${this.constructor.name}] Completed createHttpResponse()`,
      'd994bebc-3b4c-49b4-b43a-88ef3200e80f',
      { context, parameters, response },
    );

    return response;
  }
}
