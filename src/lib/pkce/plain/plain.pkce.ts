import { Buffer } from 'buffer';
import { timingSafeEqual } from 'crypto';

import { Injectable } from '@guarani/di';

import { Logger } from '../../logger/logger';
import { Pkce } from '../pkce';
import { PkceName } from '../pkce-name.type';

/**
 * Implementation of the Plain Proof Key for Code Exchange.
 */
@Injectable()
export class PlainPkce extends Pkce {
  /**
   * Name of the PKCE.
   */
  public readonly name: PkceName = 'plain';

  /**
   * Instantiates a new Plain PKCE.
   *
   * @param logger Logger of the Identity Provider.
   */
  public constructor(private readonly logger: Logger) {
    super();
  }

  /**
   * Performs a simple string comparison between the Authorization Code Challenge
   * and the Authorization Code Verifier provided by the Client.
   *
   * @param challenge Authorization Code Challenge provided at the Authorization Endpoint.
   * @param verifier Authorization Code Verifier provided at the Token Endpoint.
   * @returns Whether or not the Challenge and Verifier match.
   */
  public verify(challenge: string, verifier: string): boolean {
    this.logger.debug(`[${this.constructor.name}] Called verify()`, '37c8c4b9-52a6-48c2-9733-583a14c8f34c', {
      challenge,
      verifier,
    });

    const challengeBuffer = Buffer.from(challenge, 'utf8');
    const verifierBuffer = Buffer.from(verifier, 'utf8');

    const result = challengeBuffer.length === verifierBuffer.length && timingSafeEqual(challengeBuffer, verifierBuffer);

    this.logger.debug(`[${this.constructor.name}] Completed verify()`, '7213fd9f-b91b-4933-b7dd-d9597bc56b21', {
      challenge,
      verifier,
      result,
    });

    return result;
  }
}
