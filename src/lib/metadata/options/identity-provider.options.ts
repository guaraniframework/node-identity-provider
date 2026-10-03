import { ContentEncryptionAlgorithm, DigitalSignatureAlgorithm, KeyManagementAlgorithm } from '@guarani/jose';

import { ClientAuthenticationName } from '../../client-authentication/client-authentication-name.type';
import { DisplayName } from '../../displays/display-name.type';
import { PkceName } from '../../pkce/pkce-name.type';
import { ResponseModeName } from '../../response-modes/response-mode-name.type';
import { ResponseTypeName } from '../../response-types/response-type-name.type';
import { SubjectTypeName } from '../../subject-types/subject-type-name.type';
import { IdentityProviderInteractionsOptions } from './identity-provider-interactions.options';

/**
 * Identity Provider Options.
 */
export interface IdentityProviderOptions {
  /**
   * Identity Provider Issuer URL.
   */
  issuer: string;

  /**
   * Scopes supported by the Identity Provider.
   */
  scopes: string[];

  /**
   * Client Authentication Methods registered at the Identity Provider.
   *
   * @default ["client_secret_basic"]
   */
  clientAuthenticationMethods?: ClientAuthenticationName[];

  /**
   * Response Types registered at the Identity Provider.
   *
   * @default ["code", "id_token", "id_token token"]
   */
  responseTypes?: ResponseTypeName[];

  /**
   * Response Modes registered at the Identity Provider.
   *
   * @default ["fragment", "query"]
   */
  responseModes?: ResponseModeName[];

  /**
   * PKCE Methods registered at the Identity Provider.
   *
   * @default ["S256"]
   */
  pkces?: PkceName[];

  /**
   * Displays registered at the Identity Provider.
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
   * Subject Types registered at the Identity Provider.
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
  interactions: IdentityProviderInteractionsOptions;

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
