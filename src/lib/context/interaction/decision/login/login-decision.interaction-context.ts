import { Grant } from '../../../../entities/grant';
import { LoginDecision } from '../../../../requests/interaction/decision/login/login-decision';
import { LoginDecisionInteractionRequest } from '../../../../requests/interaction/decision/login/login-decision.interaction-request';
import { DecisionInteractionContext } from '../decision.interaction-context';

/**
 * Parameters of the Login Decision Interaction Context.
 */
export interface LoginDecisionInteractionContext<
  TDecision extends LoginDecision = LoginDecision,
> extends DecisionInteractionContext<LoginDecisionInteractionRequest<LoginDecision>> {
  /**
   * Grant based on the Login Challenge provided by the Client.
   */
  readonly grant: Grant;

  /**
   * Decision regarding the User Authentication.
   */
  readonly decision: TDecision;
}
