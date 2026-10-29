import { Client } from '../../entities/client';
import { ClientSecret } from '../../entities/client-secret';
import { findClientSecret } from './find-client-secret';

describe('findClientSecret()', () => {
  it('should return null when the Client has no Secret.', () => {
    const client: Client = Object.assign<Client, Partial<Client>>(new Client(), {
      id: 'client_id',
      secrets: [],
    });

    expect(findClientSecret(client, 'client_secret')).toBeNull();
  });

  it('should return null when the provided Client Secret has a different length than expected.', () => {
    const secret: ClientSecret = Object.assign<ClientSecret, Partial<ClientSecret>>(new ClientSecret(), {
      secret: 'another_client_secret',
    });

    const client: Client = Object.assign<Client, Partial<Client>>(new Client(), {
      id: 'client_id',
      secrets: [secret],
    });

    expect(findClientSecret(client, 'client_secret')).toBeNull();
  });

  it('should return null when the provided Client Secret is not valid for the Client.', () => {
    const secret: ClientSecret = Object.assign<ClientSecret, Partial<ClientSecret>>(new ClientSecret(), {
      secret: 'secret_client',
    });

    const client: Client = Object.assign<Client, Partial<Client>>(new Client(), {
      id: 'client_id',
      secrets: [secret],
    });

    expect(findClientSecret(client, 'client_secret')).toBeNull();
  });

  it('should return the Client Secret that matches the provided Secret.', () => {
    const secret: ClientSecret = Object.assign<ClientSecret, Partial<ClientSecret>>(new ClientSecret(), {
      secret: 'client_secret',
    });

    const client: Client = Object.assign<Client, Partial<Client>>(new Client(), {
      id: 'client_id',
      secrets: [secret],
    });

    expect(findClientSecret(client, 'client_secret')).toStrictEqual(secret);
  });
});
