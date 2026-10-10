import {
  AbstractConstructor,
  Constructor,
  DependencyInjectionContainer,
  Factory,
  getContainer,
  InjectableToken,
} from '@guarani/di';
import { isNonEmptyString } from '@guarani/primitives';

import { ErrorEndpoint } from '../../endpoints/error/error.endpoint';
import { IdentityProvider } from '../../http/identity-provider';
import { ConsoleLogger } from '../../logger/console/console.logger';
import { Logger } from '../../logger/logger';
import { Settings } from '../../settings/settings';
import { TemplateEngine } from '../../template-engine/template-engine';
import { TemplateStringTemplateEngine } from '../../template-engine/template-string/template-string.template-engine';
import { ErrorRequestValidator } from '../../validators/error/error-request.validator';
import { CONTAINER } from '../tokens';
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
    this.addDefaultEntries();
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
   * Adds the provided Template Engine to the Identity Provider.
   *
   * @param templateEngine Template Engine to be added.
   * @throws {TypeError} The provided Template Engine is invalid.
   * @returns Identity Provider Factory.
   */
  public addTemplateEngine(templateEngine: IdentityProviderFactoryEntry<TemplateEngine>): IdentityProviderFactory {
    this.container.delete(TemplateEngine);
    this.addContainerEntry(TemplateEngine, templateEngine);
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
   * Creates a new instance of the Identity Provider.
   *
   * @throws {TokenNotRegisteredError} The Token is not registered at the Container.
   * @throws {InvalidProviderError} Attempted to resolve an invalid provider.
   * @returns Instance of the Identity Provider.
   */
  public create(): IdentityProvider {
    this.addErrorEndpoint();

    this.addContainerEntry(IdentityProvider);
    this.addContainerEntry(DependencyInjectionContainer, this.container);

    return this.container.resolve(IdentityProvider);
  }

  /**
   * Adds the Error Endpoint and all its dependencies to the Identity Provider.
   */
  private addErrorEndpoint(): void {
    this.addContainerEntry(ErrorEndpoint);
    this.addContainerEntry(ErrorRequestValidator);
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
    this.addContainerEntry(Logger, ConsoleLogger);
    this.addContainerEntry(TemplateEngine, TemplateStringTemplateEngine);
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
