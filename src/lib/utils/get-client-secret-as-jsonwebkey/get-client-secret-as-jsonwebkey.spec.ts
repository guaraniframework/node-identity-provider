import { Buffer } from 'buffer';

import { JsonWebKey, JsonWebKeyParameters } from '@guarani/jose';

import { Client } from '../../entities/client';
import { ClientSecret } from '../../entities/client-secret';
import { InvalidClientError } from '../../errors/invalid-client/invalid-client.error';
import { getClientSecretAsJsonWebKey } from './get-client-secret-as-jsonwebkey';

describe('getClientSecretAsJsonWebKey()', () => {
  const expiredSecret: ClientSecret = Object.assign<ClientSecret, Partial<ClientSecret>>(new ClientSecret(), {
    expiresAt: new Date(Date.now() - 3600000),
  });

  const secret: ClientSecret = Object.assign<ClientSecret, Partial<ClientSecret>>(new ClientSecret(), {
    secret: 'dZD9jxWOFEiSi-9AjOwmvJKaEJRUBbXl',
    expiresAt: new Date(Date.now() + 3600000),
  });

  it('should throw when the Client Secret is expired.', async () => {
    const client: Client = Object.assign<Client, Partial<Client>>(new Client(), { secrets: [expiredSecret] });
    const error = new InvalidClientError('The Client Secret is expired.');
    await expect(getClientSecretAsJsonWebKey(client)).rejects.toThrowWithMessage(InvalidClientError, error.description);
  });

  it('should return the Client Secret as a JSON Web Key.', async () => {
    const client: Client = Object.assign<Client, Partial<Client>>(new Client(), { secrets: [secret] });

    await expect(getClientSecretAsJsonWebKey(client)).resolves.toStrictEqual<JsonWebKey>(
      expect.objectContaining<Partial<JsonWebKey>>({
        parameters: expect.objectContaining<JsonWebKeyParameters>({
          kty: 'oct',
          k: Buffer.from(secret.secret, 'utf8').toString('base64url'),
        }),
      }),
    );
  });
});
