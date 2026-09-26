/**
 * Parameters of the Context Interaction Response.
 */
export interface ContextInteractionResponse<
  TContext extends NodeJS.Dict<unknown> = NodeJS.Dict<unknown>,
> extends NodeJS.Dict<unknown> {
  /**
   * Context of the Context Interaction Response.
   */
  readonly context: TContext;
}
