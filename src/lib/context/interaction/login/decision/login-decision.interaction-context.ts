import { Grant } from '../../../../entities/grant';
import { LoginDecision } from '../../../../requests/interaction/login/login-decision';
import { LoginDecisionInteractionRequest } from '../../../../requests/interaction/login/login-decision.interaction-request';
import { InteractionContext } from '../../interaction-context';

/**
 * Parameters of the Login Decision Interaction Context.
 */
export interface LoginDecisionInteractionContext<
  TDecision extends LoginDecision = LoginDecision,
> extends InteractionContext<LoginDecisionInteractionRequest<LoginDecision>> {
  /**
   * Grant based on the Login Challenge provided by the Client.
   */
  readonly grant: Grant;

  /**
   * Decision regarding the User Authentication.
   */
  readonly decision: TDecision;
}
