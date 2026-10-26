import { URL } from 'url';

import { isNonEmptyString } from '@guarani/primitives';

import { InteractionsSettingsParameters } from './interactions.settings.parameters';

/**
 * Identity Provider Interactions Settings.
 */
export class InteractionsSettings {
  /**
   * Error Page URL.
   */
  public readonly errorUrl: URL;

  /**
   * Registration Page URL.
   */
  public readonly registrationUrl: URL;

  /**
   * Account Selection Page URL.
   */
  public readonly accountSelectionUrl: URL;

  /**
   * Login Page URL.
   */
  public readonly loginUrl: URL;

  /**
   * Consent Page URL.
   */
  public readonly consentUrl: URL;

  /**
   * Instantiates a new Interactions Settings.
   *
   * @param parameters Parameters of the Interactions Settings.
   * @throws {TypeError} The provided Interactions Settings Parameters is invalid.
   */
  public constructor(parameters: InteractionsSettingsParameters) {
    this.errorUrl = this.getErrorUrl(parameters);
    this.registrationUrl = this.getRegistrationUrl(parameters);
    this.accountSelectionUrl = this.getAccountSelectionUrl(parameters);
    this.loginUrl = this.getLoginUrl(parameters);
    this.consentUrl = this.getConsentUrl(parameters);
  }

  /**
   * Checks and returns the provided Error Page URL.
   *
   * @param parameters Parameters of the Settings.
   * @throws {TypeError} The provided Error Page URL is invalid.
   * @returns Error Page URL.
   */
  private getErrorUrl(parameters: InteractionsSettingsParameters): URL {
    if (!('errorUrl' in parameters) || !isNonEmptyString(parameters.errorUrl) || !URL.canParse(parameters.errorUrl)) {
      throw new TypeError('The provided Error Page URL is invalid.');
    }

    return new URL(parameters.errorUrl);
  }

  /**
   * Checks and returns the provided Registration Page URL.
   *
   * @param parameters Parameters of the Settings.
   * @throws {TypeError} The provided Registration Page URL is invalid.
   * @returns Registration Page URL.
   */
  private getRegistrationUrl(parameters: InteractionsSettingsParameters): URL {
    if (
      !('registrationUrl' in parameters) ||
      !isNonEmptyString(parameters.registrationUrl) ||
      !URL.canParse(parameters.registrationUrl)
    ) {
      throw new TypeError('The provided Registration Page URL is invalid.');
    }

    return new URL(parameters.registrationUrl);
  }

  /**
   * Checks and returns the provided Account Selection Page URL.
   *
   * @param parameters Parameters of the Settings.
   * @throws {TypeError} The provided Account Selection Page URL is invalid.
   * @returns Account Selection Page URL.
   */
  private getAccountSelectionUrl(parameters: InteractionsSettingsParameters): URL {
    if (
      !('accountSelectionUrl' in parameters) ||
      !isNonEmptyString(parameters.accountSelectionUrl) ||
      !URL.canParse(parameters.accountSelectionUrl)
    ) {
      throw new TypeError('The provided Account Selection Page URL is invalid.');
    }

    return new URL(parameters.accountSelectionUrl);
  }

  /**
   * Checks and returns the provided Login Page URL.
   *
   * @param parameters Parameters of the Settings.
   * @throws {TypeError} The provided Login Page URL is invalid.
   * @returns Login Page URL.
   */
  private getLoginUrl(parameters: InteractionsSettingsParameters): URL {
    if (!('loginUrl' in parameters) || !isNonEmptyString(parameters.loginUrl) || !URL.canParse(parameters.loginUrl)) {
      throw new TypeError('The provided Login Page URL is invalid.');
    }

    return new URL(parameters.loginUrl);
  }

  /**
   * Checks and returns the provided Consent Page URL.
   *
   * @param parameters Parameters of the Settings.
   * @throws {TypeError} The provided Consent Page URL is invalid.
   * @returns Consent Page URL.
   */
  private getConsentUrl(parameters: InteractionsSettingsParameters): URL {
    if (
      !('consentUrl' in parameters) ||
      !isNonEmptyString(parameters.consentUrl) ||
      !URL.canParse(parameters.consentUrl)
    ) {
      throw new TypeError('The provided Consent Page URL is invalid.');
    }

    return new URL(parameters.consentUrl);
  }
}
