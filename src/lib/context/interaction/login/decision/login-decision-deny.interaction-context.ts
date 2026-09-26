import { IdentityProviderError } from '../../../../errors/identity-provider.error';
import { LoginDecisionInteractionContext } from './login-decision.interaction-context';

/**
 * Parameters of the Login Decision Deny Interaction Context.
 */
export interface LoginDecisionDenyInteractionContext extends LoginDecisionInteractionContext<'deny'> {
  /**
   * Interaction Error.
   */
  readonly error: IdentityProviderError;
}
