import { ParsedUrlQueryInput, stringify as stringifyQs } from 'querystring';
import { URL } from 'url';

import { isNonEmptyString, removeNullishValues } from '@guarani/primitives';

/**
 * Populates the provided URL with the provided Parameters.
 *
 * @param url URL to be populated.
 * @param parameters Parameters used to populate the URL.
 * @param location Indicates if the Parameters will be placed at the query or the hash of the URL.
 * @returns Populated URL.
 */
export function addParametersToUrl<T extends ParsedUrlQueryInput>(
  url: string | URL,
  parameters: T,
  location: 'search' | 'hash' = 'search',
): URL {
  const result = new URL(url);
  result[location] += (!isNonEmptyString(result[location]) ? '' : '&') + stringifyQs(removeNullishValues(parameters));
  return result;
}
