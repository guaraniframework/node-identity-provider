import { URL } from 'url';

/**
 * Identity Provider Interactions Settings.
 */
export interface InteractionsSettings {
  /**
   * URL of the Error Page.
   */
  readonly errorUrl: URL;

  /**
   * URL of the Registration Page.
   */
  readonly registrationUrl: URL;

  /**
   * URL of the Account Selection Page.
   */
  readonly accountSelectionUrl: URL;

  /**
   * URL of the Login Page.
   */
  readonly loginUrl: URL;

  /**
   * URL of the Consent Page.
   */
  readonly consentUrl: URL;
}
