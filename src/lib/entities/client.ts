import { URL } from 'url';

import {
  ContentEncryptionAlgorithm,
  DigitalSignatureAlgorithm,
  JsonWebKeySetParameters,
  KeyManagementAlgorithm,
} from '@guarani/jose';

import { ResponseTypeName } from '../response-types/response-type-name.type';
import { SubjectTypeName } from '../subject-types/subject-type-name.type';
import { ApplicationType } from '../types/application-type.type';
import { ClientType } from '../types/client-type.type';
import { ClientSecret } from './client-secret';
import { Scope } from './scope';

/**
 * Identity Provider Client Entity.
 */
export class Client implements NodeJS.Dict<unknown> {
  /**
   * Client Identifier.
   */
  public readonly id!: string;

  /**
   * Client Secrets.
   */
  public secrets!: ClientSecret[];

  /**
   * Client Name.
   */
  public name!: string;

  /**
   * Client Type.
   */
  public type!: ClientType;

  /**
   * Client Profile.
   */
  public profile!: ApplicationType;

  /**
   * Client Redirect URIs.
   */
  public redirectUris!: URL[];

  /**
   * Client Scopes.
   */
  public scopes!: Scope[];

  /**
   * Client Response Types.
   */
  public responseTypes!: ResponseTypeName[];

  /**
   * Array of email addresses of people responsible for the Client.
   */
  public contacts!: string[];

  /**
   * URI of the Client's About Page.
   */
  public clientUri!: URL | null;

  /**
   * URI of the Client's Logo.
   */
  public logoUri!: URL | null;

  /**
   * URI of the Client's Privacy Policy page.
   */
  public policyUri!: URL | null;

  /**
   * URI of the Client's Terms of Services page.
   */
  public tosUri!: URL | null;

  /**
   * JSON Web Key Set URL of the Client.
   */
  public jwksUri!: URL | null;

  /**
   * JSON Web Key Set object containing the JSON Web Keys of the Client.
   */
  public jwks!: JsonWebKeySetParameters | null;

  /**
   * Https Url used to calculate the Pseudonymous Identifiers for the Client.
   */
  public sectorIdentifierUri!: URL | null;

  /**
   * Subject Type for responses to the Client.
   */
  public subjectType!: SubjectTypeName;

  /**
   * JSON Web Signature Algorithm used to sign the ID Token issued to the Client.
   */
  public idTokenSignedResponseAlgorithm!: Exclude<DigitalSignatureAlgorithm, 'none'> | null;

  /**
   * JSON Web Encryption Key Wrap Algorithm used to encrypt the ID Token issued to the Client.
   */
  public idTokenEncryptedResponseKeyWrap!: KeyManagementAlgorithm | null;

  /**
   * JSON Web Encryption Content Encryption Algorithm used to encrypt the ID Token issued to the Client.
   */
  public idTokenEncryptedResponseContentEncryption!: ContentEncryptionAlgorithm | null;

  /**
   * Default Maximum Authentication Age.
   */
  public defaultMaxAge!: number | null;

  /**
   * Indicates if the claim **auth_time** is required in the ID Token.
   */
  public requireAuthTime!: boolean;

  /**
   * Default Authentication Context Class References of the Client.
   */
  public defaultAcrValues!: string[];

  /**
   * Unique Identifier of the Client's Software.
   */
  public softwareId!: string | null;

  /**
   * Version of the Client's Software.
   */
  public softwareVersion!: string | null;

  /**
   * Client Creation Date.
   */
  public readonly createdAt!: Date;

  /**
   * Client Update Date.
   */
  public updatedAt!: Date;

  /**
   * Additional Client Parameters.
   */
  [parameter: string]: unknown;
}
