/**
 * Token that represents the instance of the Dependency Injection Container used by the Identity Provider.
 */
export const CONTAINER: symbol = Symbol('CONTAINER');

/**
 * Default minimum Max Age value in seconds.
 *
 * @default 7,776,000 (90 days)
 */
export const DEFAULT_MINIMUM_MAX_AGE: number = 7_776_000;

/**
 * Default Session Cookie.
 *
 * @default "guarani"
 */
export const DEFAULT_SESSION_COOKIE: string = 'guarani';
