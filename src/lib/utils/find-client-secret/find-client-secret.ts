import { Buffer } from 'buffer';
import { timingSafeEqual } from 'crypto';

import { Client } from '../../entities/client';
import { ClientSecret } from '../../entities/client-secret';

/**
 * Fetches a Client Secret based on the provided Secret.
 *
 * @param client Client requesting authorization.
 * @param clientSecret Client Secret provided by the Client.
 * @returns Client Secret based on the provided Secret.
 */
export function findClientSecret(client: Client, clientSecret: string): ClientSecret | null {
  let secretMatchIndex: number = -1;
  let matchFound: number = 0;

  const clientSecretBuffer = Buffer.from(clientSecret, 'utf8');

  for (let i = 1; i <= client.secrets.length; i++) {
    const secretBuffer = Buffer.from(client.secrets[i - 1]!.secret, 'utf8');

    const hasSameLength = clientSecretBuffer.length === secretBuffer.length;
    const compareBuffer = hasSameLength ? secretBuffer : clientSecretBuffer;
    const isEqual = timingSafeEqual(clientSecretBuffer, compareBuffer);

    matchFound |= hasSameLength && isEqual ? 1 : 0;

    // @ts-expect-error the compiler complains about bitwise on booleans
    secretMatchIndex = (secretMatchIndex === -1) & (isEqual === true) & (matchFound === 1) ? i - 1 : secretMatchIndex;
  }

  return secretMatchIndex === -1 ? null : client.secrets[secretMatchIndex]!;
}
