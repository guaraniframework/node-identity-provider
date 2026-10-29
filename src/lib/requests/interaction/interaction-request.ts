import { InteractionTypeName } from '../../interaction-types/interaction-type-name.type';

/**
 * Parameters of the Interaction Request.
 */
export interface InteractionRequest<
  TInteractionType extends InteractionTypeName = InteractionTypeName,
> extends NodeJS.Dict<string> {
  /**
   * Interaction Type requested by the Client.
   */
  readonly interaction_type: TInteractionType;
}
