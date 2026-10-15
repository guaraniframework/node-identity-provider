import { Injectable } from '@guarani/di';
import { hasEnumValue, isNonEmptyString, isPlainObject } from '@guarani/primitives';

import { EndpointName } from '../../endpoints/endpoint-name.type';
import { Logger } from '../../logger/logger';
import { HttpRequestMethod } from '../request/http-request-method.enum';
import { HttpEndpoint } from './http-endpoint';
import { HttpRoute } from './http-route';

/**
 * Implementation of the Http Router.
 *
 * The Http Router contains the URLs of the Endpoints of the Identity Provider.
 * It serves two purposes:
 *
 * 1. Map Endpoints to Http Handlers.
 * 2. Allow the Identity Provider Endpoints to obtain information about other Endpoints.
 *
 * The Http Router acts as an abstraction of a Web Server's Router, where it provides
 * the Handlers for an Endpoint based on its Routes and Http Request Methods.
 */
@Injectable()
export class HttpRouter {
  /**
   * Endpoints of the Identity Provider.
   */
  private readonly endpoints: Map<EndpointName, HttpEndpoint> = new Map();

  /**
   * Instantiates a new Http Router.
   *
   * @param logger Logger of the Identity Provider.
   */
  public constructor(private readonly logger: Logger) {}

  /**
   * Adds the provided Http Endpoint to the Http Router.
   *
   * @param name Name of the Endpoint.
   * @param endpoint Http Endpoint.
   * @throws {TypeError} One of the provided arguments is invalid.
   * @returns Http Router.
   */
  public addEndpoint(name: EndpointName, endpoint: HttpEndpoint): void {
    this.logger.debug(`[${this.constructor.name}] Called addEndpoint()`, '80f5cc2c-d522-4a4b-9504-4ebdc650f741', {
      name,
      endpoint,
    });

    if (!isNonEmptyString(name)) {
      const error = new TypeError('The provided Endpoint Name is invalid.');

      this.logger.critical(
        `[${this.constructor.name}] The provided Endpoint Name is invalid`,
        '729c0c4f-363c-4b10-9e8d-07c9083fa271',
        { name, endpoint },
        error,
      );

      throw error;
    }

    if (this.endpoints.has(name)) {
      const error = new TypeError('The provided Endpoint Name is already registered.');

      this.logger.critical(
        `[${this.constructor.name}] The provided Endpoint Name is already registered`,
        '2947f743-2c10-4097-adda-3993b2e8ceb4',
        { name, endpoint },
        error,
      );

      throw error;
    }

    if (!isPlainObject(endpoint)) {
      const error = new TypeError('The provided Http Endpoint is invalid.');

      this.logger.critical(
        `[${this.constructor.name}] The provided Http Endpoint is invalid`,
        'ac39c4cd-87c5-4b4b-8b4d-5af73a853803',
        { name, endpoint },
        error,
      );

      throw error;
    }

    if (!('path' in endpoint) || !isNonEmptyString(endpoint.path)) {
      const error = new TypeError('The provided Http Endpoint Path is invalid.');

      this.logger.critical(
        `[${this.constructor.name}] The provided Http Endpoint Path is invalid`,
        '2abe32c4-fb0e-4026-abc6-8fad6e5c2773',
        { name, endpoint },
        error,
      );

      throw error;
    }

    if (!('routes' in endpoint) || !this._isValidHttpEndpointRoutes(endpoint.routes)) {
      const error = new TypeError('The provided Http Endpoint Routes is invalid.');

      this.logger.critical(
        `[${this.constructor.name}] The provided Http Endpoint Routes is invalid`,
        '52534f39-92a0-4a0d-afdf-5ed016b44c83',
        { name, endpoint },
        error,
      );

      throw error;
    }

    this.endpoints.set(name, endpoint);

    this.logger.debug(`[${this.constructor.name}] Completed addEndpoint()`, 'f1e37a63-6c87-4fdd-bc0e-b875b50ee00b', {
      name,
      endpoint,
    });
  }

  /**
   * Returns the Http Endpoints of the Identity Provider.
   *
   * @returns Http Endpoints of the Identity Provider.
   */
  public getEndpoints(): HttpEndpoint[] {
    return Array.from(this.endpoints.values());
  }

  /**
   * Returns the requested Http Endpoint to the application.
   *
   * @param name Name of the Endpoint.
   * @throws {TypeError} The requested Http Endpoint is not registered.
   * @returns Http Endpoint.
   */
  public getEndpoint(name: EndpointName): HttpEndpoint {
    this.logger.debug(`[${this.constructor.name}] Called getEndpoint()`, '6d819a4a-d5ff-4b76-95c3-32355150c479', {
      name,
    });

    if (!isNonEmptyString(name)) {
      const error = new TypeError('The requested Http Endpoint is invalid.');

      this.logger.critical(
        `[${this.constructor.name}] The requested Http Endpoint is invalid`,
        'd73edf0e-2e73-44f6-b79f-ed517e57813a',
        { name },
        error,
      );

      throw error;
    }

    if (!this.endpoints.has(name)) {
      const error = new TypeError('The requested Http Endpoint is not registered.');

      this.logger.critical(
        `[${this.constructor.name}] The requested Http Endpoint is not registered`,
        '467cdc30-540c-46ab-86f7-649e267b951c',
        { name },
        error,
      );

      throw error;
    }

    const endpoint = this.endpoints.get(name)!;

    this.logger.debug(`[${this.constructor.name}] Completed getEndpoint()`, '70f55823-0f7a-4e2a-8c6c-a2e07f3d9aa0', {
      name,
      endpoint,
    });

    return endpoint;
  }

  private _isValidHttpEndpointRoutes(routes: HttpRoute[]): boolean {
    if (!Array.isArray(routes) || routes.length === 0) {
      return false;
    }

    return routes.every((route) => {
      if (!isPlainObject(route)) {
        return false;
      }

      if (!('method' in route) || !isNonEmptyString(route.method) || !hasEnumValue(HttpRequestMethod, route.method)) {
        return false;
      }

      if (!('handler' in route) || typeof route.handler !== 'function' || 'prototype' in route.handler) {
        return false;
      }

      return true;
    });
  }
}
