import { ClientAssertionName } from './client-assertion-name.type';

/**
 * Parameters of a Client Assertion.
 */
export interface ClientAssertionParameters extends NodeJS.Dict<string | string[]> {
  /**
   * Client Assertion Type requested by the Client.
   */
  readonly client_assertion_type: ClientAssertionName;

  /**
   * Client Assertion provided by the Client.
   */
  readonly client_assertion: string;
}
