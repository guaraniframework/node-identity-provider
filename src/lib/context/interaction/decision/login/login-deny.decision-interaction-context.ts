import { IdentityProviderError } from '../../../../errors/identity-provider.error';
import { LoginDecisionInteractionContext } from './login.decision-interaction-context';

/**
 * Parameters of the Login Deny Decision Interaction Context.
 */
export interface LoginDenyDecisionInteractionContext extends LoginDecisionInteractionContext<'deny'> {
  /**
   * Reason for which the Login was not performed.
   */
  readonly error: IdentityProviderError;
}
