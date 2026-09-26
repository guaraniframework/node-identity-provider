import { URL } from 'url';

import { ContentEncryptionAlgorithm, DigitalSignatureAlgorithm, KeyManagementAlgorithm } from '@guarani/jose';

import { DisplayName } from '../displays/display-name.type';
import { PkceName } from '../pkce/pkce-name.type';
import { ResponseModeName } from '../response-modes/response-mode-name.type';
import { ResponseTypeName } from '../response-types/response-type-name.type';
import { InteractionsSettings } from '../settings/interactions/interactions.settings';
import { SubjectTypeName } from '../subject-types/subject-type-name.type';

/**
 * Identity Provider Options.
 */
export interface IdentityProviderOptions {
  /**
   * Identity Provider Issuer URL.
   */
  issuer: URL;

  /**
   * Scopes supported by the Identity Provider.
   */
  scopes: string[];

  /**
   * Response Types registered at the Authorization Server.
   *
   * @default ["code", "id_token", "id_token token"]
   */
  responseTypes?: ResponseTypeName[];

  /**
   * Response Modes registered at the Authorization Server.
   *
   * @default ["fragment", "query"]
   */
  responseModes?: ResponseModeName[];

  /**
   * PKCE Methods registered at the Authorization Server.
   *
   * @default ["S256"]
   */
  pkces?: PkceName[];

  /**
   * Displays registered at the Authorization Server.
   *
   * @default ["page", "popup"]
   */
  displays?: DisplayName[];

  /**
   * Authentication Context Class References registered at the Identity Provider.
   */
  acrValues?: string[];

  /**
   * UI Locales registered at the Identity Provider.
   */
  uiLocales?: string[];

  /**
   * Subject Types registered at the Authorization Server.
   *
   * @default ["public"]
   */
  subjectTypes?: SubjectTypeName[];

  /**
   * JSON Web Signature Digital Signature Algorithms for ID Token Signature registered at the Identity Provider.
   *
   * @default ["RS256"]
   */
  idTokenSignatureAlgorithms?: Exclude<DigitalSignatureAlgorithm, 'none'>[];

  /**
   * JSON Web Encryption Key Wrap Algorithms for ID Token Encryption registered at the Identity Provider.
   */
  idTokenKeyWrapAlgorithms?: KeyManagementAlgorithm[];

  /**
   * JSON Web Encryption Content Encryption Algorithms for ID Token Encryption registered at the Identity Provider.
   */
  idTokenContentEncryptionAlgorithms?: ContentEncryptionAlgorithm[];

  /**
   * Defines the Interactions Settings.
   */
  interactions: InteractionsSettings;

  /**
   * Defines the minimum accepted value for the "max_age" Authorization Request Parameter.
   *
   * @default 604800 (7 days)
   */
  minimumMaxAge?: number;

  /**
   * Enables Authorization Response Issuer Identifier in Authorization and Token Responses.
   *
   * @default false
   */
  enableAuthorizationResponseIssuerIdentifier?: boolean;

  /**
   * Secret Key of the Identity Provider.
   */
  secretKey: string;
}
