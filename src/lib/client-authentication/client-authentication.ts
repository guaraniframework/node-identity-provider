import { Client } from '../entities/client';
import { HttpRequest } from '../http/request/http-request';
import { ClientAuthenticationName } from './client-authentication-name.type';

/**
 * Base class of a Client Authentication Method.
 */
export abstract class ClientAuthentication {
  /**
   * Name of the Client Authentication Method.
   */
  public abstract readonly name: ClientAuthenticationName;

  /**
   * Checks if the Client Authentication Method has been requested by the Client.
   *
   * @param request Http Request.
   * @returns Whether or not the Client Authentication Method has been requested.
   */
  public abstract hasBeenRequested(request: HttpRequest): boolean;

  /**
   * Authenticates and returns the Client of the Request.
   *
   * @param request Http Request.
   * @throws {InvalidRequestError} One of the provided parameters is invalid.
   * @throws {InvalidClientError} Failed to authenticate the Client.
   * @returns Authenticated Client.
   */
  public abstract getClient(request: HttpRequest): Promise<Client>;
}
