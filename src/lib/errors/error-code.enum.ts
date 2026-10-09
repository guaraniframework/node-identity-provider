/**
 * Standard Error Codes.
 */
export enum ErrorCode {
  /**
   * The Request is invalid, contains invalid parameters or is otherwise malformed.
   */
  InvalidRequest = 'invalid_request',

  /**
   * The requested Endpoint exists in the Identity Provider but does not support the requested Http Request Method.
   */
  MethodNotAllowed = 'method_not_allowed',

  /**
   * The Identity Provider encountered an unexpected error.
   */
  ServerError = 'server_error',

  /**
   * The Http Header Content-Type is not valid for the Endpoint.
   */
  UnsupportedMediaType = 'unsupported_media_type',
}
