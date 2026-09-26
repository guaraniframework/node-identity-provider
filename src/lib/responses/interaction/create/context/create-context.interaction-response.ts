import { ContextInteractionResponse } from '../../context.interaction-response';
import { CreateContextInteractionResponseContext } from './create-context.interaction-response-context';

/**
 * Parameters of the custom Create Context Interaction Response.
 */
export interface CreateContextInteractionResponse extends ContextInteractionResponse<CreateContextInteractionResponseContext> {
  /**
   * Indicates if the Application can skip displaying the User Registration Page.
   */
  readonly skip: boolean;

  /**
   * Request Url.
   */
  readonly request_url: string;
}
