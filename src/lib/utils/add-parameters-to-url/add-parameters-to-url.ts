import { ParsedUrlQueryInput, stringify as stringifyQs } from 'querystring';
import { URL } from 'url';

import { removeNullishValues } from '@guarani/primitives';

/**
 * Populates the provided URL with the provided Parameters.
 *
 * @param url URL to be populated.
 * @param parameters Parameters used to populate the URL.
 * @param location Indicates if the Parameters will be placed at the query or the fragment of the URL.
 * @returns Populated URL.
 */
export function addParametersToUrl(
  url: URL,
  parameters: NodeJS.Dict<unknown>,
  location: 'search' | 'hash' = 'search',
): URL {
  const result = new URL(url.href);

  result[location] +=
    (result[location].length === 0 ? '' : '&') + stringifyQs(removeNullishValues(parameters) as ParsedUrlQueryInput);

  return result;
}
