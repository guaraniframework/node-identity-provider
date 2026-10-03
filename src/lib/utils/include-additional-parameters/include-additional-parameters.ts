import { removeNullishValues } from '@guarani/primitives';

/**
 * Includes the provided Parameters in the provided Object.
 *
 * @param obj Object being augmented.
 * @param parameters Parameters to be added to the provided Object.
 * @returns Augmented Object.
 */
export function includeAdditionalParameters<T extends NodeJS.Dict<unknown>>(obj: T, parameters: Partial<T>): T {
  Object.entries(parameters).forEach(([name, value]) => {
    Reflect.set(obj, name, value);
  });

  return removeNullishValues(obj);
}
