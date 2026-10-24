/**
 * Standard Error Codes.
 */
export enum ErrorCode {
  /**
   * The User did not authorize the Client.
   */
  AccessDenied = 'access_denied',

  /**
   * The Client is invalid or failed authentication.
   */
  InvalidClient = 'invalid_client',

  /**
   * The Identity Provider Request is invalid, contains invalid parameters or is otherwise malformed.
   */
  InvalidRequest = 'invalid_request',

  /**
   * The requested Scope is invalid.
   */
  InvalidScope = 'invalid_scope',

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
   * The Client is not allowed to use the requested Grant.
   */
  UnauthorizedClient = 'unauthorized_client',

  /**
   * The provided Http Request Header Content-Type is not valid for the Identity Provider Request.
   */
  UnsupportedMediaType = 'unsupported_media_type',

  /**
   * The Identity Provider does not support the requested Response Type.
   */
  UnsupportedResponseType = 'unsupported_response_type',
}
