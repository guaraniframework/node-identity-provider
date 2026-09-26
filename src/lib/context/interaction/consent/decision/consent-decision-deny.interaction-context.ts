import { IdentityProviderError } from '../../../../errors/identity-provider.error';
import { ConsentDecisionInteractionContext } from './consent-decision.interaction-context';

/**
 * Parameters of the Consent Decision Deny Interaction Context.
 */
export interface ConsentDecisionDenyInteractionContext extends ConsentDecisionInteractionContext<'deny'> {
  /**
   * Interaction Error.
   */
  readonly error: IdentityProviderError;
}
