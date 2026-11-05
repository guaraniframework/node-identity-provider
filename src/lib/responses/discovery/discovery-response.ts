import { ContentEncryptionAlgorithm, DigitalSignatureAlgorithm, KeyManagementAlgorithm } from '@guarani/jose';

import { ClientAuthenticationName } from '../../client-authentication/client-authentication-name.type';
import { DisplayName } from '../../displays/display-name.type';
import { GrantTypeName } from '../../grant-types/grant-type-name.type';
import { InteractionTypeName } from '../../interaction-types/interaction-type-name.type';
import { PKCEName } from '../../pkces/pkce-name.type';
import { ResponseModeName } from '../../response-modes/response-mode-name.type';
import { ResponseTypeName } from '../../response-types/response-type-name.type';
import { SubjectTypeName } from '../../subject-types/subject-type-name.type';
import { Prompt } from '../../types/promt.type';

/**
 * Parameters of the Discovery Response.
 */
export interface DiscoveryResponse extends NodeJS.Dict<string | number | boolean | string[] | null> {
  /**
   * Base URL of the Identity Provider.
   */
  readonly issuer: string;

  /**
   * URL of the Authorization Endpoint.
   */
  readonly authorization_endpoint: string;

  /**
   * URL of the Interaction Endpoint.
   */
  readonly interaction_endpoint: string;

  /**
   * URL of the Token Endpoint.
   */
  readonly token_endpoint: string;

  /**
   * Scopes supported by the Identity Provider.
   */
  readonly scopes_supported: string[];

  /**
   * Response Types supported by the Identity Provider.
   */
  readonly response_types_supported: ResponseTypeName[];

  /**
   * Response Modes supported by the Identity Provider.
   */
  readonly response_modes_supported: ResponseModeName[];

  /**
   * Interaction Types supported by the Identity Provider.
   */
  readonly interaction_types_supported: InteractionTypeName[];

  /**
   * Grant Types supported by the Identity Provider.
   */
  readonly grant_types_supported: GrantTypeName[];

  /**
   * Authentication Context Class References supported by the Identity Provider.
   */
  readonly acr_values_supported?: string[];

  /**
   * Subject Types supported by the Identity Provider.
   */
  readonly subject_types_supported: SubjectTypeName[];

  /**
   * JSON Web Signature Digital Signature Algorithms for ID Token Signature supported by the Identity Provider.
   */
  readonly id_token_signing_alg_values_supported?: Exclude<DigitalSignatureAlgorithm, 'none'>[];

  /**
   * JSON Web Encryption Key Wrap Algorithms for ID Token Encryption supported by the Identity Provider.
   */
  readonly id_token_encryption_alg_values_supported?: KeyManagementAlgorithm[];

  /**
   * JSON Web Encryption Content Encryption Algorithms for ID Token Encryption supported by the Identity Provider.
   */
  readonly id_token_encryption_enc_values_supported?: ContentEncryptionAlgorithm[];

  /**
   * Client Authentication Methods supported by the Token Endpoint.
   */
  readonly token_endpoint_auth_methods_supported?: ClientAuthenticationName[];

  /**
   * JSON Web Signature Digital Signature Algorithms for Token Endpoint JWT Bearer Client Assertion Signature supported by the Identity Provider.
   */
  readonly token_endpoint_auth_signing_alg_values_supported?: Exclude<DigitalSignatureAlgorithm, 'none'>[];

  /**
   * JSON Web Encryption Key Wrap Algorithms for Token Endpoint JWT Bearer Client Assertion Encryption supported by the Identity Provider.
   */
  readonly token_endpoint_auth_encryption_alg_values_supported?: KeyManagementAlgorithm[];

  /**
   * JSON Web Encryption Content Encryption Algorithms for Token Endpoint JWT Bearer Client Assertion Encryption supported by the Identity Provider.
   */
  readonly token_endpoint_auth_encryption_enc_values_supported?: ContentEncryptionAlgorithm[];

  /**
   * JSON Web Signature Digital Signature Algorithms for JWT Bearer Assertion Signature supported by the Identity Provider.
   */
  readonly jwt_bearer_grant_signing_alg_values_supported?: Exclude<DigitalSignatureAlgorithm, 'none'>[];

  /**
   * JSON Web Encryption Key Wrap Algorithms for JWT Bearer Assertion Encryption supported by the Identity Provider.
   */
  readonly jwt_bearer_grant_encryption_alg_values_supported?: KeyManagementAlgorithm[];

  /**
   * JSON Web Encryption Content Encryption Algorithms for JWT Bearer Assertion Encryption supported by the Identity Provider.
   */
  readonly jwt_bearer_grant_encryption_enc_values_supported?: ContentEncryptionAlgorithm[];

  /**
   * Prompts supported by the Identity Provider.
   */
  readonly prompt_values_supported: Prompt[];

  /**
   * Display Methods supported by the Identity Provider.
   */
  readonly display_values_supported: DisplayName[];

  /**
   * User Interface Locales supported by the Identity Provider.
   */
  readonly ui_locales_supported?: string[];

  /**
   * Proof Key for Code Exchange (PKCE) Methods supported by the Identity Provider.
   */
  readonly code_challenge_methods_supported: PKCEName[];

  /**
   * Informs whether or not the Identity Provider supports Issuer Identifier on the Authorization Response.
   */
  readonly authorization_response_iss_parameter_supported: boolean;

  /**
   * Client Authentication Methods supported by the Interaction Endpoint.
   */
  readonly interaction_endpoint_auth_methods_supported?: ClientAuthenticationName[];

  /**
   * JSON Web Signature Digital Signature Algorithms for Interaction Endpoint JWT Bearer Client Assertion Signature supported by the Identity Provider.
   */
  readonly interaction_endpoint_auth_signing_alg_values_supported?: Exclude<DigitalSignatureAlgorithm, 'none'>[];

  /**
   * JSON Web Encryption Key Wrap Algorithms for Interaction Endpoint JWT Bearer Client Assertion Encryption supported by the Identity Provider.
   */
  readonly interaction_endpoint_auth_encryption_alg_values_supported?: KeyManagementAlgorithm[];

  /**
   * JSON Web Encryption Content Encryption Algorithms for Interaction Endpoint JWT Bearer Client Assertion Encryption supported by the Identity Provider.
   */
  readonly interaction_endpoint_auth_encryption_enc_values_supported?: ContentEncryptionAlgorithm[];
}
