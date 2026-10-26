import { DependencyInjectionContainer } from '@guarani/di';
import { isNonEmptyString } from '@guarani/primitives';

import { Display } from '../../../displays/display';
import { DISPLAY_REGISTRY } from '../../../displays/display.registry';
import { DisplayName } from '../../../displays/display-name.type';
import { AuthorizationEndpoint } from '../../../endpoints/authorization/authorization.endpoint';
import { Endpoint } from '../../../endpoints/endpoint';
import { PKCE } from '../../../pkces/pkce';
import { PKCE_REGISTRY } from '../../../pkces/pkce.registry';
import { PKCEName } from '../../../pkces/pkce-name.type';
import { ResponseMode } from '../../../response-modes/response-mode';
import { RESPONSE_MODE_REGISTRY } from '../../../response-modes/response-mode.registry';
import { ResponseModeName } from '../../../response-modes/response-mode-name.type';
import { ResponseType } from '../../../response-types/response-type';
import { RESPONSE_TYPE_REGISTRY } from '../../../response-types/response-type.registry';
import { ResponseTypeName } from '../../../response-types/response-type-name.type';
import { AuthorizationValidator } from '../../../validators/authorization/authorization.validator';
import { AUTHORIZATION_VALIDATOR_REGISTRY } from '../../../validators/authorization/authorization.validator.registry';

/**
 * Allows the Configuration of the Authorization Endpoint.
 */
export class AuthorizationEndpointOptions {
  /**
   * Requested Displays.
   */
  private displays: DisplayName[] = ['page'];

  /**
   * Requested PKCEs.
   */
  private pkces: PKCEName[] = ['S256'];

  /**
   * Requested Response Modes.
   */
  private responseModes: ResponseModeName[] = ['query'];

  /**
   * Requested Response Types.
   */
  private responseTypes: ResponseTypeName[] = ['code'];

  /**
   * Required Response Types.
   */
  readonly #requiredResponseTypes: ResponseTypeName[] = ['code'];

  /**
   * Instantiates a new Authorization Endpoint Configuration.
   *
   * @param container Dependency Injection Container of the Identity Provider.
   */
  public constructor(private readonly container: DependencyInjectionContainer) {}

  /**
   * Instructs the Identity Provider Factory to register the requested Displays.
   *
   * @param displays Requested Displays.
   * @throws {TypeError} The provided Displays is invalid.
   * @returns Authorization Endpoint Configuration.
   */
  public useDisplays(displays: DisplayName[]): AuthorizationEndpointOptions {
    if (
      !Array.isArray(displays) ||
      displays.some((display) => !isNonEmptyString(display) || !(display in DISPLAY_REGISTRY))
    ) {
      throw new TypeError('The provided Displays is invalid.');
    }

    if (displays.length !== 0) {
      this.displays = displays;
    }

    return this;
  }

  /**
   * Instructs the Identity Provider Factory to register the requested PKCEs.
   *
   * @param pkces Requested PKCEs.
   * @throws {TypeError} The provided PKCEs is invalid.
   * @returns Authorization Endpoint Configuration.
   */
  public usePKCEs(pkces: PKCEName[]): AuthorizationEndpointOptions {
    if (!Array.isArray(pkces) || pkces.some((pkce) => !isNonEmptyString(pkce) || !(pkce in PKCE_REGISTRY))) {
      throw new TypeError('The provided PKCEs is invalid.');
    }

    if (pkces.length !== 0) {
      this.pkces = pkces;
    }

    return this;
  }

  /**
   * Instructs the Identity Provider Factory to register the requested Response Modes.
   *
   * @param pkces Requested Response Modes.
   * @throws {TypeError} The provided Response Modes is invalid.
   * @returns Authorization Endpoint Configuration.
   */
  public useResponseModes(responseModes: ResponseModeName[]): AuthorizationEndpointOptions {
    if (
      !Array.isArray(responseModes) ||
      responseModes.some((responseMode) => !isNonEmptyString(responseMode) || !(responseMode in RESPONSE_MODE_REGISTRY))
    ) {
      throw new TypeError('The provided Response Modes is invalid.');
    }

    if (responseModes.length !== 0) {
      this.responseModes = responseModes;
    }

    return this;
  }

  /**
   * Instructs the Identity Provider Factory to register the requested Response Types.
   *
   * @param pkces Requested Response Types.
   * @throws {TypeError} The provided Response Types is invalid.
   * @returns Authorization Endpoint Configuration.
   */
  public useResponseTypes(responseTypes: ResponseTypeName[]): AuthorizationEndpointOptions {
    if (
      !Array.isArray(responseTypes) ||
      responseTypes.some((responseType) => !isNonEmptyString(responseType) || !(responseType in RESPONSE_TYPE_REGISTRY))
    ) {
      throw new TypeError('The provided Response Types is invalid.');
    }

    if (responseTypes.length !== 0) {
      this.responseTypes = responseTypes;
    }

    return this;
  }

  /**
   * Registers the requested Authorization Endpoint actors into the Identity Provider Factory.
   *
   * @throws {TypeError} Failed to build the Authorization Endpoint Options.
   */
  public build(): void {
    this.checkRequiredResponseTypes();

    this.container.delete(AuthorizationEndpoint);
    this.container.delete(Display);
    this.container.delete(PKCE);
    this.container.delete(ResponseMode);
    this.container.delete(ResponseType);
    this.container.delete(AuthorizationValidator);

    this.container.bind(Endpoint).toClass(AuthorizationEndpoint).asSingleton();

    this.displays.forEach((display) => {
      this.container.bind(Display).toClass(DISPLAY_REGISTRY[display]).asSingleton();
    });

    this.pkces.forEach((pkce) => {
      this.container.bind(PKCE).toClass(PKCE_REGISTRY[pkce]).asSingleton();
    });

    this.responseModes.forEach((responseMode) => {
      this.container.bind(ResponseMode).toClass(RESPONSE_MODE_REGISTRY[responseMode]).asSingleton();
    });

    this.responseTypes.forEach((responseType) => {
      this.container.bind(ResponseType).toClass(RESPONSE_TYPE_REGISTRY[responseType]).asSingleton();
    });

    this.responseTypes.forEach((responseType) => {
      this.container.bind(AuthorizationValidator).toClass(AUTHORIZATION_VALIDATOR_REGISTRY[responseType]).asSingleton();
    });
  }

  private checkRequiredResponseTypes(): void {
    this.#requiredResponseTypes.forEach((requiredResponseType) => {
      if (!this.responseTypes.includes(requiredResponseType)) {
        throw new TypeError(`Missing required Response Type "${requiredResponseType}".`);
      }
    });
  }
}
