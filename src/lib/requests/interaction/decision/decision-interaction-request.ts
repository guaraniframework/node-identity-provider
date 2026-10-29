import { InteractionTypeName } from '../../../interaction-types/interaction-type-name.type';
import { InteractionRequest } from '../interaction-request';

/**
 * Parameters of the Decision Interaction Request.
 */
export interface DecisionInteractionRequest<
  TInteractionType extends InteractionTypeName = InteractionTypeName,
> extends InteractionRequest<TInteractionType> {}
