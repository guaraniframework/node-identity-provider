import { ClientAssertionParameters } from '../client-assertion.parameters';

/**
 * Parameters of the JWT Bearer Client Assertion.
 */
export interface JwtBearerClientAssertionParameters extends ClientAssertionParameters {
  /**
   * Client Assertion Type requested by the Client.
   */
  readonly client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer';
}
