import { Buffer } from 'buffer';
import { ClientRequest } from 'http';
import https from 'https';
import { PassThrough } from 'stream';
import { URL } from 'url';

import { JsonWebKey, JsonWebKeyParameters, JsonWebKeySetParameters } from '@guarani/jose';
import { jsonStringify } from '@guarani/primitives';

import { Client } from '../../entities/client';
import { InvalidClientError } from '../../errors/invalid-client/invalid-client.error';
import { getClientJsonWebKey } from './get-client-jsonwebkey';

describe('getClientJsonWebKey()', () => {
  const jsonWebKeyParameters: JsonWebKeyParameters = {
    kty: 'OKP',
    crv: 'Ed25519',
    x: 'aNoALKSUE1UsotuZvHUj1HEGqhpzLtsSTLmkBITDMAk',
  };

  const jsonWebKeySetParameters: JsonWebKeySetParameters = { keys: [jsonWebKeyParameters] };

  const jwksUriClient: Client = Object.assign<Client, Partial<Client>>(new Client(), {
    jwksUri: new URL('https://client.example.com/oidc/jwks'),
    jwks: null,
  });

  const jwksClient: Client = Object.assign<Client, Partial<Client>>(new Client(), {
    jwksUri: null,
    jwks: jsonWebKeySetParameters,
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should throw when failing to parse the Client's JSON Web Key Set from its JSON Web Key Set URI.", async () => {
    const streamMock = new PassThrough();

    const cause = new Error('Network Error.');
    const error = new InvalidClientError('Could not load the JSON Web Key Set of the Client.', { cause });

    jest.spyOn(https, 'get').mockImplementationOnce((_: any, callback: any) => {
      callback(streamMock);

      streamMock.write(Buffer.from('{', 'utf8'));
      streamMock.end();

      return { on: jest.fn(), end: jest.fn() } as unknown as ClientRequest;
    });

    await expect(getClientJsonWebKey(jwksUriClient, () => true)).rejects.toThrowWithMessage(
      InvalidClientError,
      error.description,
    );
  });

  it('should return null when the Client has no JSON Web Key Set.', async () => {
    await expect(getClientJsonWebKey(new Client(), () => true)).rejects.toThrowWithMessage(
      InvalidClientError,
      'The Client does not have a registered JSON Web Key Set.',
    );
  });

  it.each([jwksUriClient, jwksClient])(
    "should throw when failing to obtain a JSON Web Key from the Client's JSON Web Key Set.",
    async (client) => {
      const streamMock = new PassThrough();

      jest.spyOn(https, 'get').mockImplementationOnce((_: any, callback: any) => {
        callback(streamMock);

        streamMock.write(Buffer.from(jsonStringify(jsonWebKeySetParameters), 'utf8'));
        streamMock.end();

        return { on: jest.fn(), end: jest.fn() } as unknown as ClientRequest;
      });

      await expect(getClientJsonWebKey(client, () => false)).rejects.toThrowWithMessage(
        InvalidClientError,
        'Failed to obtain a valid JSON Web Key from the Client.',
      );
    },
  );

  it.each([jwksUriClient, jwksClient])(
    "should return a JSON Web Key from the Client's JSON Web Key Set that satisfies the provided predicate.",
    async (client) => {
      let jsonWebKey!: JsonWebKey;

      const streamMock = new PassThrough();

      jest.spyOn(https, 'get').mockImplementationOnce((_: any, callback: any) => {
        callback(streamMock);

        streamMock.write(Buffer.from(jsonStringify(jsonWebKeySetParameters), 'utf8'));
        streamMock.end();

        return { on: jest.fn(), end: jest.fn() } as unknown as ClientRequest;
      });

      await expect(async () => {
        jsonWebKey = await getClientJsonWebKey(client, () => true);
      }).resolves.not.toThrow();

      expect(jsonWebKey).toBeInstanceOf(JsonWebKey);
      expect(jsonWebKey.parameters).toStrictEqual(jsonWebKeyParameters);
    },
  );
});
