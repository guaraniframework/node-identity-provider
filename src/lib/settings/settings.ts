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
import { InteractionsSettings } from './interactions/interactions.settings';
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
   * JSON Web Signature Digital Signature Algorithms for JWT Bearer Client Assertion Signature registered at the Identity Provider.
   */
  public readonly clientAuthenticationSigningAlgorithms: Exclude<DigitalSignatureAlgorithm, 'none'>[];

  /**
   * JSON Web Encryption Key Wrap Algorithms for JWT Bearer Client Assertion Encryption registered at the Identity Provider.
   */
  public readonly clientAuthenticationEncryptionKeyWrapAlgorithms: KeyManagementAlgorithm[];

  /**
   * JSON Web Encryption Content Encryption Algorithms for JWT Bearer Client Assertion Encryption registered at the Identity Provider.
   */
  public readonly clientAuthenticationEncryptionContentEncryptionAlgorithms: ContentEncryptionAlgorithm[];

  /**
   * JSON Web Signature Digital Signature Algorithms for JWT Bearer Assertion Signature registered at the Identity Provider.
   */
  public readonly jwtBearerGrantSigningAlgorithms: Exclude<DigitalSignatureAlgorithm, 'none'>[];

  /**
   * JSON Web Encryption Key Wrap Algorithms for JWT Bearer Assertion Encryption registered at the Identity Provider.
   */
  public readonly jwtBearerGrantEncryptionKeyWrapAlgorithms: KeyManagementAlgorithm[];

  /**
   * JSON Web Encryption Content Encryption Algorithms for JWT Bearer Assertion Encryption registered at the Identity Provider.
   */
  public readonly jwtBearerGrantEncryptionContentEncryptionAlgorithms: ContentEncryptionAlgorithm[];

  /**
   * UI Locales registered at the Identity Provider.
   */
  public readonly uiLocales: string[];

  /**
   * Authentication Context Class References registered at the Identity Provider.
   */
  public readonly acrValues: string[];

  /**
   * Defines the Interactions Settings.
   */
  public readonly interactions: InteractionsSettings;

  /**
   * Defines the minimum accepted value for the "max_age" Authorization Request Parameter.
   *
   * @default 7,776,000 (90 days)
   */
  public readonly minimumMaxAge: number;

  /**
   * Enables Authorization Response Issuer Identifier in Authorization and Token Responses.
   *
   * @default false
   */
  public readonly enableAuthorizationResponseIssuerIdentifier: boolean;

  /**
   * Enables Refresh Token Rotation on the Authorization Server.
   *
   * @default false
   */
  public readonly enableRefreshTokenRotation: boolean;

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
    this.clientAuthenticationSigningAlgorithms = this.getClientAuthenticationSigningAlgorithms(parameters);
    this.clientAuthenticationEncryptionKeyWrapAlgorithms =
      this.getClientAuthenticationEncryptionKeyWrapAlgorithms(parameters);
    this.clientAuthenticationEncryptionContentEncryptionAlgorithms =
      this.getClientAuthenticationEncryptionContentEncryptionAlgorithms(parameters);
    this.jwtBearerGrantSigningAlgorithms = this.getJwtBearerGrantSigningAlgorithms(parameters);
    this.jwtBearerGrantEncryptionKeyWrapAlgorithms = this.getJwtBearerGrantEncryptionKeyWrapAlgorithms(parameters);
    this.jwtBearerGrantEncryptionContentEncryptionAlgorithms =
      this.getJwtBearerGrantEncryptionContentEncryptionAlgorithms(parameters);
    this.uiLocales = this.getUiLocales(parameters);
    this.acrValues = this.getAcrValues(parameters);
    this.interactions = this.getInteractions(parameters);
    this.minimumMaxAge = this.getMinimumMaxAge(parameters);
    this.enableAuthorizationResponseIssuerIdentifier = this.getEnableAuthorizationResponseIssuerIdentifier(parameters);
    this.enableRefreshTokenRotation = this.getEnableRefreshTokenRotation(parameters);
    this.sessionCookie = this.getSessionCookie(parameters);

    this.checkIdTokenAlgorithms();
    this.checkClientAuthenticationAlgorithms();
    this.checkJwtBearerGrantAlgorithms();
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
   * Checks and returns the provied Client Authentication Signing Algorithms or an empty array.
   *
   * @param parameters Parameters of the Settings.
   * @throws {TypeError} The provided Client Authentication Signing Algorithms is invalid.
   * @returns Provided Client Authentication Signing Algorithms.
   */
  private getClientAuthenticationSigningAlgorithms(
    parameters: SettingsParameters,
  ): Exclude<DigitalSignatureAlgorithm, 'none'>[] {
    if (
      'clientAuthenticationSigningAlgorithms' in parameters &&
      (!Array.isArray(parameters.clientAuthenticationSigningAlgorithms) ||
        parameters.clientAuthenticationSigningAlgorithms.length === 0 ||
        parameters.clientAuthenticationSigningAlgorithms.includes('none' as any) ||
        parameters.clientAuthenticationSigningAlgorithms.some((algorithm) => {
          return !JsonWebSignatureHeader.digitalSignatureAlgorithms.includes(algorithm);
        }))
    ) {
      throw new TypeError('The provided Client Authentication Signing Algorithms is invalid.');
    }

    return parameters.clientAuthenticationSigningAlgorithms ?? [];
  }

  /**
   * Checks and returns the provied Client Authentication Encryption Key Wrap Algorithms or an empty array.
   *
   * @param parameters Parameters of the Settings.
   * @throws {TypeError} The provided Client Authentication Encryption Key Wrap Algorithms is invalid.
   * @returns Provided Client Authentication Encryption Key Wrap Algorithms.
   */
  private getClientAuthenticationEncryptionKeyWrapAlgorithms(parameters: SettingsParameters): KeyManagementAlgorithm[] {
    if (
      'clientAuthenticationEncryptionKeyWrapAlgorithms' in parameters &&
      (!Array.isArray(parameters.clientAuthenticationEncryptionKeyWrapAlgorithms) ||
        parameters.clientAuthenticationEncryptionKeyWrapAlgorithms.length === 0 ||
        parameters.clientAuthenticationEncryptionKeyWrapAlgorithms.some((algorithm) => {
          return !JsonWebEncryptionHeader.keyManagementAlgorithms.includes(algorithm);
        }))
    ) {
      throw new TypeError('The provided Client Authentication Encryption Key Wrap Algorithms is invalid.');
    }

    return parameters.clientAuthenticationEncryptionKeyWrapAlgorithms ?? [];
  }

  /**
   * Checks and returns the provied Client Authentication Encryption Content Encryption Algorithms or an empty array.
   *
   * @param parameters Parameters of the Settings.
   * @throws {TypeError} The provided Client Authentication Encryption Content Encryption Algorithms is invalid.
   * @returns Provided Client Authentication Encryption Content Encryption Algorithms.
   */
  private getClientAuthenticationEncryptionContentEncryptionAlgorithms(
    parameters: SettingsParameters,
  ): ContentEncryptionAlgorithm[] {
    if (
      'clientAuthenticationEncryptionContentEncryptionAlgorithms' in parameters &&
      (!Array.isArray(parameters.clientAuthenticationEncryptionContentEncryptionAlgorithms) ||
        parameters.clientAuthenticationEncryptionContentEncryptionAlgorithms.length === 0 ||
        parameters.clientAuthenticationEncryptionContentEncryptionAlgorithms.some((algorithm) => {
          return !JsonWebEncryptionHeader.contentEncryptionAlgorithms.includes(algorithm);
        }))
    ) {
      throw new TypeError('The provided Client Authentication Encryption Content Encryption Algorithms is invalid.');
    }

    return parameters.clientAuthenticationEncryptionContentEncryptionAlgorithms ?? [];
  }

  /**
   * Checks and returns the provied JWT Bearer Grant Signing Algorithms or an empty array.
   *
   * @param parameters Parameters of the Settings.
   * @throws {TypeError} The provided JWT Bearer Grant Signing Algorithms is invalid.
   * @returns Provided JWT Bearer Grant Signing Algorithms.
   */
  private getJwtBearerGrantSigningAlgorithms(
    parameters: SettingsParameters,
  ): Exclude<DigitalSignatureAlgorithm, 'none'>[] {
    if (
      'jwtBearerGrantSigningAlgorithms' in parameters &&
      (!Array.isArray(parameters.jwtBearerGrantSigningAlgorithms) ||
        parameters.jwtBearerGrantSigningAlgorithms.length === 0 ||
        parameters.jwtBearerGrantSigningAlgorithms.includes('none' as any) ||
        parameters.jwtBearerGrantSigningAlgorithms.some((algorithm) => {
          return !JsonWebSignatureHeader.digitalSignatureAlgorithms.includes(algorithm);
        }))
    ) {
      throw new TypeError('The provided JWT Bearer Grant Signing Algorithms is invalid.');
    }

    return parameters.jwtBearerGrantSigningAlgorithms ?? [];
  }

  /**
   * Checks and returns the provied JWT Bearer Grant Encryption Key Wrap Algorithms or an empty array.
   *
   * @param parameters Parameters of the Settings.
   * @throws {TypeError} The provided JWT Bearer Grant Encryption Key Wrap Algorithms is invalid.
   * @returns Provided JWT Bearer Grant Encryption Key Wrap Algorithms.
   */
  private getJwtBearerGrantEncryptionKeyWrapAlgorithms(parameters: SettingsParameters): KeyManagementAlgorithm[] {
    if (
      'jwtBearerGrantEncryptionKeyWrapAlgorithms' in parameters &&
      (!Array.isArray(parameters.jwtBearerGrantEncryptionKeyWrapAlgorithms) ||
        parameters.jwtBearerGrantEncryptionKeyWrapAlgorithms.length === 0 ||
        parameters.jwtBearerGrantEncryptionKeyWrapAlgorithms.some((algorithm) => {
          return !JsonWebEncryptionHeader.keyManagementAlgorithms.includes(algorithm);
        }))
    ) {
      throw new TypeError('The provided JWT Bearer Grant Encryption Key Wrap Algorithms is invalid.');
    }

    return parameters.jwtBearerGrantEncryptionKeyWrapAlgorithms ?? [];
  }

  /**
   * Checks and returns the provied JWT Bearer Grant Encryption Content Encryption Algorithms or an empty array.
   *
   * @param parameters Parameters of the Settings.
   * @throws {TypeError} The provided JWT Bearer Grant Encryption Content Encryption Algorithms is invalid.
   * @returns Provided JWT Bearer Grant Encryption Content Encryption Algorithms.
   */
  private getJwtBearerGrantEncryptionContentEncryptionAlgorithms(
    parameters: SettingsParameters,
  ): ContentEncryptionAlgorithm[] {
    if (
      'jwtBearerGrantEncryptionContentEncryptionAlgorithms' in parameters &&
      (!Array.isArray(parameters.jwtBearerGrantEncryptionContentEncryptionAlgorithms) ||
        parameters.jwtBearerGrantEncryptionContentEncryptionAlgorithms.length === 0 ||
        parameters.jwtBearerGrantEncryptionContentEncryptionAlgorithms.some((algorithm) => {
          return !JsonWebEncryptionHeader.contentEncryptionAlgorithms.includes(algorithm);
        }))
    ) {
      throw new TypeError('The provided JWT Bearer Grant Encryption Content Encryption Algorithms is invalid.');
    }

    return parameters.jwtBearerGrantEncryptionContentEncryptionAlgorithms ?? [];
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
   * Checks and returns the provided Interactions Settings.
   *
   * @param parameters Parameters of the Settings.
   * @throws {TypeError} The provided Interactions Settings is invalid.
   * @returns Provided Interactions Settings.
   */
  private getInteractions(parameters: SettingsParameters): InteractionsSettings {
    if ('interactions' in parameters && !isPlainObject(parameters.interactions)) {
      throw new TypeError('The provided Interactions Settings is invalid.');
    }

    return new InteractionsSettings(parameters.interactions);
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
   * Checks and returns the provided Enable Authorization Response Issuer Identifier.
   *
   * @param parameters Parameters of the Settings.
   * @throws {TypeError} The provided Enable Authorization Response Issuer Identifier is invalid.
   * @returns Provided Enable Authorization Response Issuer Identifier.
   */
  private getEnableAuthorizationResponseIssuerIdentifier(parameters: SettingsParameters): boolean {
    if (
      'enableAuthorizationResponseIssuerIdentifier' in parameters &&
      typeof parameters.enableAuthorizationResponseIssuerIdentifier !== 'boolean'
    ) {
      throw new TypeError('The provided Enable Authorization Response Issuer Identifier is invalid.');
    }

    return parameters.enableAuthorizationResponseIssuerIdentifier ?? false;
  }

  /**
   * Checks and returns the provided Enable Refresh Token Rotation.
   *
   * @param parameters Parameters of the Settings.
   * @throws {TypeError} The provided Enable Refresh Token Rotation is invalid.
   * @returns Provided Enable Refresh Token Rotation.
   */
  private getEnableRefreshTokenRotation(parameters: SettingsParameters): boolean {
    if ('enableRefreshTokenRotation' in parameters && typeof parameters.enableRefreshTokenRotation !== 'boolean') {
      throw new TypeError('The provided Enable Refresh Token Rotation is invalid.');
    }

    return parameters.enableRefreshTokenRotation ?? false;
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

  /**
   * Checks if the combination of provided Client Authentication Algorithms is valid.
   *
   * @throws {TypeError} The provided combination of Client Authentication Algorithms is invalid.
   */
  private checkClientAuthenticationAlgorithms(): void {
    const signatureEnabled = this.clientAuthenticationSigningAlgorithms.length !== 0;
    const keyWrapEnabled = this.clientAuthenticationEncryptionKeyWrapAlgorithms.length !== 0;
    const contentEncryptionEnabled = this.clientAuthenticationEncryptionContentEncryptionAlgorithms.length !== 0;

    if (!signatureEnabled) {
      if (keyWrapEnabled) {
        throw new TypeError(
          'Missing required Client Authentication Signature Algorithms when using Client Authentication Encryption.',
        );
      }

      if (contentEncryptionEnabled) {
        throw new TypeError(
          'Missing required Client Authentication Signature Algorithms when using Client Authentication Encryption.',
        );
      }
    } else {
      if (!keyWrapEnabled && contentEncryptionEnabled) {
        throw new TypeError(
          'Missing required Client Authentication Key Wrap Algorithms when using Client Authentication Encryption.',
        );
      }

      if (keyWrapEnabled && !contentEncryptionEnabled) {
        throw new TypeError(
          'Missing required Client Authentication Content Encryption Algorithms when using Client Authentication Encryption.',
        );
      }
    }
  }

  /**
   * Checks if the combination of provided JWT Bearer Grant Algorithms is valid.
   *
   * @throws {TypeError} The provided combination of JWT Bearer Grant Algorithms is invalid.
   */
  private checkJwtBearerGrantAlgorithms(): void {
    const signatureEnabled = this.jwtBearerGrantSigningAlgorithms.length !== 0;
    const keyWrapEnabled = this.jwtBearerGrantEncryptionKeyWrapAlgorithms.length !== 0;
    const contentEncryptionEnabled = this.jwtBearerGrantEncryptionContentEncryptionAlgorithms.length !== 0;

    if (!signatureEnabled) {
      if (keyWrapEnabled) {
        throw new TypeError(
          'Missing required JWT Bearer Grant Signature Algorithms when using JWT Bearer Grant Encryption.',
        );
      }

      if (contentEncryptionEnabled) {
        throw new TypeError(
          'Missing required JWT Bearer Grant Signature Algorithms when using JWT Bearer Grant Encryption.',
        );
      }
    } else {
      if (!keyWrapEnabled && contentEncryptionEnabled) {
        throw new TypeError(
          'Missing required JWT Bearer Grant Key Wrap Algorithms when using JWT Bearer Grant Encryption.',
        );
      }

      if (keyWrapEnabled && !contentEncryptionEnabled) {
        throw new TypeError(
          'Missing required JWT Bearer Grant Content Encryption Algorithms when using JWT Bearer Grant Encryption.',
        );
      }
    }
  }
}
