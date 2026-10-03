import { Grant } from '../../../../entities/grant';
import { Login } from '../../../../entities/login';
import { SelectAccountDecisionInteractionRequest } from '../../../../requests/interaction/decision/select-account/select-account-decision.interaction-request';
import { DecisionInteractionContext } from '../decision.interaction-context';

/**
 * Parameters of the Select Account Decision Interaction Context.
 */
export interface SelectAccountDecisionInteractionContext extends DecisionInteractionContext<SelectAccountDecisionInteractionRequest> {
  /**
   * Grant based on the Login Challenge provided by the Client.
   */
  readonly grant: Grant;

  /**
   * Login selected by the User.
   */
  readonly login: Login;
}
