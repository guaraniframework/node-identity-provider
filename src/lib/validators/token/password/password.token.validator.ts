import { Injectable, InjectAll } from '@guarani/di';
import { isNonEmptyString } from '@guarani/primitives';

import { ClientAuthentication } from '../../../client-authentication/client-authentication';
import { TOKEN_CLIENT_AUTHENTICATION } from '../../../constants';
import { PasswordTokenContext } from '../../../context/token/password/password.token-context';
import { DataAccess } from '../../../data-access/data-access';
import { Client } from '../../../entities/client';
import { Scope } from '../../../entities/scope';
import { User } from '../../../entities/user';
import { InvalidGrantError } from '../../../errors/invalid-grant/invalid-grant.error';
import { InvalidRequestError } from '../../../errors/invalid-request/invalid-request.error';
import { GrantType } from '../../../grant-types/grant-type';
import { GrantTypeName } from '../../../grant-types/grant-type-name.type';
import { ClientAuthenticationHandler } from '../../../handlers/client-authentication/client-authentication.handler';
import { ScopeHandler } from '../../../handlers/scope/scope.handler';
import { HttpRequest } from '../../../http/request/http-request';
import { Logger } from '../../../loggers/logger';
import { PasswordTokenRequest } from '../../../requests/token/password/password.token-request';
import { TokenValidator } from '../token.validator';

/**
 * Implementation of the Resource Owner Password Credentials Token Validator.
 */
@Injectable()
export class PasswordTokenValidator extends TokenValidator<PasswordTokenContext> {
  /**
   * Name of the Grant Type that uses this Validator.
   */
  public readonly name: GrantTypeName = 'password';

  /**
   * Instantiates a new Resource Owner Password Credentials Token Validator.
   *
   * @param logger Logger of the Identity Provider.
   * @param dataAccess Data Access of the Identity Provider.
   * @param clientAuthenticationHandler Client Authentication Handler of the Identity Provider.
   * @param scopeHandler Scope Handler of the Identity Provider.
   * @param grantTypes Grant Types of the Identity Provider.
   * @param clientAuthenticationMethods Token Endpoint Client Authentication Methods of the Identity Provider.
   */
  public constructor(
    protected override readonly logger: Logger,
    private readonly dataAccess: DataAccess,
    protected override readonly clientAuthenticationHandler: ClientAuthenticationHandler,
    private readonly scopeHandler: ScopeHandler,
    @InjectAll(GrantType) protected override readonly grantTypes: GrantType[],
    @InjectAll(TOKEN_CLIENT_AUTHENTICATION)
    protected override readonly clientAuthenticationMethods: ClientAuthentication[],
  ) {
    super(logger, clientAuthenticationHandler, grantTypes, clientAuthenticationMethods);

    if (typeof this.dataAccess.findUserByResourceOwnerCredentials !== 'function') {
      const error = new TypeError(
        'Missing implementation of required method "DataAccess.findUserByResourceOwnerCredentials".',
      );

      this.logger.fatal(
        `[${this.constructor.name}] Missing implementation of required method "DataAccess.findUserByResourceOwnerCredentials"`,
        'bc3a9749-5315-408f-a240-8e961480aa23',
        null,
        error,
      );

      throw error;
    }
  }

  /**
   * Validates the Http Request and returns the actors of the Resource Owner Password Credentials Token Context.
   *
   * @param request Http Request.
   * @returns Resource Owner Password Credentials Token Context.
   */
  public override async validate(request: HttpRequest): Promise<PasswordTokenContext> {
    this.logger.debug(`[${this.constructor.name}] Called validate()`, 'f01f3984-9664-4a99-91ec-232f825d5e0a', {
      request,
    });

    const context = await super.validate(request);

    const { client, parameters } = context;

    const user = await this.getUser(parameters);
    const scopes = await this.getScopes(parameters, client);

    Object.assign<PasswordTokenContext, Partial<PasswordTokenContext>>(context, { user, scopes });

    this.logger.debug(`[${this.constructor.name}] Completed validate()`, 'b1b7f89a-36bf-4c46-aa42-411812991114', {
      request,
      context,
    });

    return context;
  }

  /**
   * Searches a User from the application's storage based on the provided username and password.
   *
   * @param parameters Parameters of the Resource Owner Password Credentials Token Request.
   * @returns User that matches the provided Credentials.
   */
  private async getUser(parameters: PasswordTokenRequest): Promise<User> {
    this.logger.debug(`[${this.constructor.name}] Called getUser()`, '0b4a7714-e3ed-4393-9246-e41a3550fee2', {
      parameters,
    });

    if (!('username' in parameters) || !isNonEmptyString(parameters.username)) {
      const error = new InvalidRequestError('Invalid parameter "username".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "username"`,
        '2963042c-77f5-4704-aeff-22f2618280b3',
        { parameters },
        error,
      );

      throw error;
    }

    if (!('password' in parameters) || !isNonEmptyString(parameters.password)) {
      const error = new InvalidRequestError('Invalid parameter "password".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "password"`,
        '55595e1d-8a32-43f4-8a02-ca2e72196b69',
        { parameters },
        error,
      );

      throw error;
    }

    const user = await this.dataAccess.findUserByResourceOwnerCredentials!(parameters.username, parameters.password);

    if (!(user instanceof User)) {
      const error = new InvalidGrantError('Invalid Resource Owner Credentials.');

      this.logger.error(
        `[${this.constructor.name}] Invalid Resource Owner Credentials`,
        '2bb8e2bc-644f-480b-83a7-812a05c099a1',
        { parameters },
        error,
      );

      throw error;
    }

    this.logger.debug(`[${this.constructor.name}] Completed getUser()`, '96a191cc-ba61-4a7c-964d-79a0da63953f', {
      parameters,
      user_id: user.id,
    });

    return user;
  }

  /**
   * Checks if the provided scope is supported by the Identity Provider and if the Client is allowed to request it,
   * then return the granted scopes for further processing.
   *
   * @param parameters Parameters of the Resource Owner Password Credentials Token Request.
   * @param client Client of the Request.
   * @returns Scopes granted to the Client.
   */
  private async getScopes(parameters: PasswordTokenRequest, client: Client): Promise<Scope[]> {
    this.logger.debug(`[${this.constructor.name}] Called getScopes()`, '75a3ea4e-12a0-42f9-aa66-695acce470dd', {
      parameters,
      client_id: client.id,
    });

    if ('scope' in parameters && !isNonEmptyString(parameters.scope)) {
      const error = new InvalidRequestError('Invalid parameter "scope".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "scope"`,
        'd9fa30eb-68a0-452e-820a-e09c12ca1985',
        { parameters, client_id: client.id },
        error,
      );

      throw error;
    }

    const scopes = parameters.scope?.split(' ') ?? [];
    await this.scopeHandler.checkRequestedScopes(scopes);
    const allowedScopes = await this.scopeHandler.getAllowedScopes(client, scopes);

    this.logger.debug(`[${this.constructor.name}] Completed getScopes()`, 'ebf9c3c0-de48-4931-8f73-5b748280c064', {
      parameters,
      client_id: client.id,
      allowed_scopes: allowedScopes.map((scope) => scope.name),
    });

    return allowedScopes;
  }
}
