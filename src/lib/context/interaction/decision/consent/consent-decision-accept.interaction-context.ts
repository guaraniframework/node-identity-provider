import { ConsentDecisionInteractionContext } from './consent-decision.interaction-context';

/**
 * Parameters of the Consent Decision Accept Interaction Context.
 */
export interface ConsentDecisionAcceptInteractionContext extends ConsentDecisionInteractionContext<'accept'> {
  /**
   * Scopes granted by the User.
   */
  readonly grantedScopes: string[];
}
