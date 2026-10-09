/**
 * Definition of the Error Request.
 */
export interface ErrorRequest extends NodeJS.Dict<string> {
  /**
   * Error Code.
   */
  readonly error: string;

  /**
   * Description of the Error.
   */
  readonly error_description: string;

  /**
   * URI of the page containing the details of the Error.
   */
  readonly error_uri?: string;
}
