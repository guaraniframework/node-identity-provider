/**
 * Parameters of the Identity Provider Interactions Settings.
 */
export interface InteractionsSettingsParameters {
  /**
   * URL of the Error Page.
   */
  readonly errorUrl: string;

  /**
   * URL of the Registration Page.
   */
  readonly registrationUrl: string;

  /**
   * URL of the Account Selection Page.
   */
  readonly accountSelectionUrl: string;

  /**
   * URL of the Login Page.
   */
  readonly loginUrl: string;

  /**
   * URL of the Consent Page.
   */
  readonly consentUrl: string;
}
