/**
 * Standard Error Codes.
 */
export enum ErrorCode {
  /**
   * The Request is invalid, contains invalid parameters or is otherwise malformed.
   */
  InvalidRequest = 'invalid_request',

  /**
   * The Http Header Content-Type is not valid for the Endpoint.
   */
  UnsupportedMediaType = 'unsupported_media_type',
}
