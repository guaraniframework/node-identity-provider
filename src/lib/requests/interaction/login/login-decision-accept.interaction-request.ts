import { LoginDecisionInteractionRequest } from './login-decision.interaction-request';

/**
 * Parameters of the custom Login Accept Decision Interaction Request.
 */
export interface LoginDecisionAcceptInteractionRequest extends LoginDecisionInteractionRequest<'accept'> {
  /**
   * Identifier of the Subject of the Authentication.
   */
  readonly subject: string;

  /**
   * Space delimited list of Authentication Methods used in the Authentication.
   */
  readonly amr?: string;

  /**
   * Authentication Context Class Reference satisfied by the Authentication process.
   */
  readonly acr?: string;
}
