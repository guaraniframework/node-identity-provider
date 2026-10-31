import { Injectable, InjectAll } from '@guarani/di';
import { isNonEmptyString } from '@guarani/primitives';

import { ClientAuthentication } from '../../../client-authentication/client-authentication';
import { TOKEN_CLIENT_AUTHENTICATION } from '../../../constants';
import { ClientCredentialsTokenContext } from '../../../context/token/client-credentials/client-credentials.token-context';
import { Client } from '../../../entities/client';
import { Scope } from '../../../entities/scope';
import { InvalidRequestError } from '../../../errors/invalid-request/invalid-request.error';
import { GrantType } from '../../../grant-types/grant-type';
import { GrantTypeName } from '../../../grant-types/grant-type-name.type';
import { ClientAuthenticationHandler } from '../../../handlers/client-authentication/client-authentication.handler';
import { ScopeHandler } from '../../../handlers/scope/scope.handler';
import { HttpRequest } from '../../../http/request/http-request';
import { Logger } from '../../../loggers/logger';
import { ClientCredentialsTokenRequest } from '../../../requests/token/client-credentials/client-credentials.token-request';
import { TokenValidator } from '../token.validator';

/**
 * Implementation of the Client Credentials Token Validator.
 */
@Injectable()
export class ClientCredentialsTokenValidator extends TokenValidator<ClientCredentialsTokenContext> {
  /**
   * Name of the Grant Type that uses this Validator.
   */
  public readonly name: GrantTypeName = 'client_credentials';

  /**
   * Instantiates a new Client Credentials Token Validator.
   *
   * @param logger Logger of the Identity Provider.
   * @param clientAuthenticationHandler Client Authentication Handler of the Identity Provider.
   * @param scopeHandler Scope Handler of the Identity Provider.
   * @param grantTypes Grant Types of the Identity Provider.
   * @param clientAuthenticationMethods Token Endpoint Client Authentication Methods of the Identity Provider.
   */
  public constructor(
    protected override readonly logger: Logger,
    protected override readonly clientAuthenticationHandler: ClientAuthenticationHandler,
    private readonly scopeHandler: ScopeHandler,
    @InjectAll(GrantType) protected override readonly grantTypes: GrantType[],
    @InjectAll(TOKEN_CLIENT_AUTHENTICATION)
    protected override readonly clientAuthenticationMethods: ClientAuthentication[],
  ) {
    super(logger, clientAuthenticationHandler, grantTypes, clientAuthenticationMethods);
  }

  /**
   * Validates the Http Request and returns the actors of the Client Credentials Token Context.
   *
   * @param request Http Request.
   * @returns Client Credentials Token Context.
   */
  public override async validate(request: HttpRequest): Promise<ClientCredentialsTokenContext> {
    this.logger.debug(`[${this.constructor.name}] Called validate()`, '2ce4be3d-e01c-41a4-af20-55358475fdd9', {
      request,
    });

    const context = await super.validate(request);

    const { client, parameters } = context;
    const scopes = await this.getScopes(parameters, client);

    Object.assign<ClientCredentialsTokenContext, Partial<ClientCredentialsTokenContext>>(context, { scopes });

    this.logger.debug(`[${this.constructor.name}] Completed validate()`, '7fa22ce8-70d9-4b5a-837e-122b8fecaf12', {
      request,
      context,
    });

    return context;
  }

  /**
   * Checks if the provided scope is supported by the Identity Provider and if the Client is allowed to request it,
   * then return the granted scopes for further processing.
   *
   * @param parameters Parameters of the Client Credentials Token Request.
   * @param client Client of the Request.
   * @returns Scopes granted to the Client.
   */
  private async getScopes(parameters: ClientCredentialsTokenRequest, client: Client): Promise<Scope[]> {
    this.logger.debug(`[${this.constructor.name}] Called getScopes()`, 'f1f26e92-8f62-46cc-a01c-74eaf17623cc', {
      parameters,
      client_id: client.id,
    });

    if ('scope' in parameters && !isNonEmptyString(parameters.scope)) {
      const error = new InvalidRequestError('Invalid parameter "scope".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "scope"`,
        'b1a3f287-6d9e-4c3a-afca-8d0ad49a0a02',
        { parameters, client_id: client.id },
        error,
      );

      throw error;
    }

    const scopes = parameters.scope?.split(' ') ?? [];
    await this.scopeHandler.checkRequestedScopes(scopes);
    const allowedScopes = await this.scopeHandler.getAllowedScopes(client, scopes);

    this.logger.debug(`[${this.constructor.name}] Completed getScopes()`, 'e06ff4e9-166b-4c15-af6e-8bd90001cdda', {
      parameters,
      client_id: client.id,
      allowed_scopes: allowedScopes.map((scope) => scope.name),
    });

    return allowedScopes;
  }
}
