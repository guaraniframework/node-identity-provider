import { ContextInteractionContext } from '../context/interaction/context/context.interaction-context';
import { DecisionInteractionContext } from '../context/interaction/decision/decision.interaction-context';
import { ContextInteractionResponse } from '../responses/interaction/context/context.interaction-response';
import { DecisionInteractionResponse } from '../responses/interaction/decision/decision.interaction-response';
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
  public abstract handleContext(context: ContextInteractionContext): Promise<ContextInteractionResponse>;

  /**
   * Handles the Decision Flow of the Interaction.
   *
   * @param context Interaction Decision Request Context.
   * @returns Decision Interaction Response.
   */
  public abstract handleDecision(context: DecisionInteractionContext): Promise<DecisionInteractionResponse>;
}
