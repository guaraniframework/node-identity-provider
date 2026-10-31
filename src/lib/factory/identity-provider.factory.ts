import {
  AbstractConstructor,
  Constructor,
  DependencyInjectionContainer,
  Factory,
  getContainer,
  InjectableToken,
} from '@guarani/di';
import { isNonEmptyString } from '@guarani/primitives';

import { CONTAINER } from '../constants';
import { DataAccess } from '../data-access/data-access';
import { SQLiteDataAccess } from '../data-access/sqlite/sqlite.data-access';
import { AuthorizationEndpoint } from '../endpoints/authorization/authorization.endpoint';
import { Endpoint } from '../endpoints/endpoint';
import { InteractionEndpoint } from '../endpoints/interaction/interaction.endpoint';
import { TokenEndpoint } from '../endpoints/token/token.endpoint';
import { ClientAuthenticationHandler } from '../handlers/client-authentication/client-authentication.handler';
import { IdTokenHandler } from '../handlers/id-token/id-token.handler';
import { ScopeHandler } from '../handlers/scope/scope.handler';
import { IdentityProvider } from '../http/providers/identity-provider';
import { ConsoleLogger } from '../loggers/console/console.logger';
import { Logger } from '../loggers/logger';
import { Settings } from '../settings/settings';
import { SubjectType } from '../subject-types/subject-type';
import { SUBJECT_TYPE_REGISTRY } from '../subject-types/subject-type.registry';
import { SubjectTypeName } from '../subject-types/subject-type-name.type';
import { AuthorizationEndpointOptions } from './options/authorization-endpoint/authorization-endpoint.options';
import { InteractionEndpointOptions } from './options/interaction-endpoint/interaction-endpoint.options';
import { TokenEndpointOptions } from './options/token-endpoint/token-endpoint.options';
import { IdentityProviderFactoryEntry } from './identity-provider-factory.entry';

/**
 * Factory class used to configure and instantiate an Identity Provider.
 */
export class IdentityProviderFactory {
  /**
   * Dependency Injection Container of the Identity Provider.
   */
  private readonly container: DependencyInjectionContainer;

  /**
   * Instantiates a new Identity Provider Factory.
   */
  public constructor() {
    this.container = getContainer(CONTAINER);
    this.container.bind(DependencyInjectionContainer).toValue(this.container);

    this.addDefaultEntries();
  }

  /**
   * Adds the Authorization Endpoint to the Identity Provider.
   *
   * @param callback Callback function used to configure the Authorization Endpoint.
   * @throws {TypeError} Failed to add the Authorization Endpoint.
   * @returns Identity Provider Factory.
   */
  public addAuthorizationEndpoint(callback?: (options: AuthorizationEndpointOptions) => void): IdentityProviderFactory {
    const options = new AuthorizationEndpointOptions(this.container);

    if (typeof callback === 'function') {
      callback(options);
    }

    if (
      !this.container.has(Endpoint) ||
      !(this.container.getAll(Endpoint) as Constructor<Endpoint>[]).includes(AuthorizationEndpoint)
    ) {
      options.build();
    }

    return this;
  }

  /**
   * Adds the provided Data Access to the Identity Provider.
   *
   * @param dataAccess Data Access to be added.
   * @throws {TypeError} The provided Data Access is invalid.
   * @returns Identity Provider Factory.
   */
  public addDataAccess(dataAccess: IdentityProviderFactoryEntry<DataAccess>): IdentityProviderFactory {
    this.container.delete(DataAccess);
    this.addContainerEntry(DataAccess, dataAccess);
    return this;
  }

  /**
   * Adds the Interaction Endpoint to the Identity Provider.
   *
   * @param callback Callback function used to configure the Interaction Endpoint.
   * @throws {TypeError} Failed to add the Interaction Endpoint.
   * @returns Identity Provider Factory.
   */
  public addInteractionEndpoint(callback?: (options: InteractionEndpointOptions) => void): IdentityProviderFactory {
    const options = new InteractionEndpointOptions(this.container);

    if (typeof callback === 'function') {
      callback(options);
    }

    if (
      !this.container.has(Endpoint) ||
      !(this.container.getAll(Endpoint) as Constructor<Endpoint>[]).includes(InteractionEndpoint)
    ) {
      options.build();
    }

    return this;
  }

  /**
   * Adds the Token Endpoint to the Identity Provider.
   *
   * @param callback Callback function used to configure the Token Endpoint.
   * @throws {TypeError} Failed to add the Token Endpoint.
   * @returns Identity Provider Factory.
   */
  public addTokenEndpoint(callback?: (options: TokenEndpointOptions) => void): IdentityProviderFactory {
    const options = new TokenEndpointOptions(this.container);

    if (typeof callback === 'function') {
      callback(options);
    }

    if (
      !this.container.has(Endpoint) ||
      !(this.container.getAll(Endpoint) as Constructor<Endpoint>[]).includes(TokenEndpoint)
    ) {
      options.build();
    }

    return this;
  }

  /**
   * Adds the provided Logger to the Identity Provider.
   *
   * @param logger Logger to be added.
   * @throws {TypeError} The provided Logger is invalid.
   * @returns Identity Provider Factory.
   */
  public addLogger(logger: IdentityProviderFactoryEntry<Logger>): IdentityProviderFactory {
    this.container.delete(Logger);
    this.addContainerEntry(Logger, logger);
    return this;
  }

  /**
   * Adds the provided Settings to the Identity Provider.
   *
   * @param settings Settings to be added.
   * @throws {TypeError} The provided Settings is invalid.
   * @returns Identity Provider Factory.
   */
  public addSettings(settings: Settings | Factory<Settings>): IdentityProviderFactory {
    if (this._isClass(settings)) {
      throw new TypeError('The Settings Entry must be an object or a factory.');
    }

    this.container.delete(Settings);
    this.addContainerEntry(Settings, settings);
    return this;
  }

  /**
   * Adds the provided Subject Types to the Identity Provider.
   *
   * @param subjectTypes Requested Subject Types.
   * @throws {TypeError} The provided Subject Types is invalid.
   * @returns Authorization Endpoint Configuration.
   */
  public addSubjectTypes(subjectTypes: SubjectTypeName[]): IdentityProviderFactory {
    if (
      !Array.isArray(subjectTypes) ||
      subjectTypes.length === 0 ||
      subjectTypes.some((subjectType) => !isNonEmptyString(subjectType) || !(subjectType in SUBJECT_TYPE_REGISTRY))
    ) {
      throw new TypeError('The provided Subject Types is invalid.');
    }

    this.container.delete(SubjectType);

    subjectTypes.forEach((subjectType) => {
      this.container.bind(SubjectType).toClass(SUBJECT_TYPE_REGISTRY[subjectType]).asSingleton();
    });

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
  public add<T>(token: InjectableToken<T>, entry?: IdentityProviderFactoryEntry<T>): IdentityProviderFactory {
    this.container.delete(token);
    this.addContainerEntry(token, entry);
    return this;
  }

  /**
   * Creates a new instance of the provided Identity Provider.
   *
   * @param provider Identity Provider Constructor.
   * @throws {TypeError} The provided Identity Provider Constructor is invalid.
   * @throws {TokenNotRegisteredError} The Token is not registered at the Container.
   * @throws {InvalidProviderError} Attempted to resolve an invalid Provider.
   * @returns Instance of the provided Identity Provider.
   */
  public create<T extends IdentityProvider>(provider: Constructor<T>): T {
    this.checkRequiredEndpoints();

    this.container.delete(IdentityProvider);

    if (!this.container.isRegistered(SubjectType)) {
      this.addSubjectTypes(['public']);
    }

    if ((this.container.get(Settings) as Settings).idTokenSignatureAlgorithms.length !== 0) {
      this.addContainerEntry(IdTokenHandler);
    }

    this.addContainerEntry(IdentityProvider, provider);

    return this.container.resolve(IdentityProvider) as T;
  }

  /**
   * Adds the provided Entry under the provided Token to the Identity Provider.
   *
   * @param token Token of the Entry.
   * @param entry Entry to be added.
   * @throws {TypeError} One of the provided arguments is invalid.
   */
  private addContainerEntry<T>(token: InjectableToken<T>, entry?: IdentityProviderFactoryEntry<T>): void {
    if (!isNonEmptyString(token) && typeof token !== 'symbol' && !this._isClass(token)) {
      throw new TypeError('The provided Token is invalid.');
    }

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
          throw new TypeError(`The Token "${String(token)}" is not a valid class.`);
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

  /**
   * Adds the Default Entries for the necessary dependencies of the Identity Provider
   * where an out-of-the-box implementation is provided.
   */
  private addDefaultEntries(): void {
    this.container.bind(DataAccess).toClass(SQLiteDataAccess).asSingleton();
    this.container.bind(ClientAuthenticationHandler).toSelf().asSingleton();
    this.container.bind(ScopeHandler).toSelf().asSingleton();
    this.container.bind(Logger).toClass(ConsoleLogger).asSingleton();
  }

  private checkRequiredEndpoints(): void {
    const requiredEndpoints: Constructor<Endpoint>[] = [AuthorizationEndpoint, InteractionEndpoint, TokenEndpoint];
    const registeredEndpoints = this.container.getAll(Endpoint) as Constructor<Endpoint>[];

    requiredEndpoints.forEach((requiredEndpoint) => {
      if (!registeredEndpoints.includes(requiredEndpoint)) {
        throw new TypeError(`Missing required Endpoint "${requiredEndpoint.name}".`);
      }
    });
  }

  // #region Helper Methods
  private _isClass<T>(data: unknown): data is AbstractConstructor<T> | Constructor<T> {
    return typeof data === 'function' && 'prototype' in data;
  }

  private _isFactory<T>(data: unknown): data is Factory<T> {
    return typeof data === 'function' && !('prototype' in data);
  }

  private _inherits<T>(entry: T, token: AbstractConstructor<T> | Constructor<T>): boolean {
    return entry === token || entry instanceof token;
  }
  // #endregion
}
