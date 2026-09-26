import { Buffer } from 'buffer';
import { timingSafeEqual } from 'crypto';
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

/**
 * Base Client Entity.
 */
export abstract class Client implements NodeJS.Dict<unknown> {
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
   * Response Types of the Client.
   */
  public responseTypes!: ResponseTypeName[];

  /**
   * Client Scopes.
   */
  public scopes!: string[];

  /**
   * URI of the Client's Home Page.
   */
  public homeUri!: URL | null;

  /**
   * URI of the Client's Logo.
   */
  public logoUri!: URL | null;

  /**
   * Array of email addresses of people responsible for the Client.
   */
  public contacts!: string[] | null;

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
   * Subject Type for responses to the Client.
   */
  public subjectType!: SubjectTypeName;

  /**
   * Https Url used to calculate the Pseudonymous Identifiers for the Client.
   */
  public sectorIdentifierUri!: URL | null;

  /**
   * JSON Web Signature Algorithm used to sign the ID Token issued to the Client.
   */
  public idTokenSignedResponseAlgorithm!: Exclude<DigitalSignatureAlgorithm, 'none'>;

  /**
   * JSON Web Encryption Key Wrap Algorithm used to encrypt the ID Token issued to the Client.
   */
  public idTokenEncryptedResponseKeyWrap!: KeyManagementAlgorithm | null;

  /**
   * JSON Web Encryption Content Encryption Algorithm used to encrypt the ID Token issued to the Client.
   */
  public idTokenEncryptedResponseContentEncryption!: ContentEncryptionAlgorithm | null;

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
   * Additional Client Parameters.
   */
  [parameter: string]: unknown;

  /**
   * Retrieves the requested Client Secret.
   *
   * @param clientSecret Requested Client Secret.
   * @returns Client Secret Entity.
   */
  public findClientSecret(clientSecret: string): ClientSecret | null {
    return (
      this.secrets.find(({ secret }) => {
        const expectedClientSecret = Buffer.from(secret, 'utf8');
        const receivedClientSecret = Buffer.from(clientSecret, 'utf8');

        return (
          expectedClientSecret.length === receivedClientSecret.length &&
          timingSafeEqual(expectedClientSecret, receivedClientSecret)
        );
      }) ?? null
    );
  }
}
