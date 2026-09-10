import { URL } from 'url';

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
  readonly scopes: Set<string>;
}
