import { OutgoingHttpHeaders } from 'http';

import { Injectable, InjectAll } from '@guarani/di';

import { HttpRequest } from '../../http/request/http-request';
import { HttpRequestMethod } from '../../http/request/http-request-method.type';
import { HttpResponse } from '../../http/response/http-response';
import { Logger } from '../../logger/logger';
import { Endpoint } from '../endpoint';
import { EndpointName } from '../endpoint-name.type';

/**
 * Implementation of the Authorization Endpoint.
 *
 * This endpoint is used to provide an Authorization Grant for the requesting Client on behalf of the End User.
 */
@Injectable()
export class InteractionEndpoint extends Endpoint {
  /**
   * Name of the Endpoint.
   */
  public readonly name: EndpointName = 'interaction';

  /**
   * Path of the Endpoint.
   */
  public readonly path: string = '/oidc/interaction';

  /**
   * Http Methods supported by the Endpoint.
   */
  public readonly httpMethods: HttpRequestMethod[] = ['GET', 'POST'];

  /**
   * Default Http Headers to be included in the Response.
   */
  private readonly headers: OutgoingHttpHeaders = { 'Cache-Control': 'no-store', Pragma: 'no-cache' };

  /**
   * Instantiates a new Interaction Endpoint.
   *
   * @param logger Logger of the Identity Provider.
   * @param validators Interaction Request Validators of the Identity Provider.
   */
  public constructor(
    private readonly logger: Logger,
    @InjectAll(InteractionRequestValidator) private readonly validators: InteractionRequestValidator[],
  ) {
    super();
  }

  /**
   * Creates an Http JSON Interaction Response.
   *
   * This method is a dispatcher for either the Interaction Context Request via the Http Method GET,
   * or the Interaction Decision Request, via the Http Method POST.
   *
   * @param request Http Request.
   * @returns Http Response.
   */
  public async handle(request: HttpRequest): Promise<HttpResponse> {}
}
