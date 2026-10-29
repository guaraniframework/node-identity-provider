import https from 'https';
import { text } from 'stream/consumers';

import { JsonWebKey, JsonWebKeyParameters, JsonWebKeySet, jwks } from '@guarani/jose';
import { isPlainObject, jsonParse } from '@guarani/primitives';

import { Client } from '../../entities/client';
import { InvalidClientError } from '../../errors/invalid-client/invalid-client.error';

/**
 * Fetches the JSON Web Key Set of the Client hosted at the provided URI.
 *
 * @param jwksUri URI of the JSON Web Key Set of the Client.
 * @throws {InvalidClientError} Failed to obtain a JSON Web Key Set from the Client's JSON Web Key Set URI.
 * @returns JSON Web Key Set of the Client.
 */
function getClientJwksFromUri(jwksUri: string | URL): Promise<JsonWebKeySet> {
  return new Promise((resolve, reject) => {
    https.get(jwksUri, async (response) => {
      const jsonWebKeySetParametersString = await text(response);

      try {
        resolve(await jwks.create(jsonParse(jsonWebKeySetParametersString)));
      } catch (error: unknown) {
        reject(new InvalidClientError('Could not load the JSON Web Key Set of the Client.', { cause: error }));
      }
    });
  });
}

/**
 * Gets a JSON Web Key from the Client's JSON Web Key Set.
 *
 * @param client Client requesting authorization.
 * @param predicate Function used to select a JSON Web Key.
 * @throws {InvalidClientError} Failed to get a JSON Web Key from the Client's JSON Web Key Set.
 * @returns JSON Web Key.
 */
export async function getClientJsonWebKey(
  client: Client,
  predicate: (key: JsonWebKeyParameters) => boolean,
): Promise<JsonWebKey> {
  let jsonWebKeySet: JsonWebKeySet | null = null;

  if (client.jwksUri instanceof URL) {
    jsonWebKeySet = await getClientJwksFromUri(client.jwksUri);
  } else if (isPlainObject(client.jwks)) {
    jsonWebKeySet = await jwks.create(client.jwks);
  }

  if (!(jsonWebKeySet instanceof JsonWebKeySet)) {
    throw new InvalidClientError('The Client does not have a registered JSON Web Key Set.');
  }

  const jsonWebKey = jsonWebKeySet.find(predicate);

  if (!(jsonWebKey instanceof JsonWebKey)) {
    throw new InvalidClientError('Failed to obtain a valid JSON Web Key from the Client.');
  }

  return jsonWebKey;
}
