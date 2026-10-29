import { InteractionTypeName } from '../../../interaction-types/interaction-type-name.type';
import { InteractionRequest } from '../interaction-request';

/**
 * Parameters of the Context Interaction Request.
 */
export interface ContextInteractionRequest<
  TInteractionType extends InteractionTypeName = InteractionTypeName,
> extends InteractionRequest<TInteractionType> {
  /**
   * Identifier of the Client of the Interaction Request.
   */
  readonly client_id: string;
}
