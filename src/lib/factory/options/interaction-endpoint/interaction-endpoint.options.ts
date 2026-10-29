import { Constructor, DependencyInjectionContainer } from '@guarani/di';
import { isNonEmptyString } from '@guarani/primitives';

import { ClientAuthentication } from '../../../client-authentication/client-authentication';
import { CLIENT_AUTHENTICATION_REGISTRY } from '../../../client-authentication/client-authentication.registry';
import { ClientAuthenticationName } from '../../../client-authentication/client-authentication-name.type';
import { INTERACTION_CLIENT_AUTHENTICATION } from '../../../constants';
import { Endpoint } from '../../../endpoints/endpoint';
import { InteractionEndpoint } from '../../../endpoints/interaction/interaction.endpoint';
import { InteractionType } from '../../../interaction-types/interaction-type';
import { INTERACTION_TYPE_REGISTRY } from '../../../interaction-types/interaction-type.registry';
import { InteractionTypeName } from '../../../interaction-types/interaction-type-name.type';
import { ContextInteractionValidator } from '../../../validators/interaction/context/context-interaction.validator';
import { CONTEXT_INTERACTION_VALIDATOR_REGISTRY } from '../../../validators/interaction/context/context-interaction.validator.registry';
import { DecisionInteractionValidator } from '../../../validators/interaction/decision/decision-interaction.validator';
import { DECISION_INTERACTION_VALIDATOR_REGISTRY } from '../../../validators/interaction/decision/decision-interaction.validator.registry';

/**
 * Allows the Configuration of the Interaction Endpoint.
 */
export class InteractionEndpointOptions {
  /**
   * Requested Client Authentication Methods.
   */
  private methods: ClientAuthenticationName[] = ['client_secret_basic'];

  /**
   * Instantiates a new Interaction Endpoint Configuration.
   *
   * @param container Dependency Injection Container of the Identity Provider.
   */
  public constructor(private readonly container: DependencyInjectionContainer) {}

  /**
   * Instructs the Identity Provider Factory to register the requested Client Authentication Methods.
   *
   * @param methods Requested Client Authentication Methods.
   * @throws {TypeError} The provided Client Authentication Methods is invalid.
   * @returns Interaction Endpoint Configuration.
   */
  public useClientAuthenticationMethods(methods: ClientAuthenticationName[]): InteractionEndpointOptions {
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
   * Registers the requested Interaction Endpoint actors into the Identity Provider Factory.
   *
   * @throws {TypeError} Failed to build the Interaction Endpoint Options.
   */
  public build(): void {
    this.container.delete(InteractionType);
    this.container.delete(INTERACTION_CLIENT_AUTHENTICATION);
    this.container.delete(ContextInteractionValidator);
    this.container.delete(DecisionInteractionValidator);

    this.container.bind(Endpoint).toClass(InteractionEndpoint).asSingleton();

    (Object.entries(INTERACTION_TYPE_REGISTRY) as [InteractionTypeName, Constructor<InteractionType>][]).forEach(
      ([name, interactionType]) => {
        this.container.bind(InteractionType).toClass(interactionType).asSingleton();

        this.container
          .bind(ContextInteractionValidator)
          .toClass(CONTEXT_INTERACTION_VALIDATOR_REGISTRY[name])
          .asSingleton();

        this.container
          .bind(DecisionInteractionValidator)
          .toClass(DECISION_INTERACTION_VALIDATOR_REGISTRY[name])
          .asSingleton();
      },
    );

    this.methods.forEach((method) => {
      this.container
        .bind<ClientAuthentication>(INTERACTION_CLIENT_AUTHENTICATION)
        .toClass(CLIENT_AUTHENTICATION_REGISTRY[method])
        .asSingleton();
    });
  }
}
