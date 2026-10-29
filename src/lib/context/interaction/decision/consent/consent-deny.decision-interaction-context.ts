import { IdentityProviderError } from '../../../../errors/identity-provider.error';
import { ConsentDecisionInteractionContext } from './consent.decision-interaction-context';

/**
 * Parameters of the Consent Deny Decision Interaction Context.
 */
export interface ConsentDenyDecisionInteractionContext extends ConsentDecisionInteractionContext<'deny'> {
  /**
   * Reason for which the Consent was not granted.
   */
  readonly error: IdentityProviderError;
}
