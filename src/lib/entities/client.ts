import { Buffer } from 'buffer';
import { timingSafeEqual } from 'crypto';
import { URL } from 'url';

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
