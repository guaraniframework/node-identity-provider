import { HttpRequest } from '../http/request/http-request';

/**
 * Base class of an Http Request Validator.
 */
export abstract class Validator<TContext extends NodeJS.Dict<any>> {
  /**
   * Validates the Http Request and returns the actors of the Request Context.
   *
   * @param request Http Request.
   * @throws {IdentityProviderError} Failed to validate the Http Request.
   * @returns Request Context.
   */
  public abstract validate(request: HttpRequest): Promise<TContext>;
}
