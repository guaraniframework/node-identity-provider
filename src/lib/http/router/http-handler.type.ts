import { HttpRequest } from '../request/http-request';
import { HttpResponse } from '../response/http-response';

/**
 * Type definition of the Http Handler of the Identity Provider.
 */
export type HttpHandler = (request: HttpRequest, response: HttpResponse) => Promise<void>;
