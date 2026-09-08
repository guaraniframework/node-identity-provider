import { ErrorCode } from '../errors/error-code.type';

/**
 * Definition of the Error Response.
 */
export interface ErrorResponse extends NodeJS.Dict<unknown> {
  /**
   * Error Code.
   */
  readonly error: ErrorCode;

  /**
   * Description of the Error.
   */
  error_description: string;

  /**
   * URI of the page containing the details of the Error.
   */
  error_uri?: string;
}
