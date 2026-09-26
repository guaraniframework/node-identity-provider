import { Buffer } from 'buffer';
import { timingSafeEqual } from 'crypto';
import { URL } from 'url';
import { isDeepStrictEqual } from 'util';

import { isNonEmptyString } from '@guarani/primitives';

import { DEFAULT_MINIMUM_MAX_AGE } from '../../constants';
import { AuthorizationContext } from '../../context/authorization/authorization-context';
import { DataAccess } from '../../data-access/data-access';
import { Display } from '../../displays/display';
import { Client } from '../../entities/client';
import { Grant } from '../../entities/grant';
import { Session } from '../../entities/session';
import { AccessDeniedError } from '../../errors/access-denied/access-denied.error';
import { InvalidClientError } from '../../errors/invalid-client/invalid-client.error';
import { InvalidRequestError } from '../../errors/invalid-request/invalid-request.error';
import { UnauthorizedClientError } from '../../errors/unauthorized-client/unauthorized-client.error';
import { ScopeHandler } from '../../handlers/scope/scope.handler';
import { HttpRequest } from '../../http/request/http-request';
import { Logger } from '../../logger/logger';
import { AuthorizationRequest } from '../../requests/authorization/authorization-request';
import { ResponseMode } from '../../response-modes/response-mode';
import { ResponseModeName } from '../../response-modes/response-mode-name.type';
import { ResponseType } from '../../response-types/response-type';
import { ResponseTypeName } from '../../response-types/response-type-name.type';
import { Settings } from '../../settings/settings';
import { Prompt } from '../../types/promt.type';

/**
 * Implementation of the Authorization Request Validator.
 */
export abstract class AuthorizationRequestValidator<TContext extends AuthorizationContext = AuthorizationContext> {
  /**
   * Name of the Response Type that uses this Validator.
   */
  public abstract readonly name: ResponseTypeName;

  /**
   * Forbidden Response Modes for the Response Type of this Validator.
   */
  protected readonly forbiddenResponseModes: ResponseModeName[] = [];

  /**
   * Supported Prompts.
   */
  readonly #supportedPrompts: Prompt[] = ['consent', 'create', 'login', 'none', 'select_account'];

  /**
   * Instantiates a new Authorization Request Validator.
   *
   * @param logger Logger of the Identity Provider.
   * @param scopeHandler Instance of the Scope Handler.
   * @param dataAccess Data Access of the Identity Provider.
   * @param settings Settings of the Identity Provider.
   * @param responseTypes Response Types registered at the Identity Provider.
   * @param responseModes Response Modes registered at the Identity Provider.
   * @param displays Displays registered at the Identity Provider.
   */
  public constructor(
    protected readonly logger: Logger,
    protected readonly scopeHandler: ScopeHandler,
    protected readonly dataAccess: DataAccess,
    protected readonly settings: Settings,
    protected readonly responseTypes: ResponseType[],
    protected readonly responseModes: ResponseMode[],
    protected readonly displays: Display[],
  ) {}

  /**
   * Validates the Http Authorization Request and returns the actors of the Authorization Context.
   *
   * @param request Http Request.
   * @throws {AccessDeniedError} The Client failed to obtain authorization.
   * @throws {InvalidClientError} The Client failed to authenticate.
   * @throws {InvalidRequestError} One of the provided parameters is invalid.
   * @throws {InvalidScopeError} The Client requested an invalid or unsupported Scope.
   * @throws {UnauthorizedClientError} The Client is not authorized to make this Request.
   * @returns Authorization Context.
   */
  public async validate(request: HttpRequest): Promise<TContext> {
    this.logger.debug(`[${this.constructor.name}] Called validate()`, 'aa6338b1-d940-4d2b-9322-cd0d1daf8e04', {
      request,
    });

    const parameters = request.query as AuthorizationRequest;
    const cookies = request.cookies;

    const client = await this.getClient(parameters);
    const responseType = this.getResponseType(parameters, client);
    const redirectUri = this.getRedirectUri(parameters, client);
    let scopes = this.getScopes(parameters, client);
    const state = this.getState(parameters);
    const responseMode = this.getResponseMode(parameters, responseType, client);
    const nonce = this.getNonce(parameters);
    const display = this.getDisplay(parameters);
    const prompts = this.getPrompts(parameters);
    const maxAge = this.getMaxAge(parameters);
    const uiLocales = this.getUiLocales(parameters);
    const idTokenHint = this.getIdTokenHint(parameters);
    const loginHint = this.getLoginHint(parameters);
    const acrValues = this.getAcrValues(parameters);
    const session = await this.findSession(cookies);

    scopes = this.checkOfflineAccessScope(scopes, prompts, responseType);

    if (session?.grant instanceof Grant) {
      this.checkGrant(session.grant, client, parameters);
    }

    const context = {
      parameters,
      cookies,
      client,
      responseType,
      redirectUri,
      scopes,
      state,
      responseMode,
      nonce,
      display,
      prompts,
      maxAge,
      uiLocales,
      idTokenHint,
      loginHint,
      acrValues,
      session,
    } as TContext;

    this.logger.debug(`[${this.constructor.name}] Completed validate()`, 'aa6338b1-d940-4d2b-9322-cd0d1daf8e04', {
      request,
      context,
    });

    return context;
  }

  /**
   * Fetches a Client from the application's storage based on the provided Client Identifier.
   *
   * @param parameters Parameters of the Authorization Request.
   * @throws {InvalidRequestError} The provided parameter "client_id" is invalid.
   * @throws {InvalidClientError} Failed to find a Client with the provided Client Identifier.
   * @returns Client based on the provided Client Identifier.
   */
  protected async getClient(parameters: AuthorizationRequest): Promise<Client> {
    this.logger.debug(`[${this.constructor.name}] Called getClient()`, '451fa840-de32-45cb-b389-e268e40a5a4a', {
      parameters,
    });

    if (!isNonEmptyString(parameters.client_id)) {
      const error = new InvalidRequestError('Invalid parameter "client_id".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "client_id"`,
        '354773d7-7a99-444e-ad50-35169865970e',
        { parameters },
        error,
      );

      throw error;
    }

    const client = await this.dataAccess.findClient(parameters.client_id);

    if (!(client instanceof Client)) {
      const error = new InvalidClientError('Invalid Client.');

      this.logger.error(
        `[${this.constructor.name}] Invalid Client`,
        'd38c51c7-35d0-4c3a-8667-af25e4184991',
        { parameters },
        error,
      );

      throw error;
    }

    this.logger.debug(`[${this.constructor.name}] Completed getClient()`, 'baa138ec-e496-473d-8075-383a0e3c0b36', {
      parameters,
      client,
    });

    return client;
  }

  /**
   * Retrieves the Response Type requested by the Client.
   *
   * @param parameters Parameters of the Authorization Request.
   * @param client Client requesting authorization.
   * @throws {UnauthorizedClientError} The Client is not allowed to request the provided Response Type.
   * @returns Response Type.
   */
  protected getResponseType(parameters: AuthorizationRequest, client: Client): ResponseType {
    this.logger.debug(`[${this.constructor.name}] Called getResponseType()`, 'cde50a8f-8b94-4e10-8124-cee957cf51c2', {
      parameters,
      client,
    });

    const name = parameters.response_type!.split(' ').sort().join(' ') as ResponseTypeName;
    const responseType = this.responseTypes.find((responseType) => responseType.name === name)!;

    if (!client.responseTypes.includes(responseType.name)) {
      const error = new UnauthorizedClientError(
        `This Client is not allowed to request the response_type "${responseType.name}".`,
      );

      this.logger.error(
        `[${this.constructor.name}] This Client is not allowed to request the response_type "${responseType.name}"`,
        'abfa0812-dd05-4784-9c52-d8c1ed2c9be2',
        { parameters, client },
        error,
      );

      throw error;
    }

    this.logger.debug(
      `[${this.constructor.name}] Completed getResponseType()`,
      '5f1b6a8b-c1e2-4628-9a6f-01ab31078d0c',
      { parameters, client, response_type: responseType.name },
    );

    return responseType;
  }

  /**
   * Parses and validates the Redirect URI provided by the Client.
   *
   * @param parameters Parameters of the Authorization Request.
   * @param client Client requesting authorization.
   * @throws {InvalidRequestError} The provided parameter "redirect_uri" is invalid.
   * @throws {AccessDeniedError} The Client is not allowed to use the provided Redirect URI.
   * @returns Parsed and validated Redirect URI.
   */
  protected getRedirectUri(parameters: AuthorizationRequest, client: Client): URL {
    this.logger.debug(`[${this.constructor.name}] Called getRedirectUri()`, 'ef6568e0-4fb0-48a7-a5ee-dd502f6a420f', {
      parameters,
      client,
    });

    if (!isNonEmptyString(parameters.redirect_uri) || !URL.canParse(parameters.redirect_uri)) {
      const error = new InvalidRequestError('Invalid parameter "redirect_uri".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "redirect_uri"`,
        '2640d903-baf0-47e7-a420-56972f111aa2',
        { parameters, client },
        error,
      );

      throw error;
    }

    const redirectUri = new URL(parameters.redirect_uri);

    if (redirectUri.hash.length !== 0) {
      const error = new InvalidRequestError('The Redirect URI must not have a fragment component.');

      this.logger.error(
        `[${this.constructor.name}] The Redirect URI must not have a fragment component`,
        'eb620184-39a8-4af4-ba60-7b4dace21448',
        { parameters, client, redirect_uri: redirectUri.href },
        error,
      );

      throw error;
    }

    if (!client.redirectUris.some((clientRedirectUri) => clientRedirectUri.href === redirectUri.href)) {
      const error = new AccessDeniedError('Invalid Redirect URI.');

      this.logger.error(
        `[${this.constructor.name}] Invalid Redirect URI`,
        '484f7e9a-dbab-4d47-b2c7-1d7c4351f2e9',
        { parameters, client, redirect_uri: redirectUri.href },
        error,
      );

      throw error;
    }

    this.logger.debug(`[${this.constructor.name}] Completed getRedirectUri()`, '40887ea5-a47a-4e1b-bec9-198606e8d1cb', {
      parameters,
      client,
      redirect_uri: redirectUri.href,
    });

    return redirectUri;
  }

  /**
   * Checks if the provided scope is supported by the Identity Provider and if the Client is allowed to request it,
   * then return the granted scopes for further processing.
   *
   * @param parameters Parameters of the Authorization Request.
   * @param client Client requesting authorization.
   * @throws {InvalidRequestError} The provided parameter "scope" is invalid.
   * @throws {InvalidScopeError} The Client requested an unsupported Scope.
   * @throws {AccessDeniedError} The Client is not allowed to request the provided Scope.
   * @returns Scopes granted to the Client.
   */
  protected getScopes(parameters: AuthorizationRequest, client: Client): string[] {
    this.logger.debug(`[${this.constructor.name}] Called getScopes()`, '3d805d51-5e4a-4bfb-ad41-5c1d75aa286a', {
      parameters,
      client,
    });

    if (!isNonEmptyString(parameters.scope) || !parameters.scope.includes('openid')) {
      const error = new InvalidRequestError('Invalid parameter "scope".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "scope"`,
        '73f82992-2002-4283-b63e-53c50e8cae6d',
        { parameters, client },
        error,
      );

      throw error;
    }

    const scopes = parameters.scope.split(' ');
    this.scopeHandler.checkRequestedScope(scopes);
    const allowedScopes = this.scopeHandler.getAllowedScopes(client, scopes);

    this.logger.debug(`[${this.constructor.name}] Completed getScopes()`, '3d9e2615-27f4-4770-9279-4a63eec109f5', {
      parameters,
      client,
      allowed_scopes: allowedScopes,
    });

    return allowedScopes;
  }

  /**
   * Checks and returns the State provided by the Client.
   *
   * @param parameters Parameters of the Authorization Request.
   * @throws {InvalidRequestError} The provided parameter "state" is invalid.
   * @returns State provided by the Client.
   */
  protected getState(parameters: AuthorizationRequest): string | null {
    this.logger.debug(`[${this.constructor.name}] Called getState()`, '575c144a-7b34-47cd-a6da-3a52f3e97e7c', {
      parameters,
    });

    if ('state' in parameters && !isNonEmptyString(parameters.state)) {
      const error = new InvalidRequestError('Invalid parameter "state".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "state"`,
        'ef2ba2e4-3845-4741-9212-195d5f423435',
        { parameters },
        error,
      );

      throw error;
    }

    const state = parameters.state ?? null;

    this.logger.debug(`[${this.constructor.name}] Completed getState()`, '95b4376e-6ddf-409a-93dc-279ef0e3a15f', {
      parameters,
      state,
    });

    return state;
  }

  /**
   * Retrieves the Response Mode requested by the Client.
   *
   * @param parameters Parameters of the Authorization Request.
   * @param responseType Response Type requested by the Client.
   * @param client Client requesting authorization.
   * @throws {InvalidRequestError} The provided parameter "response_mode" is invalid.
   * @returns Response Mode.
   */
  protected getResponseMode(
    parameters: AuthorizationRequest,
    responseType: ResponseType,
    client: Client,
  ): ResponseMode {
    this.logger.debug(`[${this.constructor.name}] Called getResponseMode()`, '7dc16e70-9574-4f56-9148-338c3afc3675', {
      parameters,
      response_type: responseType.name,
      client,
    });

    if ('response_mode' in parameters && !isNonEmptyString(parameters.response_mode)) {
      const error = new InvalidRequestError('Invalid parameter "response_mode".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "response_mode"`,
        'da4f691c-0b44-4f0e-b8b5-38c85eeb5526',
        { parameters },
        error,
      );

      throw error;
    }

    const responseModeName = parameters.response_mode ?? responseType.defaultResponseMode;
    const responseMode = this.responseModes.find((responseMode) => responseMode.name === responseModeName);

    if (!(responseMode instanceof ResponseMode)) {
      const error = new InvalidRequestError(`Unsupported response_mode "${responseModeName}".`);

      this.logger.error(
        `[${this.constructor.name}] Unsupported response_mode "${responseModeName}"`,
        'f7d16e6e-6bcf-4717-93da-4a5c3a414e8e',
        { parameters, response_type: responseType.name, client },
        error,
      );

      throw error;
    }

    if (this.forbiddenResponseModes.includes(responseModeName)) {
      const error = new InvalidRequestError(
        `Invalid response_mode "${responseModeName}" for response_type "${this.name}".`,
      );

      this.logger.error(
        `[${this.constructor.name}] Invalid response_mode "${responseModeName}" for response_type "${this.name}"`,
        '646bfec8-899d-4dd3-a3ce-8e602f5b1fcf',
        { parameters, response_type: responseType.name, client },
        error,
      );

      throw error;
    }

    this.logger.debug(
      `[${this.constructor.name}] Completed getResponseMode()`,
      'bacd9b7b-39c2-4ea0-b816-7978cecf2e05',
      { parameters, response_type: responseType.name, client, response_mode: responseMode.name },
    );

    return responseMode;
  }

  /**
   * Checks and returns the Nonce provided by the Client.
   *
   * @param parameters Parameters of the Authorization Request.
   * @throws {InvalidRequestError} The provided parameter "nonce" is invalid.
   * @returns Nonce provided by the Client.
   */
  protected getNonce(parameters: AuthorizationRequest): string | null {
    this.logger.debug(`[${this.constructor.name}] Called getNonce()`, 'd5021d0e-6084-481b-a6df-5b7820e42d8a', {
      parameters,
    });

    if ('nonce' in parameters && !isNonEmptyString(parameters.nonce)) {
      const error = new InvalidRequestError('Invalid parameter "nonce".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "nonce"`,
        '29c978fa-715b-4b97-bba2-41da9a8ef260',
        { parameters },
        error,
      );

      throw error;
    }

    const nonce = parameters.nonce ?? null;

    this.logger.debug(`[${this.constructor.name}] Completed getNonce()`, '83d1d346-6dc1-45fd-94b9-216eb0d49835', {
      parameters,
      nonce,
    });

    return nonce;
  }

  /**
   * Retrieves the Display requested by the Client.
   *
   * @param parameters Parameters of the Authorization Request.
   * @throws {InvalidRequestError} The provided parameter "display" is invalid.
   * @returns Display.
   */
  protected getDisplay(parameters: AuthorizationRequest): Display {
    this.logger.debug(`[${this.constructor.name}] Called getDisplay()`, '87bfc15a-28db-4a10-a416-91f7539d8e3c', {
      parameters,
    });

    if ('display' in parameters && !isNonEmptyString(parameters.display)) {
      const error = new InvalidRequestError('Invalid parameter "display".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "display"`,
        'c79671f1-b7b3-42f2-b4fc-f9e1e2c88c5a',
        { parameters },
        error,
      );

      throw error;
    }

    const displayName = parameters.display ?? 'page';
    const display = this.displays.find((display) => display.name === displayName);

    if (!(display instanceof Display)) {
      const error = new InvalidRequestError(`Unsupported display "${displayName}".`);

      this.logger.error(
        `[${this.constructor.name}] Unsupported display "${displayName}"`,
        '739cd367-963d-4e9c-841b-43647f3520f8',
        { parameters },
        error,
      );

      throw error;
    }

    this.logger.debug(`[${this.constructor.name}] Completed getDisplay()`, '4fa2e5ea-3688-4512-80e7-938bc01f7b32', {
      parameters,
      display: display.name,
    });

    return display;
  }

  /**
   * Returns the Prompts requested by the Client.
   *
   * @param parameters Parameters of the Authorization Request.
   * @throws {InvalidRequestError} The provided parameter "prompt" is invalid.
   * @returns Prompts requested by the Client.
   */
  protected getPrompts(parameters: AuthorizationRequest): Prompt[] {
    this.logger.debug(`[${this.constructor.name}] Called getPrompts()`, '55bf11a9-ee75-463b-9fd0-d660cc3da3ae', {
      parameters,
    });

    if ('prompt' in parameters && !isNonEmptyString(parameters.prompt)) {
      const error = new InvalidRequestError('Invalid parameter "prompt".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "prompt"`,
        '1334c26c-89d2-4595-9355-faf21f340c9d',
        { parameters },
        error,
      );

      throw error;
    }

    const prompts = (parameters.prompt?.split(' ') ?? []) as Prompt[];

    prompts.forEach((prompt) => {
      if (!this.#supportedPrompts.includes(prompt)) {
        const error = new InvalidRequestError(`Unsupported prompt "${prompt}".`);

        this.logger.error(
          `[${this.constructor.name}] Unsupported prompt "${prompt}"`,
          '1e94b0f2-ba3d-4bda-80cc-be274446a2c6',
          { parameters },
          error,
        );

        throw error;
      }
    });

    if (prompts.includes('none') && prompts.length !== 1) {
      const error = new InvalidRequestError('The prompt "none" must be used by itself.');

      this.logger.error(
        `[${this.constructor.name}] The prompt "none" must be used by itself`,
        'c41b5e53-b4fb-4aef-80c4-14b989fc72ae',
        { parameters, prompts },
        error,
      );

      throw error;
    }

    if (prompts.includes('create') && prompts.includes('login')) {
      const error = new InvalidRequestError('The prompts "create" and "login" cannot be used together.');

      this.logger.error(
        `[${this.constructor.name}] The prompts "create" and "login" cannot be used together`,
        '68dc7d50-1ce6-43fd-b96b-98c51427fa00',
        { parameters, prompts },
        error,
      );

      throw error;
    }

    if (prompts.includes('create') && prompts.includes('select_account')) {
      const error = new InvalidRequestError('The prompts "create" and "select_account" cannot be used together.');

      this.logger.error(
        `[${this.constructor.name}] The prompts "create" and "select_account" cannot be used together`,
        '68479db2-699b-4995-9b3e-3539bab00be1',
        { parameters, prompts },
        error,
      );

      throw error;
    }

    if (prompts.includes('login') && prompts.includes('select_account')) {
      const error = new InvalidRequestError('The prompts "login" and "select_account" cannot be used together.');

      this.logger.error(
        `[${this.constructor.name}] The prompts "login" and "select_account" cannot be used together`,
        '4320e86d-d99d-45f4-a93e-48def43ff4b9',
        { parameters, prompts },
        error,
      );

      throw error;
    }

    this.logger.debug(`[${this.constructor.name}] Completed getPrompts()`, 'f618392c-84f2-4677-abfb-cf43bff8a33d', {
      parameters,
      prompts,
    });

    return prompts;
  }

  /**
   * Checks and returns the parsed Max Age provided by the Client.
   *
   * @param parameters Parameters of the Authorization Request.
   * @throws {InvalidRequestError} The provided parameter "max_age" is invalid.
   * @returns Parsed Max Age.
   */
  protected getMaxAge(parameters: AuthorizationRequest): number | null {
    this.logger.debug(`[${this.constructor.name}] Called getMaxAge()`, '086f9fb3-6bc4-4c1c-b5f4-34d03036ea3d', {
      parameters,
    });

    if (!('max_age' in parameters)) {
      this.logger.debug(`[${this.constructor.name}] Completed getMaxAge()`, 'd66e4421-1525-402c-adf9-75b518c81aa6', {
        parameters,
        max_age: null,
      });

      return null;
    }

    if (!/^(0|[1-9]\d*)$/g.test(parameters.max_age)) {
      const error = new InvalidRequestError('Invalid parameter "max_age".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "max_age"`,
        '73706208-2ad3-4568-8801-23289008a6db',
        { parameters },
        error,
      );

      throw error;
    }

    const maxAge = Number.parseInt(parameters.max_age, 10);
    const minimumMaxAge = this.settings.minimumMaxAge ?? DEFAULT_MINIMUM_MAX_AGE;

    if (maxAge !== 0 && maxAge < minimumMaxAge) {
      const error = new InvalidRequestError(
        'The provided "max_age" is smaller than the allowed by the Identity Provider.',
      );

      this.logger.error(
        `[${this.constructor.name}] The provided "max_age" is smaller than the allowed by the Identity Provider`,
        '05a81fec-1ffb-4b07-8aa6-342e09b6ae8b',
        { parameters },
        error,
      );

      throw error;
    }

    this.logger.debug(`[${this.constructor.name}] Completed getMaxAge()`, '0159bd86-ab4e-4e23-af2f-0579f4d69cf7', {
      parameters,
      max_age: maxAge,
    });

    return maxAge;
  }

  /**
   * Checks and returns the UI Locales requested by the Client.
   *
   * @param parameters Parameters of the Authorization Request.
   * @throws {InvalidRequestError} The provided parameter "ui_locales" is invalid.
   * @returns UI Locales requested by the Client.
   */
  protected getUiLocales(parameters: AuthorizationRequest): string[] {
    this.logger.debug(`[${this.constructor.name}] Called getUiLocales()`, '0a521a8a-963e-48b4-99ce-c98a92a25cdd', {
      parameters,
    });

    if ('ui_locales' in parameters && !isNonEmptyString(parameters.ui_locales)) {
      const error = new InvalidRequestError('Invalid parameter "ui_locales".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "ui_locales"`,
        '57d51d19-e2ba-4e21-a852-17c454985d9d',
        { parameters },
        error,
      );

      throw error;
    }

    const uiLocales = parameters.ui_locales?.split(' ') ?? [];

    uiLocales.forEach((uiLocale) => {
      if (this.settings.uiLocales?.includes(uiLocale) !== true) {
        const error = new InvalidRequestError(`Unsupported ui_locale "${uiLocale}".`);

        this.logger.error(
          `[${this.constructor.name}] Unsupported ui_locale "${uiLocale}"`,
          'f53991a0-2891-4155-ac41-dec761a4d6ca',
          { parameters },
          error,
        );

        throw error;
      }
    });

    this.logger.debug(`[${this.constructor.name}] Completed getUiLocales()`, '0e319c2e-15c3-4f14-9f32-12e6d748274d', {
      parameters,
      ui_locales: uiLocales,
    });

    return uiLocales;
  }

  /**
   * Checks and returns the ID Token Hint provided by the Client.
   *
   * @param parameters Parameters of the Authorization Request.
   * @throws {InvalidRequestError} The provided parameter "id_token_hint" is invalid.
   * @returns ID Token Hint provided by the Client.
   */
  protected getIdTokenHint(parameters: AuthorizationRequest): string | null {
    this.logger.debug(`[${this.constructor.name}] Called getIdTokenHint()`, '960de523-3e1f-4c04-a91d-ff5456ba31b7', {
      parameters,
    });

    if ('id_token_hint' in parameters && !isNonEmptyString(parameters.id_token_hint)) {
      const error = new InvalidRequestError('Invalid parameter "id_token_hint".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "id_token_hint"`,
        '85e4ddc3-7d7a-415e-b541-d2390fc95c8a',
        { parameters },
        error,
      );

      throw error;
    }

    const idTokenHint = parameters.id_token_hint ?? null;

    this.logger.debug(`[${this.constructor.name}] Completed getIdTokenHint()`, '8280bf7e-19bf-4f77-a6de-668535c2a3a2', {
      parameters,
      id_token_hint: idTokenHint,
    });

    return idTokenHint;
  }

  /**
   * Checks and returns the Login Hint provided by the Client.
   *
   * @param parameters Parameters of the Authorization Request.
   * @throws {InvalidRequestError} The provided parameter "login_hint" is invalid.
   * @returns Login Hint provided by the Client.
   */
  protected getLoginHint(parameters: AuthorizationRequest): string | null {
    this.logger.debug(`[${this.constructor.name}] Called getLoginHint()`, '41b11092-ef91-4a3e-b8d7-468fa61bedcd', {
      parameters,
    });

    if ('login_hint' in parameters && !isNonEmptyString(parameters.login_hint)) {
      const error = new InvalidRequestError('Invalid parameter "login_hint".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "login_hint"`,
        'e9ced8cc-cf96-4030-b64b-ea8db978e373',
        { parameters },
        error,
      );

      throw error;
    }

    const loginHint = parameters.login_hint ?? null;

    this.logger.debug(`[${this.constructor.name}] Completed getLoginHint()`, '9f4009e8-f66e-4339-944e-a489b90b8b4d', {
      parameters,
      login_hint: loginHint,
    });

    return loginHint;
  }

  /**
   * Checks and returns the Authentication Context Class References requested by the Client.
   *
   * @param parameters Parameters of the Authorization Request.
   * @throws {InvalidRequestError} The provided parameter "acr_values" is invalid.
   * @returns Authentication Context Class References requested by the Client.
   */
  protected getAcrValues(parameters: AuthorizationRequest): string[] {
    this.logger.debug(`[${this.constructor.name}] Called getAcrValues()`, '320cbdff-bca2-4795-9d6b-59ce9e3a277c', {
      parameters,
    });

    if ('acr_values' in parameters && !isNonEmptyString(parameters.acr_values)) {
      const error = new InvalidRequestError('Invalid parameter "acr_values".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "acr_values"`,
        '867e564f-2ce6-44b7-86f7-12bf02dd81c4',
        { parameters },
        error,
      );

      throw error;
    }

    const acrValues = parameters.acr_values?.split(' ') ?? [];

    acrValues.forEach((acrValue) => {
      if (this.settings.acrValues?.includes(acrValue) !== true) {
        const error = new InvalidRequestError(`Unsupported acr_value "${acrValue}".`);

        this.logger.error(
          `[${this.constructor.name}] Unsupported acr_value "${acrValue}"`,
          '7e7b042d-417d-4398-bbd7-0c6bb19898f6',
          { parameters },
          error,
        );

        throw error;
      }
    });

    this.logger.debug(`[${this.constructor.name}] Completed getAcrValues()`, 'ef1e7a3d-73a1-422c-9509-aec0a9f4b64a', {
      parameters,
      acr_values: acrValues,
    });

    return acrValues;
  }

  /**
   * Checks the offline_access Scope conditions for the Authorization Request.
   *
   * @param scopes Scopes requested by the Client.
   * @param prompts Prompts requested by the Client.
   * @param responseType Response Type requested by the Client.
   * @returns Allowed Scopes after checking for Offline Access conditions.
   */
  protected checkOfflineAccessScope(scopes: string[], prompts: Prompt[], responseType: ResponseType): string[] {
    this.logger.debug(
      `[${this.constructor.name}] Called checkOfflineAccessScope()`,
      '260f1547-beeb-4b21-adc9-59273d5a5eed',
      { scopes, prompts, response_type: responseType.name },
    );

    if (scopes.includes('offline_access') && (!prompts.includes('consent') || !responseType.name.includes('code'))) {
      this.logger.debug(
        `[${this.constructor.name}] Removing "offline_access" scope`,
        '72b2b93c-21bb-449c-a032-dfde4ecfd007',
      );

      scopes = scopes.filter((scope) => scope !== 'offline_access');
    }

    this.logger.debug(
      `[${this.constructor.name}] Completed checkOfflineAccessScope()`,
      '5d86c126-4efe-4057-9111-079fff17f3ec',
      { scopes, prompts, response_type: responseType.name },
    );

    return scopes;
  }

  /**
   * Searches the application's storage for a Session based on the Identifier in the Cookies of the Http Request.
   *
   * @param cookies Cookies of the Authorization Request.
   * @throws {InvalidRequestError} The provided Session Cookie is invalid.
   * @returns Session based on the Cookies.
   */
  protected async findSession(cookies: NodeJS.Dict<unknown>): Promise<Session | null> {
    this.logger.debug(`[${this.constructor.name}] Called findSession()`, '807c761b-6b06-4880-ad16-990e92676903', {
      cookies,
    });

    if (!('guarani:session' in cookies)) {
      return null;
    }

    if (!isNonEmptyString(cookies['guarani:session'])) {
      const error = new InvalidRequestError('Failed to authenticate the User.');

      this.logger.error(
        `[${this.constructor.name}] The Cookie "guarani:session" must be a non-empty string`,
        '91c667dc-17f2-4cd8-8810-04b72382d109',
        { cookies },
        error,
      );

      throw error;
    }

    const sessionId = cookies['guarani:session'];
    const session = await this.dataAccess.findSession(sessionId);

    this.logger.debug(`[${this.constructor.name}] Completed findSession()`, '82c262b5-4df7-49dc-996a-bc565f0c584d', {
      cookies,
      session,
    });

    return session;
  }

  /**
   * Checks if the provided Grant is valid.
   *
   * @param grant Grant of the Request.
   * @param client Client requesting authorization.
   * @param parameters Parameters of the Authorization Request.
   * @throws {InvalidRequestError} The provided Grant is invalid.
   */
  protected checkGrant(grant: Grant, client: Client, parameters: AuthorizationRequest): void {
    this.logger.debug(`[${this.constructor.name}] Called checkGrant()`, '63571aea-2c2f-4a41-817c-15b57e976ad4', {
      grant,
      client,
      parameters,
    });

    const clientId = Buffer.from(client.id, 'utf8');
    const grantClientId = Buffer.from(grant.client.id, 'utf8');

    if (clientId.length !== grantClientId.length || !timingSafeEqual(clientId, grantClientId)) {
      const error = new InvalidRequestError('Invalid Grant.');

      this.logger.error(
        `[${this.constructor.name}] Invalid Grant`,
        '2fb222ee-bc9c-4d8f-9d5c-92582e56ec7d',
        { grant, client, parameters },
        error,
      );

      throw error;
    }

    if (new Date() > grant.expiresAt) {
      const error = new InvalidRequestError('Expired Grant.');

      this.logger.error(
        `[${this.constructor.name}] Expired Grant`,
        'b4efe738-033e-4041-9d87-2921f2185276',
        { grant, client, parameters },
        error,
      );

      throw error;
    }

    if (!isDeepStrictEqual(parameters, grant.parameters, { skipPrototype: true })) {
      const error = new InvalidRequestError('One or more parameters changed since the initial Authorization Request.');

      this.logger.error(
        `[${this.constructor.name}] One or more parameters changed since the initial Authorization Request`,
        '80670caa-b8b3-4bd9-84bf-0b4a496c4169',
        { grant, client, parameters },
        error,
      );

      throw error;
    }

    this.logger.debug(`[${this.constructor.name}] Completed checkGrant()`, '6ec4ca4b-358b-4b44-9676-b29c79ae32e1', {
      grant,
      client,
      parameters,
    });
  }
}
