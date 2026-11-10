import { DependencyInjectionContainer } from '@guarani/di';
import { isNonEmptyString } from '@guarani/primitives';

import { ClientAuthentication } from '../../../client-authentication/client-authentication';
import { CLIENT_AUTHENTICATION_REGISTRY } from '../../../client-authentication/client-authentication.registry';
import { ClientAuthenticationName } from '../../../client-authentication/client-authentication-name.type';
import { INTROSPECTION_CLIENT_AUTHENTICATION } from '../../../constants';
import { Endpoint } from '../../../endpoints/endpoint';
import { IntrospectionEndpoint } from '../../../endpoints/introspection/introspection.endpoint';
import { IntrospectionValidator } from '../../../validators/introspection/introspection.validator';

/**
 * Allows the Configuration of the Introspection Endpoint.
 */
export class IntrospectionEndpointOptions {
  /**
   * Requested Client Authentication Methods.
   */
  private methods: ClientAuthenticationName[] = ['client_secret_basic'];

  /**
   * Instantiates a new Introspection Endpoint Configuration.
   *
   * @param container Dependency Injection Container of the Identity Provider.
   */
  public constructor(private readonly container: DependencyInjectionContainer) {}

  /**
   * Instructs the Identity Provider Factory to register the requested Client Authentication Methods.
   *
   * @param methods Requested Client Authentication Methods.
   * @throws {TypeError} The provided Client Authentication Methods is invalid.
   * @returns Introspection Endpoint Configuration.
   */
  public useClientAuthenticationMethods(methods: ClientAuthenticationName[]): IntrospectionEndpointOptions {
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
   * Registers the requested Introspection Endpoint actors into the Identity Provider Factory.
   *
   * @throws {TypeError} Failed to build the Introspection Endpoint Options.
   */
  public build(): void {
    this.container.delete<ClientAuthentication>(INTROSPECTION_CLIENT_AUTHENTICATION);
    this.container.delete(IntrospectionValidator);

    this.container.bind(Endpoint).toClass(IntrospectionEndpoint).asSingleton();

    this.container.bind(IntrospectionValidator).toSelf().asSingleton();

    this.methods.forEach((method) => {
      this.container
        .bind<ClientAuthentication>(INTROSPECTION_CLIENT_AUTHENTICATION)
        .toClass(CLIENT_AUTHENTICATION_REGISTRY[method])
        .asSingleton();
    });
  }
}
