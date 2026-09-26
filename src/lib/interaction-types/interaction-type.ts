import { InteractionContext } from '../context/interaction/interaction-context';
import { ContextInteractionResponse } from '../responses/interaction/context.interaction-response';
import { DecisionInteractionResponse } from '../responses/interaction/decision.interaction-response';
import { InteractionTypeName } from './interaction-type-name.type';

/**
 * Base class of an Interaction Type.
 */
export abstract class InteractionType {
  /**
   * Name of the Interaction Type.
   */
  public abstract readonly name: InteractionTypeName;

  /**
   * Handles the Context Flow of the Interaction.
   *
   * @param context Interaction Context Request Context.
   * @returns Context Interaction Response.
   */
  public abstract handleContext(context: InteractionContext): Promise<ContextInteractionResponse>;

  /**
   * Handles the Decision Flow of the Interaction.
   *
   * @param context Interaction Decision Request Context.
   * @returns Decision Interaction Response.
   */
  public abstract handleDecision(context: InteractionContext): Promise<DecisionInteractionResponse>;
}
