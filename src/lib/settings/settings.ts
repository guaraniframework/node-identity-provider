import { URL } from 'url';

import {
  ContentEncryptionAlgorithm,
  DigitalSignatureAlgorithm,
  JsonWebEncryptionHeader,
  JsonWebSignatureHeader,
  KeyManagementAlgorithm,
} from '@guarani/jose';
import { isNonEmptyString, isPlainObject } from '@guarani/primitives';

import { DEFAULT_MINIMUM_MAX_AGE, DEFAULT_SESSION_COOKIE } from '../constants';
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
   * Secret Key of the Identity Provider.
   */
  public readonly secretKey: string;

  /**
   * JSON Web Signature Digital Signature Algorithms for ID Token Signature registered at the Identity Provider.
   */
  public readonly idTokenSignatureAlgorithms: Exclude<DigitalSignatureAlgorithm, 'none'>[];

  /**
   * JSON Web Encryption Key Wrap Algorithms for ID Token Encryption registered at the Identity Provider.
   */
  public readonly idTokenKeyWrapAlgorithms: KeyManagementAlgorithm[];

  /**
   * JSON Web Encryption Content Encryption Algorithms for ID Token Encryption registered at the Identity Provider.
   */
  public readonly idTokenContentEncryptionAlgorithms: ContentEncryptionAlgorithm[];

  /**
   * UI Locales registered at the Identity Provider.
   */
  public readonly uiLocales: string[];

  /**
   * Authentication Context Class References registered at the Identity Provider.
   */
  public readonly acrValues: string[];

  /**
   * Defines the minimum accepted value for the "max_age" Authorization Request Parameter.
   *
   * @default 7,776,000 (90 days)
   */
  public readonly minimumMaxAge: number;

  /**
   * Name of the Session Cookie.
   *
   * @default "guarani"
   */
  public readonly sessionCookie: string;

  /**
   * Instantiates a new Settings.
   *
   * @param parameters Parameters of the Settings.
   * @throws {TypeError} The provided Settings Parameters is invalid.
   */
  public constructor(parameters: SettingsParameters) {
    if (!isPlainObject(parameters)) {
      throw new TypeError('The provided Settings Parameters is invalid.');
    }

    this.issuer = this.getIssuer(parameters);
    this.secretKey = this.getSecretKey(parameters);
    this.idTokenSignatureAlgorithms = this.getIdTokenSignatureAlgorithms(parameters);
    this.idTokenKeyWrapAlgorithms = this.getIdTokenKeyWrapAlgorithms(parameters);
    this.idTokenContentEncryptionAlgorithms = this.getIdTokenContentEncryptionAlgorithms(parameters);
    this.uiLocales = this.getUiLocales(parameters);
    this.acrValues = this.getAcrValues(parameters);
    this.minimumMaxAge = this.getMinimumMaxAge(parameters);
    this.sessionCookie = this.getSessionCookie(parameters);

    this.checkIdTokenAlgorithms();
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

  /**
   * Checks and returns the provided Secret Key.
   *
   * @param parameters Parameters of the Settings.
   * @throws {TypeError} The provided Secret Key is invalid.
   * @returns Provided Secret Key.
   */
  private getSecretKey(parameters: SettingsParameters): string {
    if (!isNonEmptyString(parameters.secretKey)) {
      throw new TypeError('The provided Secret Key is invalid.');
    }

    return parameters.secretKey;
  }

  /**
   * Checks and returns the provied ID Token Signature Algorithms or an empty array.
   *
   * @param parameters Parameters of the Settings.
   * @throws {TypeError} The provided ID Token Signature Algorithms is invalid.
   * @returns Provided ID Token Signature Algorithms.
   */
  private getIdTokenSignatureAlgorithms(parameters: SettingsParameters): Exclude<DigitalSignatureAlgorithm, 'none'>[] {
    if (
      'idTokenSignatureAlgorithms' in parameters &&
      (!Array.isArray(parameters.idTokenSignatureAlgorithms) ||
        parameters.idTokenSignatureAlgorithms.length === 0 ||
        parameters.idTokenSignatureAlgorithms.includes('none' as any) ||
        parameters.idTokenSignatureAlgorithms.some((algorithm) => {
          return !JsonWebSignatureHeader.digitalSignatureAlgorithms.includes(algorithm);
        }))
    ) {
      throw new TypeError('The provided ID Token Signature Algorithms is invalid.');
    }

    return parameters.idTokenSignatureAlgorithms ?? [];
  }

  /**
   * Checks and returns the provied ID Token Key Wrap Algorithms or an empty array.
   *
   * @param parameters Parameters of the Settings.
   * @throws {TypeError} The provided ID Token Key Wrap Algorithms is invalid.
   * @returns Provided ID Token Key Wrap Algorithms.
   */
  private getIdTokenKeyWrapAlgorithms(parameters: SettingsParameters): KeyManagementAlgorithm[] {
    if (
      'idTokenKeyWrapAlgorithms' in parameters &&
      (!Array.isArray(parameters.idTokenKeyWrapAlgorithms) ||
        parameters.idTokenKeyWrapAlgorithms.length === 0 ||
        parameters.idTokenKeyWrapAlgorithms.some((algorithm) => {
          return !JsonWebEncryptionHeader.keyManagementAlgorithms.includes(algorithm);
        }))
    ) {
      throw new TypeError('The provided ID Token Key Wrap Algorithms is invalid.');
    }

    return parameters.idTokenKeyWrapAlgorithms ?? [];
  }

  /**
   * Checks and returns the provied ID Token Content Encryption Algorithms or an empty array.
   *
   * @param parameters Parameters of the Settings.
   * @throws {TypeError} The provided ID Token Content Encryption Algorithms is invalid.
   * @returns Provided ID Token Content Encryption Algorithms.
   */
  private getIdTokenContentEncryptionAlgorithms(parameters: SettingsParameters): ContentEncryptionAlgorithm[] {
    if (
      'idTokenContentEncryptionAlgorithms' in parameters &&
      (!Array.isArray(parameters.idTokenContentEncryptionAlgorithms) ||
        parameters.idTokenContentEncryptionAlgorithms.length === 0 ||
        parameters.idTokenContentEncryptionAlgorithms.some((algorithm) => {
          return !JsonWebEncryptionHeader.contentEncryptionAlgorithms.includes(algorithm);
        }))
    ) {
      throw new TypeError('The provided ID Token Content Encryption Algorithms is invalid.');
    }

    return parameters.idTokenContentEncryptionAlgorithms ?? [];
  }

  /**
   * Checks and returns the provided UI Locales or an empty array.
   *
   * @param parameters Parameters of the Settings.
   * @throws {TypeError} The provided UI Locales is invalid.
   * @returns Provided UI Locales or an empty array.
   */
  private getUiLocales(parameters: SettingsParameters): string[] {
    if (
      'uiLocales' in parameters &&
      (!Array.isArray(parameters.uiLocales) ||
        parameters.uiLocales.length === 0 ||
        parameters.uiLocales.some((uiLocale) => !isNonEmptyString(uiLocale)))
    ) {
      throw new TypeError('The provided UI Locales is invalid.');
    }

    return parameters.uiLocales ?? [];
  }

  /**
   * Checks and returns the provided Authentication Context Class References or an empty array.
   *
   * @param parameters Parameters of the Settings.
   * @throws {TypeError} The provided Authentication Context Class References is invalid.
   * @returns Provided Authentication Context Class References or an empty array.
   */
  private getAcrValues(parameters: SettingsParameters): string[] {
    if (
      'acrValues' in parameters &&
      (!Array.isArray(parameters.acrValues) ||
        parameters.acrValues.length === 0 ||
        parameters.acrValues.some((acrValue) => !isNonEmptyString(acrValue)))
    ) {
      throw new TypeError('The provided Authentication Context Class References is invalid.');
    }

    return parameters.acrValues ?? [];
  }

  /**
   * Checks and returns the provided Minimum Max Age or the Default Minimum Max Age.
   *
   * @param parameters Parameters of the Settings.
   * @throws {TypeError} The provided Minimum Max Age is invalid.
   * @returns Provided Minimum Max Age or Default Minimum Max Age.
   */
  private getMinimumMaxAge(parameters: SettingsParameters): number {
    if (
      'minimumMaxAge' in parameters &&
      (typeof parameters.minimumMaxAge !== 'number' ||
        !Number.isSafeInteger(parameters.minimumMaxAge) ||
        parameters.minimumMaxAge <= 0)
    ) {
      throw new TypeError('The provided Minimum Max Age is invalid.');
    }

    return parameters.minimumMaxAge ?? DEFAULT_MINIMUM_MAX_AGE;
  }

  /**
   * Checks and returns the provided Session Cookie or the Default Session Cookie.
   *
   * @param parameters Parameters of the Settings.
   * @throws {TypeError} The provided Session Cookie is invalid.
   * @returns Provided Session Cookie or Default Session Cookie.
   */
  private getSessionCookie(parameters: SettingsParameters): string {
    if ('sessionCookie' in parameters && !isNonEmptyString(parameters.sessionCookie)) {
      throw new TypeError('The provided Session Cookie is invalid.');
    }

    return parameters.sessionCookie ?? DEFAULT_SESSION_COOKIE;
  }

  /**
   * Checks if the combination of provided ID Token Algorithms is valid.
   *
   * @throws {TypeError} The provided combination of ID Token Algorithms is invalid.
   */
  private checkIdTokenAlgorithms(): void {
    const signatureEnabled = this.idTokenSignatureAlgorithms.length !== 0;
    const keyWrapEnabled = this.idTokenKeyWrapAlgorithms.length !== 0;
    const contentEncryptionEnabled = this.idTokenContentEncryptionAlgorithms.length !== 0;

    if (!signatureEnabled) {
      if (keyWrapEnabled) {
        throw new TypeError('Missing required ID Token Signature Algorithms when using ID Token Encryption.');
      }

      if (contentEncryptionEnabled) {
        throw new TypeError('Missing required ID Token Signature Algorithms when using ID Token Encryption.');
      }
    } else {
      if (!keyWrapEnabled && contentEncryptionEnabled) {
        throw new TypeError('Missing required ID Token Key Wrap Algorithms when using ID Token Encryption.');
      }

      if (keyWrapEnabled && !contentEncryptionEnabled) {
        throw new TypeError('Missing required ID Token Content Encryption Algorithms when using ID Token Encryption.');
      }
    }
  }
}
