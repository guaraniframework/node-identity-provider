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

import { ConsoleLogger } from '../logger/console.logger';
import { Logger } from '../logger/logger';
import { IdentityProvider } from '../providers/identity-provider';
import { Settings } from '../settings/settings';
import { SETTINGS } from '../settings/settings.token';
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
   * Identity Provider Settings.
   */
  private readonly settings: Settings;

  /**
   * Instantiates a new Identity Provider Factory.
   *
   * @param issuer Identity Provider Issuer URL.
   * @throws {TypeError} The provided Issuer URL is invalid.
   */
  public constructor(issuer: string) {
    if (!isNonEmptyString(issuer) || !URL.canParse(issuer)) {
      throw new TypeError('The provided Issuer URL is invalid.');
    }

    this.settings = { issuer: new URL(issuer), scopes: new Set<string>() };
    this.container = getContainer(CONTAINER);

    this._setDefaults();
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
   * Adds the provided Scopes to the Identity Provider.
   * @param scopes Scopes to be added.
   * @throws {TypeError} The provided Scopes is invalid.
   * @returns Identity Provider Factory.
   */
  public addScopes(scopes: string[]): IdentityProviderFactory {
    if (!Array.isArray(scopes) || scopes.length === 0 || scopes.some((scope) => !isNonEmptyString(scope))) {
      throw new TypeError('The provided Scopes is invalid.');
    }

    scopes.forEach((scope) => this.settings.scopes.add(scope));
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

    this.addContainerEntry(SETTINGS, this.settings);
    this.addContainerEntry(IdentityProvider, provider!);
    this.addContainerEntry(DependencyInjectionContainer, this.container);

    return this.container.resolve(IdentityProvider);
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

  private _setDefaults(): void {
    this.container.bind(Logger).toClass(ConsoleLogger).asSingleton();
  }
}
