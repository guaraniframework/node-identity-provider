import { URL } from 'url';

import { isNonEmptyString, isPlainObject } from '@guarani/primitives';

import { SettingsParameters } from './settings.parameters';

/**
 * Settings of the Identity Provider.
 */
export class Settings {
  /**
   * Issuer URL of the Identity Provider.
   */
  public readonly issuer: URL;

  /**
   * Instantiates a new Settings.
   *
   * @param parameters Parameters of the Settings.
   */
  public constructor(parameters: SettingsParameters) {
    if (!isPlainObject(parameters)) {
      throw new TypeError('The provided Settings Parameters is invalid.');
    }

    this.issuer = this.getIssuer(parameters);
  }

  /**
   * Checks and returns the provided Issuer URL.
   *
   * @param parameters Parameters of the Settings.
   * @throws {TypeError} The provided Issuer URL is invalid.
   * @returns Issuer URL.
   */
  private getIssuer(parameters: SettingsParameters): URL {
    if (!('issuer' in parameters) || !isNonEmptyString(parameters.issuer) || !URL.canParse(parameters.issuer)) {
      throw new TypeError('The provided Issuer URL is invalid.');
    }

    return new URL(parameters.issuer);
  }
}
