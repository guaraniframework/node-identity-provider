import { URL } from 'url';

import { ContentEncryptionAlgorithm, DigitalSignatureAlgorithm, KeyManagementAlgorithm } from '@guarani/jose';

import { DisplayName } from '../displays/display-name.type';
import { PkceName } from '../pkce/pkce-name.type';
import { ResponseModeName } from '../response-modes/response-mode-name.type';
import { ResponseTypeName } from '../response-types/response-type-name.type';
import { SubjectTypeName } from '../subject-types/subject-type-name.type';
import { InteractionsSettings } from './interactions/interactions.settings';

/**
 * Identity Provider Settings.
 */
export interface Settings {
  /**
   * Identity Provider Issuer URL.
   */
  readonly issuer: URL;

  /**
   * Scopes supported by the Identity Provider.
   */
  readonly scopes: string[];

  /**
   * Response Types registered at the Authorization Server.
   */
  readonly responseTypes: ResponseTypeName[];

  /**
   * Response Modes registered at the Authorization Server.
   */
  readonly responseModes: ResponseModeName[];

  /**
   * PKCE Methods registered at the Authorization Server.
   */
  readonly pkces: PkceName[];

  /**
   * Displays registered at the Authorization Server.
   */
  readonly displays: DisplayName[];

  /**
   * Authentication Context Class References registered at the Identity Provider.
   */
  readonly acrValues?: string[];

  /**
   * UI Locales registered at the Identity Provider.
   */
  readonly uiLocales?: string[];

  /**
   * Subject Types registered at the Authorization Server.
   */
  readonly subjectTypes: SubjectTypeName[];

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
   * Defines the Interactions Settings.
   */
  readonly interactions: InteractionsSettings;

  /**
   * Defines the minimum accepted value for the "max_age" Authorization Request Parameter.
   *
   * @default 604800 (7 days)
   */
  readonly minimumMaxAge?: number;

  /**
   * Enables Authorization Response Issuer Identifier in Authorization and Token Responses.
   *
   * @default false
   */
  readonly enableAuthorizationResponseIssuerIdentifier?: boolean;

  /**
   * Secret Key of the Identity Provider.
   */
  readonly secretKey: string;
}
