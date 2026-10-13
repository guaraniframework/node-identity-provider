/**
 * Standard Error Codes.
 */
export enum ErrorCode {
  /**
   * The Identity Provider Request is invalid, contains invalid parameters or is otherwise malformed.
   */
  InvalidRequest = 'invalid_request',

  /**
   * The provided Http Request Header **Content-Type** is not valid for the Identity Provider Request.
   */
  UnsupportedMediaType = 'unsupported_media_type',
}
