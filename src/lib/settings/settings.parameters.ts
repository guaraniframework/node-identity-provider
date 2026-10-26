import { URL } from 'url';

import { ContentEncryptionAlgorithm, DigitalSignatureAlgorithm, KeyManagementAlgorithm } from '@guarani/jose';

/**
 * Parameters of the Settings of the Identity Provider.
 */
export interface SettingsParameters {
  /**
   * Base URL of the Identity Provider.
   */
  readonly issuer: string | URL;

  /**
   * Secret Key of the Identity Provider.
   */
  readonly secretKey: string;

  /**
   * JSON Web Signature Digital Signature Algorithms for ID Token Signature registered at the Identity Provider.
   */
  readonly idTokenSignatureAlgorithms?: Exclude<DigitalSignatureAlgorithm, 'none'>[];

  /**
   * JSON Web Encryption Key Wrap Algorithms for ID Token Encryption registered at the Identity Provider.
   */
  readonly idTokenKeyWrapAlgorithms?: KeyManagementAlgorithm[];

  /**
   * JSON Web Encryption Content Encryption Algorithms for ID Token Encryption registered at the Identity Provider.
   */
  readonly idTokenContentEncryptionAlgorithms?: ContentEncryptionAlgorithm[];

  /**
   * UI Locales registered at the Identity Provider.
   *
   * @default []
   */
  readonly uiLocales?: string[];

  /**
   * Authentication Context Class References registered at the Identity Provider.
   *
   * @default []
   */
  readonly acrValues?: string[];

  /**
   * Defines the minimum accepted value for the "max_age" Authorization Request Parameter.
   *
   * @default 7,776,000 (90 days)
   */
  readonly minimumMaxAge?: number;

  /**
   * Name of the Session Cookie.
   *
   * @default "guarani"
   */
  readonly sessionCookie?: string;
}
