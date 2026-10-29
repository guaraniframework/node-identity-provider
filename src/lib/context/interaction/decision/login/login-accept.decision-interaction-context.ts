import { User } from '../../../../entities/user';
import { LoginDecisionInteractionContext } from './login.decision-interaction-context';

/**
 * Parameters of the Login Accept Decision Interaction Context.
 */
export interface LoginAcceptDecisionInteractionContext extends LoginDecisionInteractionContext<'accept'> {
  /**
   * User to be Authenticated.
   */
  readonly user: User;

  /**
   * Authentication Methods used in the Authentication.
   */
  readonly amr: string[];

  /**
   * Authentication Context Class Reference satisfied by the Authentication process.
   */
  readonly acr: string;
}
