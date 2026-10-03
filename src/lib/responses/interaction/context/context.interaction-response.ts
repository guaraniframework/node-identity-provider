import { InteractionResponse } from '../interaction-response';
import { ContextInteractionResponseContext } from './context.interaction-response-context';

/**
 * Parameters of the Context Interaction Response.
 */
export interface ContextInteractionResponse<
  TContext extends ContextInteractionResponseContext = ContextInteractionResponseContext,
> extends InteractionResponse {
  /**
   * Request Url.
   */
  readonly request_url: string;

  /**
   * Context of the Context Interaction Response.
   */
  readonly context: TContext;
}
