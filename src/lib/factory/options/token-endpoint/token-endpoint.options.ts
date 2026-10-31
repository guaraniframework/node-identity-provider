import { DependencyInjectionContainer } from '@guarani/di';
import { isNonEmptyString } from '@guarani/primitives';

import { ClientAuthentication } from '../../../client-authentication/client-authentication';
import { CLIENT_AUTHENTICATION_REGISTRY } from '../../../client-authentication/client-authentication.registry';
import { ClientAuthenticationName } from '../../../client-authentication/client-authentication-name.type';
import { TOKEN_CLIENT_AUTHENTICATION } from '../../../constants';
import { Endpoint } from '../../../endpoints/endpoint';
import { TokenEndpoint } from '../../../endpoints/token/token.endpoint';
import { GrantType } from '../../../grant-types/grant-type';
import { GRANT_TYPE_REGISTRY } from '../../../grant-types/grant-type.registry';
import { GrantTypeName } from '../../../grant-types/grant-type-name.type';
import { TokenValidator } from '../../../validators/token/token.validator';
import { TOKEN_VALIDATOR_REGISTRY } from '../../../validators/token/token.validator.registry';

/**
 * Allows the Configuration of the Token Endpoint.
 */
export class TokenEndpointOptions {
  /**
   * Requested Client Authentication Methods.
   */
  private methods: ClientAuthenticationName[] = ['client_secret_basic'];

  /**
   * Requested Grant Types.
   */
  private grantTypes: GrantTypeName[] = ['authorization_code'];

  /**
   * Required Grant Types.
   */
  readonly #requiredGrantTypes: GrantTypeName[] = ['authorization_code'];

  /**
   * Instantiates a new Token Endpoint Configuration.
   *
   * @param container Dependency Injection Container of the Identity Provider.
   */
  public constructor(private readonly container: DependencyInjectionContainer) {}

  /**
   * Instructs the Identity Provider Factory to register the requested Client Authentication Methods.
   *
   * @param methods Requested Client Authentication Methods.
   * @throws {TypeError} The provided Client Authentication Methods is invalid.
   * @returns Token Endpoint Configuration.
   */
  public useClientAuthenticationMethods(methods: ClientAuthenticationName[]): TokenEndpointOptions {
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
   * Instructs the Identity Provider Factory to register the requested Grant Types.
   *
   * @param grantTypes Requested Grant Types.
   * @throws {TypeError} The provided Grant Types is invalid.
   * @returns Token Endpoint Configuration.
   */
  public useGrantTypes(grantTypes: GrantTypeName[]): TokenEndpointOptions {
    if (
      !Array.isArray(grantTypes) ||
      grantTypes.some((grantType) => !isNonEmptyString(grantType) || !(grantType in GRANT_TYPE_REGISTRY))
    ) {
      throw new TypeError('The provided Grant Types is invalid.');
    }

    if (grantTypes.length !== 0) {
      this.grantTypes = grantTypes;
    }

    return this;
  }

  /**
   * Registers the requested Token Endpoint actors into the Identity Provider Factory.
   *
   * @throws {TypeError} Failed to build the Token Endpoint Options.
   */
  public build(): void {
    this.checkRequiredGrantTypes();

    this.container.delete<ClientAuthentication>(TOKEN_CLIENT_AUTHENTICATION);
    this.container.delete(GrantType);
    this.container.delete(TokenValidator);

    this.container.bind(Endpoint).toClass(TokenEndpoint).asSingleton();

    this.methods.forEach((method) => {
      this.container
        .bind<ClientAuthentication>(TOKEN_CLIENT_AUTHENTICATION)
        .toClass(CLIENT_AUTHENTICATION_REGISTRY[method])
        .asSingleton();
    });

    this.grantTypes.forEach((grantType) => {
      this.container.bind(GrantType).toClass(GRANT_TYPE_REGISTRY[grantType]).asSingleton();
    });

    this.grantTypes.forEach((grantType) => {
      this.container.bind(TokenValidator).toClass(TOKEN_VALIDATOR_REGISTRY[grantType]).asSingleton();
    });
  }

  private checkRequiredGrantTypes(): void {
    this.#requiredGrantTypes.forEach((requiredGrantType) => {
      if (!this.grantTypes.includes(requiredGrantType)) {
        throw new TypeError(`Missing required Grant Type "${requiredGrantType}".`);
      }
    });
  }
}
