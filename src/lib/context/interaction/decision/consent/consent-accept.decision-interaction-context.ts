import { Scope } from '../../../../entities/scope';
import { ConsentDecisionInteractionContext } from './consent.decision-interaction-context';

/**
 * Parameters of the Consent Accept Decision Interaction Context.
 */
export interface ConsentAcceptDecisionInteractionContext extends ConsentDecisionInteractionContext<'accept'> {
  /**
   * Scopes granted by the User.
   */
  readonly grantedScopes: Scope[];
}
