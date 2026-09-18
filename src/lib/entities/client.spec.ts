import { Client } from './client';
import { ClientSecret } from './client-secret';

describe('Client Entity', () => {
  const noSecretsClient: Client = Object.assign(Reflect.construct(Client, []), { secrets: [] });

  const badLengthSecretClient: Client = Object.assign(Reflect.construct(Client, []), {
    secrets: [Object.assign(Reflect.construct(ClientSecret, []), { secret: 'client_secret_length' })],
  });

  const wrongSecretClient: Client = Object.assign(Reflect.construct(Client, []), {
    secrets: [Object.assign(Reflect.construct(ClientSecret, []), { secret: 'client-secret' })],
  });

  const client: Client = Object.assign(Reflect.construct(Client, []), {
    secrets: [Object.assign(Reflect.construct(ClientSecret, []), { secret: 'client_secret' })],
  });

  describe('findClientSecret()', () => {
    it('should return null when the Client has no registered Secrets.', () => {
      expect(noSecretsClient.findClientSecret('client_secret')).toBeNull();
    });

    it('should return null when requesting a Secret with the wrong length.', () => {
      expect(badLengthSecretClient.findClientSecret('client_secret')).toBeNull();
    });

    it('should return null when requesting a wrong Secret.', () => {
      expect(wrongSecretClient.findClientSecret('client_secret')).toBeNull();
    });

    it('should return the requested Client Secret.', () => {
      const clientSecret = client.findClientSecret('client_secret');

      expect(clientSecret).toBeInstanceOf(ClientSecret);
      expect(clientSecret).toBe(client.secrets[0]!);
    });
  });
});
