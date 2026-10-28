import { ContextInteractionContext } from '../context/interaction/context/context-interaction-context';
import { DecisionInteractionContext } from '../context/interaction/decision/decision-interaction-context';
import { ContextInteractionResponse } from '../responses/interaction/context/context-interaction-response';
import { DecisionInteractionResponse } from '../responses/interaction/decision/decision-interaction-response';
import { InteractionTypeName } from './interaction-type-name.type';

/**
 * The Interaction Type is used to allow the Authenticated User to decide what credentials will be used in the Authorization Process.
 */
export abstract class InteractionType {
  /**
   * Name of the Interaction Type.
   */
  public abstract readonly name: InteractionTypeName;

  /**
   * Handles the Context Flow of the Interaction.
   *
   * @param context Context Interaction Context.
   * @throws {IdentityProviderError} An error occurred when handling the Context Interaction.
   * @returns Context Interaction Response.
   */
  public abstract handleContext(context: ContextInteractionContext): Promise<ContextInteractionResponse>;

  /**
   * Handles the Decision Flow of the Interaction.
   *
   * @param context Decision Interaction Context.
   * @throws {IdentityProviderError} An error occurred when handling the Decision Interaction.
   * @returns Decision Interaction Response.
   */
  public abstract handleDecision(context: DecisionInteractionContext): Promise<DecisionInteractionResponse>;
}
