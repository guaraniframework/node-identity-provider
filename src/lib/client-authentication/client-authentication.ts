import { Client } from '../entities/client';
import { HttpRequest } from '../http/request/http-request';
import { ClientAuthenticationName } from './client-authentication-name.type';

/**
 * The Client Authentication is used to authenticate a Client during a Request
 * using one of the supported Client Authentication Methods.
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
   * @throws {InvalidClientError} Failed to authenticate the Client.
   * @throws {InvalidRequestError} One of the provided parameters is invalid.
   * @returns Authenticated Client.
   */
  public abstract getClient(request: HttpRequest): Promise<Client>;
}
