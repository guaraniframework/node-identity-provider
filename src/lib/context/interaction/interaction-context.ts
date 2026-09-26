import { InteractionType } from '../../interaction-types/interaction-type';
import { InteractionRequest } from '../../requests/interaction/interaction-request';

/**
 * Parameters of the custom Interaction Context.
 */
export interface InteractionContext<TRequest extends InteractionRequest = InteractionRequest> {
  /**
   * Parameters of the Interaction Request.
   */
  readonly parameters: TRequest;

  /**
   * Interaction Type requested by the Client.
   */
  readonly interactionType: InteractionType;
}
