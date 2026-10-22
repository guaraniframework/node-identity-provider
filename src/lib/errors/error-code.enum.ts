/**
 * Standard Error Codes.
 */
export enum ErrorCode {
  /**
   * The Identity Provider Request is invalid, contains invalid parameters or is otherwise malformed.
   */
  InvalidRequest = 'invalid_request',

  /**
   * The requested Endpoint exists in the Identity Provider but does not support the requested Http Request Method.
   */
  MethodNotAllowed = 'method_not_allowed',

  /**
   * The requested Endpoint does not exist in the Identity Provider.
   */
  NotFound = 'not_found',

  /**
   * The Identity Provider encountered an unexpected error.
   */
  ServerError = 'server_error',

  /**
   * The provided Http Request Header Content-Type is not valid for the Identity Provider Request.
   */
  UnsupportedMediaType = 'unsupported_media_type',
}
