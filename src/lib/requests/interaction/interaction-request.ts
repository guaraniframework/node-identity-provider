import { InteractionTypeName } from '../../interaction-types/interaction-type-name.type';

/**
 * Parameters of the custom Interaction Request.
 */
export interface InteractionRequest extends NodeJS.Dict<string> {
  /**
   * Interaction Type requested by the Client.
   */
  readonly interaction_type: InteractionTypeName;
}
