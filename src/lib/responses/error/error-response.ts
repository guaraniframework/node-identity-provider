/**
 * Parameters of the Error Response.
 */
export interface ErrorResponse extends NodeJS.Dict<string | null> {
  /**
   * Error Code.
   */
  readonly error: string;

  /**
   * Description of the Error.
   */
  readonly error_description: string;

  /**
   * URI of the Page containing the details of the Error.
   */
  error_uri?: string;
}
