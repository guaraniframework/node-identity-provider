/* istanbul ignore file */
import { URL } from 'url';

import {
  AbstractConstructor,
  Constructor,
  DependencyInjectionContainer,
  Factory,
  getContainer,
  InjectableToken,
} from '@guarani/di';
import { isNonEmptyString } from '@guarani/primitives';

import { ClientAuthentication } from '../client-authentication/client-authentication';
import { clientAuthenticationRegistry } from '../client-authentication/client-authentication.registry';
import { DEFAULT_MINIMUM_MAX_AGE } from '../constants';
import { DataAccess } from '../data-access/data-access';
import { Display } from '../displays/display';
import { displayRegistry } from '../displays/display.registry';
import { AuthorizationEndpoint } from '../endpoints/authorization/authorization.endpoint';
import { InteractionEndpoint } from '../endpoints/interaction/interaction.endpoint';
import { ClientAuthenticationHandler } from '../handlers/client-authentication/client-authentication.handler';
import { IdTokenHandler } from '../handlers/id-token/id-token.handler';
import { ScopeHandler } from '../handlers/scope/scope.handler';
import { InteractionType } from '../interaction-types/interaction-type';
import { interactionTypeRegistry } from '../interaction-types/interaction-type.registry';
import { Logger } from '../logger/logger';
import { Pkce } from '../pkce/pkce';
import { pkceRegistry } from '../pkce/pkce.registry';
import { IdentityProvider } from '../providers/identity-provider';
import { ResponseMode } from '../response-modes/response-mode';
import { responseModeRegistry } from '../response-modes/response-mode.registry';
import { ResponseType } from '../response-types/response-type';
import { responseTypeRegistry } from '../response-types/response-type.registry';
import { ResponseTypeName } from '../response-types/response-type-name.type';
import { Settings } from '../settings/settings';
import { SETTINGS } from '../settings/settings.token';
import { SubjectType } from '../subject-types/subject-type';
import { subjectTypeRegistry } from '../subject-types/subject-type.registry';
import { AuthorizationRequestValidator } from '../validators/authorization/authorization-request.validator';
import { authorizationRequestValidatorRegistry } from '../validators/authorization/authorization-request-validator.registry';
import { ContextInteractionRequestValidator } from '../validators/interaction/context/context.interaction-request.validator';
import { contextInteractionRequestValidatorRegistry } from '../validators/interaction/context/context-interaction-request-validator.registry';
import { DecisionInteractionRequestValidator } from '../validators/interaction/decision/decision.interaction-request.validator';
import { decisionInteractionRequestValidatorRegistry } from '../validators/interaction/decision/decision-interaction-request-validator.registry';
import { IdentityProviderOptions } from './options/identity-provider.options';
import { CONTAINER } from './container.token';

type IdentityProviderEntry<T> = Constructor<T> | Factory<T> | T;

/**
 * Factory class used to configure and instantiate an Identity Provider.
 */
export class IdentityProviderFactory {
  /**
   * Dependency Injection Container of the Identity Provider.
   */
  private readonly container: DependencyInjectionContainer;

  /**
   * Identity Provider Options.
   */
  private readonly options = {} as IdentityProviderOptions;

  /**
   * Instantiates a new Identity Provider Factory.
   */
  public constructor() {
    this.container = getContainer(CONTAINER);
  }

  /**
   * Configures the options of the Identity Provider.
   *
   * @param callback Callback function used to configure the Identity Provider Options.
   * @returns Identity Provider Factory.
   */
  public configure(callback: (options: IdentityProviderOptions) => void): IdentityProviderFactory {
    callback(this.options);
    return this;
  }

  /**
   * Adds the provided Data Access to the Identity Provider.
   *
   * @param dataAccess Data Access to be added.
   * @throws {TypeError} The provided Data Access is invalid.
   * @returns Identity Provider Factory.
   */
  public addDataAccess(dataAccess: IdentityProviderEntry<DataAccess>): IdentityProviderFactory {
    this.container.delete(DataAccess);
    this.addContainerEntry(DataAccess, dataAccess);
    return this;
  }

  /**
   * Adds the provided Logger to the Identity Provider.
   *
   * @param logger Logger to be added.
   * @throws {TypeError} The provided Logger is invalid.
   * @returns Identity Provider Factory.
   */
  public addLogger(logger: IdentityProviderEntry<Logger>): IdentityProviderFactory {
    this.container.delete(Logger);
    this.addContainerEntry(Logger, logger);
    return this;
  }

  /**
   * Adds the provided Entry under the provided Token to the Identity Provider.
   *
   * @param token Token of the Entry.
   * @param entry Entry to be added.
   * @throws {TypeError} One of the provided arguments is invalid.
   * @returns Identity Provider Factory.
   */
  public add<T>(token: InjectableToken<T>, entry?: IdentityProviderEntry<T>): IdentityProviderFactory {
    if (!isNonEmptyString(token) && typeof token !== 'symbol' && !this._isClass(token)) {
      throw new TypeError('The provided Token is invalid.');
    }

    this.container.delete(token);
    this.addContainerEntry(token, entry);
    return this;
  }

  /**
   * Creates a new instance of the provided Identity Provider.
   *
   * @param provider Identity Provider Constructor.
   * @throws {TypeError} The provided Identity Provider is invalid.
   * @returns Instance of Identity Provider.
   */
  public create(provider?: Constructor<IdentityProvider>): IdentityProvider {
    if (typeof provider !== 'undefined' && !this._inherits(provider?.prototype, IdentityProvider)) {
      throw new TypeError('The provided Identity Provider is invalid.');
    }

    this.resolveOptions();

    this.addContainerEntry(IdentityProvider, provider);
    this.addContainerEntry(DependencyInjectionContainer, this.container);

    return this.container.resolve(IdentityProvider);
  }

  /**
   * Resolves the Identity Provider Options provided by the Application.
   */
  private resolveOptions(): void {
    const settings = this.setIdentityProviderSettings();

    this.setClientAuthenticationMethods(settings);
    this.setDisplays(settings);
    this.setEndpoints(settings);
    this.setHandlers(settings);
    this.setInteractionTypes();
    this.setPkces(settings);
    this.setResponseModes(settings);
    this.setResponseTypes(settings);
    this.setSubjectTypes(settings);
    this.setValidators(settings);
  }

  /**
   * Defines the Identity Provider Settings based on the provided Identity Provider Options.
   *
   * @returns Identity Provider Settings.
   */
  private setIdentityProviderSettings(): Settings {
    const settings = {
      issuer: new URL(this.options.issuer),
      scopes: this.options.scopes,
      clientAuthenticationMethods: this.options.clientAuthenticationMethods ?? ['client_secret_basic'],
      responseTypes: this.options.responseTypes ?? ['code', 'id_token', 'id_token token'],
      responseModes: this.options.responseModes ?? ['fragment', 'query'],
      pkces: this.options.pkces ?? ['S256'],
      displays: this.options.displays ?? ['page', 'popup'],
      acrValues: this.options.acrValues ?? [],
      uiLocales: this.options.uiLocales ?? [],
      subjectTypes: this.options.subjectTypes ?? ['public'],
      idTokenSignatureAlgorithms: this.options.idTokenSignatureAlgorithms ?? ['RS256'],
      idTokenKeyWrapAlgorithms: this.options.idTokenKeyWrapAlgorithms,
      idTokenContentEncryptionAlgorithms: this.options.idTokenContentEncryptionAlgorithms,
      interactions: {
        errorUrl: new URL(this.options.interactions.errorUrl),
        registrationUrl: new URL(this.options.interactions.registrationUrl),
        accountSelectionUrl: new URL(this.options.interactions.accountSelectionUrl),
        loginUrl: new URL(this.options.interactions.loginUrl),
        consentUrl: new URL(this.options.interactions.consentUrl),
      },
      minimumMaxAge: this.options.minimumMaxAge ?? DEFAULT_MINIMUM_MAX_AGE,
      enableAuthorizationResponseIssuerIdentifier: this.options.enableAuthorizationResponseIssuerIdentifier ?? false,
      secretKey: this.options.secretKey,
    } as Settings;

    this.addContainerEntry<Settings>(SETTINGS, settings);
    return settings;
  }

  /**
   * Defines the Client Authentication Methods of the Identity Provider.
   *
   * @param settings Settings of the Identity Provider.
   */
  private setClientAuthenticationMethods(settings: Settings): void {
    const { clientAuthenticationMethods } = settings;

    clientAuthenticationMethods.forEach((clientAuthentication) =>
      this.addContainerEntry(ClientAuthentication, clientAuthenticationRegistry[clientAuthentication]),
    );
  }

  /**
   * Defines the Displays of the Identity Provider.
   *
   * @param settings Settings of the Identity Provider.
   */
  private setDisplays(settings: Settings): void {
    const { displays } = settings;

    displays.forEach((display) => {
      this.addContainerEntry(Display, displayRegistry[display]);
    });
  }

  /**
   * Defines the Endpoints of the Identity Provider.
   *
   * @param settings Settings of the Identity Provider.
   */
  private setEndpoints(_settings: Settings): void {
    this.addContainerEntry(AuthorizationEndpoint);
    this.addContainerEntry(InteractionEndpoint);
  }

  /**
   * Defines the Handlers of the Identity Provider.
   *
   * @param settings Settings of the Identity Provider.
   */
  private setHandlers(_settings: Settings): void {
    this.addContainerEntry(ClientAuthenticationHandler);
    this.addContainerEntry(IdTokenHandler);
    this.addContainerEntry(ScopeHandler);
  }

  /**
   * Defines the Interaction Types of the Identity Provider.
   */
  private setInteractionTypes(): void {
    Object.values(interactionTypeRegistry).forEach((interactionType) => {
      this.addContainerEntry(InteractionType, interactionType);
    });
  }

  /**
   * Defines the PKCEs of the Identity Provider.
   *
   * @param settings Settings of the Identity Provider.
   */
  private setPkces(settings: Settings): void {
    const { pkces } = settings;

    pkces.forEach((pkce) => {
      this.addContainerEntry(Pkce, pkceRegistry[pkce]);
    });
  }

  /**
   * Defines the Response Modes of the Identity Provider.
   *
   * @param settings Settings of the Identity Provider.
   */
  private setResponseModes(settings: Settings): void {
    const { responseModes } = settings;

    responseModes.forEach((responseMode) => {
      this.addContainerEntry(ResponseMode, responseModeRegistry[responseMode]);
    });
  }

  /**
   * Defines the Response Types of the Identity Provider.
   *
   * @param settings Settings of the Identity Provider.
   */
  private setResponseTypes(settings: Settings): void {
    const { responseTypes } = settings;

    responseTypes.forEach((responseType) => {
      this.addContainerEntry(ResponseType, responseTypeRegistry[responseType]);
    });
  }

  /**
   * Defines the Subject Types of the Identity Provider.
   *
   * @param settings Settings of the Identity Provider.
   */
  private setSubjectTypes(settings: Settings): void {
    const { subjectTypes } = settings;

    subjectTypes.forEach((subjectType) => {
      this.addContainerEntry(SubjectType, subjectTypeRegistry[subjectType]);
    });
  }

  /**
   * Defines the Validators of the Identity Provider.
   *
   * @param settings Settings of the Identity Provider.
   */
  private setValidators(settings: Settings): void {
    Object.entries(authorizationRequestValidatorRegistry)
      .filter(([name]) => settings.responseTypes.includes(name as ResponseTypeName))
      .map(([, validator]) => validator)
      .forEach((validator) => this.addContainerEntry(AuthorizationRequestValidator, validator));

    Object.values(contextInteractionRequestValidatorRegistry).forEach((validator) => {
      this.addContainerEntry(ContextInteractionRequestValidator, validator);
    });

    Object.values(decisionInteractionRequestValidatorRegistry).forEach((validator) => {
      this.addContainerEntry(DecisionInteractionRequestValidator, validator);
    });
  }

  /**
   * Adds the provided Entry under the provided Token to the Identity Provider.
   *
   * @param token Token of the Entry.
   * @param entry Entry to be added.
   * @throws {TypeError} One of the provided arguments is invalid.
   */
  private addContainerEntry<T>(token: InjectableToken<T>, entry?: IdentityProviderEntry<T>): void {
    const binding = this.container.bind(token);

    switch (true) {
      case this._isClass<T>(entry):
        if (this._isClass(token) && (token === entry || !this._inherits(entry.prototype, token))) {
          throw new TypeError(`The class "${entry.name}" does not inherit from the Token "${token.name}".`);
        }

        binding.toClass(entry).asSingleton();
        break;

      case this._isFactory<T>(entry):
        binding.toFactory(entry);
        break;

      case typeof entry === 'undefined':
        if (!this._isClass(token)) {
          throw new TypeError('The provided Token is not a valid class.');
        }

        binding.toSelf().asSingleton();
        break;

      default:
        if (this._isClass(token) && !this._inherits(entry, token)) {
          throw new TypeError(
            `The object "${entry?.constructor?.name}" does not inherit from the Token "${token.name}".`,
          );
        }

        binding.toValue(entry);
        break;
    }
  }

  private _isClass<T>(data: unknown): data is AbstractConstructor<T> | Constructor<T> {
    return typeof data === 'function' && 'prototype' in data;
  }

  private _isFactory<T>(data: unknown): data is Factory<T> {
    return typeof data === 'function' && !('prototype' in data);
  }

  private _inherits<T>(entry: T, token: AbstractConstructor<T> | Constructor<T>): boolean {
    return entry === token || entry instanceof token;
  }
}
