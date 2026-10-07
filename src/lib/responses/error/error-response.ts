import { ErrorResponseParameters } from './error-response.parameters';

/**
 * Definition of the Error Response.
 */
export class ErrorResponse implements ErrorResponseParameters {
  /**
   * Error Code.
   */
  public readonly error!: string;

  /**
   * Description of the Error.
   */
  public error_description!: string;

  /**
   * URI of the page containing the details of the Error.
   */
  public error_uri?: string;

  /**
   * Additional Error Response Parameters.
   */
  [parameter: string]: string;

  /**
   * Instantiates a new Error Response.
   *
   * @param parameters Parameters of the Error Response.
   */
  public constructor(parameters: ErrorResponseParameters) {
    Object.assign(this, parameters);
  }
}
