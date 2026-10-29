import { InvalidJsonWebTokenClaimsError, JsonWebTokenClaims, JsonWebTokenClaimsOptions } from '@guarani/jose';
import { isNonEmptyString } from '@guarani/primitives';

import { IdTokenClaimsParameters } from './id-token.claims.parameters';

/**
 * OpenID Connect ID Token Claims.
 */
export class IdTokenClaims extends JsonWebTokenClaims {
  /**
   * JSON Web Token Claims.
   */
  declare public readonly parameters: IdTokenClaimsParameters;

  /**
   * Instantiates a new ID Token.
   *
   * @param claims Defines the claims of the ID Token.
   * @param options JSON Web Token Claims Options.
   * @throws {TypeError} The provided ID Token Claims Parameters is invalid.
   * @throws {InvalidJsonWebTokenClaimsError} The provided ID Token Claims Parameters are invalid.
   */
  public constructor(claims: IdTokenClaimsParameters, options?: JsonWebTokenClaimsOptions) {
    super(claims, options);
  }

  /**
   * Validates the claims of the ID Token.
   *
   * @param claims Claims of the ID Token.
   * @throws {InvalidJsonWebTokenClaimsError} The provided JSON Web Token Claims Parameters are invalid.
   */
  protected static override validateCustomClaims(claims: IdTokenClaimsParameters): void {
    if (!('iss' in claims)) {
      throw new InvalidJsonWebTokenClaimsError('Invalid ID Token Claim "iss".');
    }

    if (!('sub' in claims)) {
      throw new InvalidJsonWebTokenClaimsError('Invalid ID Token Claim "sub".');
    }

    if (!('aud' in claims)) {
      throw new InvalidJsonWebTokenClaimsError('Invalid ID Token Claim "aud".');
    }

    if (!('exp' in claims)) {
      throw new InvalidJsonWebTokenClaimsError('Invalid ID Token Claim "exp".');
    }

    if (!('iat' in claims)) {
      throw new InvalidJsonWebTokenClaimsError('Invalid ID Token Claim "iat".');
    }

    if (
      'auth_time' in claims &&
      (typeof claims.auth_time !== 'number' || !Number.isInteger(claims.auth_time) || claims.auth_time < 0)
    ) {
      throw new InvalidJsonWebTokenClaimsError('Invalid ID Token Claim "auth_time".');
    }

    if ('nonce' in claims && !isNonEmptyString(claims.nonce)) {
      throw new InvalidJsonWebTokenClaimsError('Invalid ID Token Claim "nonce".');
    }

    if ('acr' in claims && !isNonEmptyString(claims.acr)) {
      throw new InvalidJsonWebTokenClaimsError('Invalid ID Token Claim "acr".');
    }

    if (
      'amr' in claims &&
      (!Array.isArray(claims.amr) || claims.amr.length === 0 || claims.amr.some((method) => !isNonEmptyString(method)))
    ) {
      throw new InvalidJsonWebTokenClaimsError('Invalid ID Token Claim "amr".');
    }

    if ('azp' in claims && !isNonEmptyString(claims.azp)) {
      throw new InvalidJsonWebTokenClaimsError('Invalid ID Token Claim "azp".');
    }

    if ('at_hash' in claims && !isNonEmptyString(claims.at_hash)) {
      throw new InvalidJsonWebTokenClaimsError('Invalid ID Token Claim "at_hash".');
    }

    if ('c_hash' in claims && !isNonEmptyString(claims.c_hash)) {
      throw new InvalidJsonWebTokenClaimsError('Invalid ID Token Claim "c_hash".');
    }
  }
}
