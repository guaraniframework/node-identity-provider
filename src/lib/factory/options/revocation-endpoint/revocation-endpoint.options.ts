import { DependencyInjectionContainer } from '@guarani/di';
import { isNonEmptyString } from '@guarani/primitives';

import { ClientAuthentication } from '../../../client-authentication/client-authentication';
import { CLIENT_AUTHENTICATION_REGISTRY } from '../../../client-authentication/client-authentication.registry';
import { ClientAuthenticationName } from '../../../client-authentication/client-authentication-name.type';
import { REVOCATION_CLIENT_AUTHENTICATION } from '../../../constants';
import { Endpoint } from '../../../endpoints/endpoint';
import { RevocationEndpoint } from '../../../endpoints/revocation/revocation.endpoint';
import { RevocationValidator } from '../../../validators/revocation/revocation.validator';

/**
 * Allows the Configuration of the Revocation Endpoint.
 */
export class RevocationEndpointOptions {
  /**
   * Requested Client Authentication Methods.
   */
  private methods: ClientAuthenticationName[] = ['client_secret_basic'];

  /**
   * Instantiates a new Revocation Endpoint Configuration.
   *
   * @param container Dependency Injection Container of the Identity Provider.
   */
  public constructor(private readonly container: DependencyInjectionContainer) {}

  /**
   * Instructs the Identity Provider Factory to register the requested Client Authentication Methods.
   *
   * @param methods Requested Client Authentication Methods.
   * @throws {TypeError} The provided Client Authentication Methods is invalid.
   * @returns Revocation Endpoint Configuration.
   */
  public useClientAuthenticationMethods(methods: ClientAuthenticationName[]): RevocationEndpointOptions {
    if (
      !Array.isArray(methods) ||
      methods.some((method) => !isNonEmptyString(method) || !(method in CLIENT_AUTHENTICATION_REGISTRY))
    ) {
      throw new TypeError('The provided Client Authentication Methods is invalid.');
    }

    if (methods.length !== 0) {
      this.methods = methods;
    }

    return this;
  }

  /**
   * Registers the requested Revocation Endpoint actors into the Identity Provider Factory.
   *
   * @throws {TypeError} Failed to build the Revocation Endpoint Options.
   */
  public build(): void {
    this.container.delete<ClientAuthentication>(REVOCATION_CLIENT_AUTHENTICATION);
    this.container.delete(RevocationValidator);

    this.container.bind(Endpoint).toClass(RevocationEndpoint).asSingleton();

    this.container.bind(RevocationValidator).toSelf().asSingleton();

    this.methods.forEach((method) => {
      this.container
        .bind<ClientAuthentication>(REVOCATION_CLIENT_AUTHENTICATION)
        .toClass(CLIENT_AUTHENTICATION_REGISTRY[method])
        .asSingleton();
    });
  }
}
