import { LoginDecisionInteractionRequest } from './login.decision-interaction-request';

/**
 * Parameters of the Login Accept Decision Interaction Request.
 */
export interface LoginAcceptDecisionInteractionRequest extends LoginDecisionInteractionRequest<'accept'> {
  /**
   * Subject Identifier of the Authentication Process.
   */
  readonly subject_id: string;

  /**
   * Space delimited list of Authentication Methods used in the Authentication Process.
   */
  readonly amr?: string;

  /**
   * Authentication Context Class Reference satisfied by the Authentication Process.
   */
  readonly acr?: string;
}
