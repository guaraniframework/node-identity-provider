import { Buffer } from 'buffer';

import { JsonWebKey, jwk } from '@guarani/jose';

import { Client } from '../../entities/client';
import { InvalidClientError } from '../../errors/invalid-client/invalid-client.error';

/**
 * Returns the Client's Secret as a JSON Web Key.
 *
 * @param client Client of the Request.
 * @throws {InvalidClientError} The Client Secret is expired.
 * @returns Client Secret as a JSON Web Key.
 */
export async function getClientSecretAsJsonWebKey(client: Client): Promise<JsonWebKey> {
  const clientSecret = client.secrets[0]!;

  if (new Date() > clientSecret.expiresAt) {
    throw new InvalidClientError('The Client Secret is expired.');
  }

  return await jwk.create({ kty: 'oct', k: Buffer.from(clientSecret.secret, 'utf8').toString('base64url') });
}
