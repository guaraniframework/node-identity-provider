import { Buffer } from 'buffer';
import { createHash, timingSafeEqual } from 'crypto';

import { Injectable } from '@guarani/di';

import { Logger } from '../../logger/logger';
import { Pkce } from '../pkce';
import { PkceName } from '../pkce-name.type';

/**
 * Implementation of the S256 Proof Key for Code Exchange.
 */
@Injectable()
export class S256Pkce extends Pkce {
  /**
   * Name of the PKCE.
   */
  public readonly name: PkceName = 'S256';

  /**
   * Instantiates a new S256 PKCE.
   *
   * @param logger Logger of the Identity Provider.
   */
  public constructor(private readonly logger: Logger) {
    super();
  }

  /**
   * Performs a comparison between the Authorization Code Challenge hash received at the Authorization Endpoint
   * and the ASCII Base64Url Encoded SHA-256 hash of the Authorization Code Verifier received at the Token Endpoint.
   *
   * @param challenge Authorization Code Challenge provided at the Authorization Endpoint.
   * @param verifier Authorization Code Verifier provided at the Token Endpoint.
   * @returns Whether or not the Challenge and Verifier match.
   */
  public verify(challenge: string, verifier: string): boolean {
    this.logger.debug(`[${this.constructor.name}] Called verify()`, '593651af-dec1-4c7d-b25f-0c91d1fc2647', {
      challenge,
      verifier,
    });

    const challengeBuffer = Buffer.from(challenge, 'base64url');
    const verifierBuffer = createHash('sha256').update(verifier, 'ascii').digest();

    const result = challengeBuffer.length === verifierBuffer.length && timingSafeEqual(challengeBuffer, verifierBuffer);

    this.logger.debug(`[${this.constructor.name}] Completed verify()`, '5b5e3be4-9e9a-4813-951d-eb8f3a56270f', {
      challenge,
      verifier,
      result,
    });

    return result;
  }
}
