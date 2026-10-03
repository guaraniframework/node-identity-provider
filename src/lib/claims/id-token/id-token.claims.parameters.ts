import { JsonWebTokenClaimsParameters } from '@guarani/jose';

/**
 * OpenID Connect ID Token Claims Parameters.
 */
export interface IdTokenClaimsParameters extends JsonWebTokenClaimsParameters {
  /**
   * Identifier of the Issuer of the ID Token.
   */
  readonly iss: string;

  /**
   * Subject represented by the ID Token.
   */
  readonly sub: string;

  /**
   * Identifier of the Audience the ID Token is intended to.
   */
  readonly aud: string | string[];

  /**
   * UTC time denoting the Expiration Time of the ID Token.
   */
  readonly exp: number;

  /**
   * UTC time denoting the moment when the ID Token was created.
   */
  readonly iat: number;

  /**
   * Time when the User was authenticated.
   */
  auth_time?: number;

  /**
   * Value provided at the Authentication Request to be passed unmodified to the ID Token.
   */
  nonce?: string;

  /**
   * Authentication Context Class Reference value that identifies
   * the Authentication Context Class that the authentication performed satisfied.
   */
  acr?: string;

  /**
   * Authentication Methods References.
   */
  amr?: string[];

  /**
   * Authorized party to which the ID Token was issued.
   */
  azp?: string;

  /**
   * Base64Url encoding of the left-most half of the hash of the octets of the ASCII access_token,
   * where the hash algorithm is the one used in the "alg" JSON Web Signature Header Parameter of the ID Token.
   */
  at_hash?: string;

  /**
   * Base64Url encoding of the left-most half of the hash of the octets of the ASCII code,
   * where the hash algorithm is the one used in the "alg" JSON Web Signature Header Parameter of the ID Token.
   */
  c_hash?: string;
}
