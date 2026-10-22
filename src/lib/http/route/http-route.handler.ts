import { HttpRequest } from '../request/http-request';
import { HttpResponse } from '../response/http-response';

/**
 * Handler of an Http Route.
 */
export type HttpRouteHandler = (request: HttpRequest) => Promise<HttpResponse>;
