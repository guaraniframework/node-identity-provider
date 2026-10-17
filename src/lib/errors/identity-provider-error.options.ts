/**
 * Identity Provider Error Options.
 */
export interface IdentityProviderErrorOptions extends ErrorOptions {
  /**
   * Previous error in the stack.
   */
  readonly cause?: unknown;

  /**
   * Indicates if the Identity Provider Error is fatal.
   *
   * @default false
   */
  readonly fatal?: boolean;
}
