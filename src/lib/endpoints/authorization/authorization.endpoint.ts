import { URL } from 'url';

import { Inject, Injectable, InjectAll } from '@guarani/di';
import { isNonEmptyString } from '@guarani/primitives';

import { AuthorizationContext } from '../../context/authorization/authorization-context';
import { DataAccess } from '../../data-access/data-access';
import { Display } from '../../displays/display';
import { Consent } from '../../entities/consent';
import { Grant } from '../../entities/grant';
import { Login } from '../../entities/login';
import { Session } from '../../entities/session';
import { ConsentRequiredError } from '../../errors/consent-required/consent-required.error';
import { IdentityProviderError } from '../../errors/identity-provider.error';
import { InvalidRequestError } from '../../errors/invalid-request/invalid-request.error';
import { LoginRequiredError } from '../../errors/login-required/login-required.error';
import { ServerErrorError } from '../../errors/server-error/server-error.error';
import { UnsupportedResponseTypeError } from '../../errors/unsupported-response-type/unsupported-response-type.error';
import { AuthenticationHandler } from '../../handlers/authentication/authentication.handler';
import { IdTokenHandler } from '../../handlers/id-token/id-token.handler';
import { HttpRequest } from '../../http/request/http-request';
import { HttpRequestMethod } from '../../http/request/http-request-method.type';
import { HttpResponse } from '../../http/response/http-response';
import { InteractionTypeName } from '../../interaction-types/interaction-type-name.type';
import { Logger } from '../../logger/logger';
import { AuthorizationRequest } from '../../requests/authorization/authorization-request';
import { ResponseTypeName } from '../../response-types/response-type-name.type';
import { AuthorizationResponse } from '../../responses/authorization/authorization-response';
import { type Settings } from '../../settings/settings';
import { SETTINGS } from '../../settings/settings.token';
import { addParametersToUrl } from '../../utils/add-parameters-to-url/add-parameters-to-url';
import { includeAdditionalParameters } from '../../utils/include-additional-parameters/include-additional-parameters';
import { AuthorizationRequestValidator } from '../../validators/authorization/authorization-request.validator';
import { Endpoint } from '../endpoint';
import { EndpointName } from '../endpoint-name.type';

/**
 * Implementation of the Authorization Endpoint.
 *
 * This endpoint is used to provide an Authorization Grant for the requesting Client on behalf of the End User.
 */
@Injectable()
export class AuthorizationEndpoint extends Endpoint {
  /**
   * Name of the Endpoint.
   */
  public readonly name: EndpointName = 'authorization';

  /**
   * Path of the Endpoint.
   */
  public readonly path: string = '/oidc/authorization';

  /**
   * Http Methods supported by the Endpoint.
   */
  public readonly httpMethods: HttpRequestMethod[] = ['GET'];

  /**
   * Authentication Prompts.
   */
  readonly #authenticationInteractions: InteractionTypeName[] = ['create', 'login', 'select_account'];

  /**
   * Instantiates a new Authorization Endpoint.
   *
   * @param logger Logger of the Identity Provider.
   * @param authenticationHandler Authentication Handler of the Identity Provider.
   * @param idTokenHandler ID Token Handler of the Identity Provider.
   * @param dataAccess Data Access of the Identity Provider.
   * @param settings Settings of the Identity Provider.
   * @param validators Authorization Request Validators of the Identity Provider.
   */
  public constructor(
    private readonly logger: Logger,
    private readonly authenticationHandler: AuthenticationHandler,
    private readonly idTokenHandler: IdTokenHandler,
    private readonly dataAccess: DataAccess,
    @Inject(SETTINGS) private readonly settings: Settings,
    @InjectAll(AuthorizationRequestValidator) private readonly validators: AuthorizationRequestValidator[],
  ) {
    super();
  }

  /**
   * Creates a Http Redirect Authorization Response.
   *
   * Any error is safely redirected to the Redirect URI provided by the Client in the Authorization Request,
   * or to the Identity Provider's Error Endpoint, should the error not be returned to the Client's Redirect URI.
   *
   * If the authorization flow of the grant results in a successful response,
   * it will redirect the User-Agent to the Redirect URI provided by the Client.
   *
   * @param request Http Request.
   * @returns Http Response.
   */
  public async handle(request: HttpRequest): Promise<HttpResponse> {
    this.logger.debug(`[${this.constructor.name}] Called handle()`, '972ebd8a-4540-413c-9ce4-1c808f877162', {
      request,
    });

    let context: AuthorizationContext;

    try {
      const validator = this.getValidator(request.query as AuthorizationRequest);
      context = await validator.validate(request);
    } catch (err: unknown) {
      const error = this.asIdentityProviderError(err);
      return this.handleFatalAuthorizationError(error, null).setHeaders(error.headers).setStatus(error.status);
    }

    const { client, display, idTokenHint, maxAge, parameters, prompts, responseMode, responseType, state } = context;

    try {
      // #region Authentication
      if (!(context.session instanceof Session)) {
        context.session = await this.dataAccess.createSession();
        return this.reloadAuthorizationEndpoint(parameters, context.session);
      }

      if (!(context.session.grant instanceof Grant)) {
        context.session.grant = await this.dataAccess.createGrant(parameters, client, context.session);
      }

      let {
        session: { activeLogin: login, grant },
        session,
      } = context;

      if (prompts.includes('create') && !grant.interactions.includes('create')) {
        return this.redirectToRegistrationPage(grant, display);
      }

      if (prompts.includes('select_account')) {
        if (session.logins.length === 0) {
          throw new LoginRequiredError('No Login found for Account Selection.');
        }

        if (!grant.interactions.includes('select_account')) {
          return this.redirectToAccountSelectionPage(grant, display);
        }
      }

      if (login instanceof Login && prompts.includes('login') && !grant.interactions.includes('login')) {
        await this.authenticationHandler.inactivateSessionActiveLogin(session);
        login = null;
      }

      if (!(login instanceof Login)) {
        // This only happens in a fresh authorization.
        if (prompts.includes('none')) {
          throw new LoginRequiredError('No Login found.');
        }

        return this.redirectToLoginPage(grant, display);
      }

      const now = new Date();

      const loginExpiresAt = login.expiresAt;

      if (loginExpiresAt instanceof Date && now > loginExpiresAt) {
        await this.authenticationHandler.logout(login, session);

        if (prompts.includes('none')) {
          throw new LoginRequiredError('Login expired.');
        }

        return this.redirectToLoginPage(grant, display);
      }

      const loginCreatedAt = login.createdAt;

      if (
        typeof maxAge === 'number' &&
        ((maxAge === 0 && !grant.interactions.some((x) => this.#authenticationInteractions.includes(x))) ||
          now >= new Date(loginCreatedAt.getTime() + maxAge * 1000))
      ) {
        await this.authenticationHandler.logout(login, session);

        if (prompts.includes('none')) {
          throw new LoginRequiredError('Login is too old.');
        }

        return this.redirectToLoginPage(grant, display);
      }

      if (
        typeof idTokenHint === 'string' &&
        !(await this.idTokenHandler.checkIdTokenHint(idTokenHint, client, login))
      ) {
        await this.authenticationHandler.inactivateSessionActiveLogin(session);
        throw new LoginRequiredError('The authenticated User is not the one expected by the ID Token Hint.');
      }
      // #endregion

      // #region Authorization
      let consent = grant.consent ?? (await this.dataAccess.findConsent(client, login.user));

      if (consent instanceof Consent && prompts.includes('consent') && !grant.interactions.includes('consent')) {
        await this.dataAccess.removeConsent(consent);
        consent = null;
      }

      if (!(consent instanceof Consent)) {
        if (prompts.includes('none')) {
          throw new ConsentRequiredError('No Consent found.');
        }

        return this.redirectToConsentPage(grant, display);
      }

      const consentExpiresAt = consent.expiresAt;

      if (consentExpiresAt instanceof Date && now > consentExpiresAt) {
        await this.dataAccess.removeConsent(consent);

        if (prompts.includes('none') || grant.interactions.includes('consent')) {
          throw new ConsentRequiredError('Consent expired.');
        }

        return this.redirectToConsentPage(grant, display);
      }
      // #endregion

      // region Response Type
      const authorizationResponse = await responseType.handle(context);

      includeAdditionalParameters(authorizationResponse, {
        state,
        iss: this.settings.enableAuthorizationResponseIssuerIdentifier === true ? this.settings.issuer.href : null,
      } as AuthorizationResponse);

      const response = await responseMode.createHttpResponse(context, authorizationResponse);

      await this.dataAccess.removeGrant(grant);

      this.logger.debug(`[${this.constructor.name}] Completed handle()`, '3c8368a7-b644-44ff-a749-295053716ad5', {
        request,
        response,
      });

      return response;
      // #endregion
    } catch (err: unknown) {
      const error = this.asIdentityProviderError(err);

      const errorResponse = includeAdditionalParameters(error.toJSON(), {
        state,
        iss: this.settings.enableAuthorizationResponseIssuerIdentifier === true ? this.settings.issuer.href : null,
      });

      const response = (await responseMode.createHttpResponse(context, errorResponse))
        .setHeaders(error.headers)
        .setStatus(error.status);

      await this.dataAccess.removeGrant(context.session!.grant!);

      this.logger.debug(`[${this.constructor.name}] Completed handle()`, 'a47f5be3-65c0-405e-b352-fc95ede23549', {
        request,
        response,
      });

      return response;
    }
  }

  /**
   * Retrieves the Authorization Request Validator based on the Response Type requested by the Client.
   *
   * @param parameters Parameters of the Authorization Request.
   * @throws {InvalidRequestError} The provided parameter "response_type" is invalid.
   * @throws {UnsupportedResponseTypeError} The provided parameter "response_type" is unsupported.
   * @returns Authorization Request Validator.
   */
  private getValidator(parameters: AuthorizationRequest): AuthorizationRequestValidator {
    this.logger.debug(`[${this.constructor.name}] Called getValidator()`, 'b2e735f3-8bc4-49d9-b4a7-ef8b25df1bf7', {
      parameters,
    });

    if (!isNonEmptyString(parameters.response_type)) {
      const error = new InvalidRequestError('Invalid parameter "response_type".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "response_type"`,
        '41df9486-e8d2-44ca-afaa-341e27c1cf25',
        { parameters },
        error,
      );

      throw error;
    }

    const responseTypeName = parameters.response_type.split(' ').sort().join(' ') as ResponseTypeName;
    const validator = this.validators.find((validator) => validator.name === responseTypeName);

    if (!(validator instanceof AuthorizationRequestValidator)) {
      const error = new UnsupportedResponseTypeError(`Unsupported response_type "${responseTypeName}".`);

      this.logger.error(
        `[${this.constructor.name}] Unsupported response_type "${responseTypeName}"`,
        'a63cff49-a503-42fb-a53f-c4fac3ce465b',
        { parameters },
        error,
      );

      throw error;
    }

    this.logger.debug(`[${this.constructor.name}] Completed getValidator()`, '5b7e4e56-74f1-4a61-add6-6c3a8a6db292', {
      parameters,
      validator,
    });

    return validator;
  }

  /**
   * Sets the Session Cookie and reloads the Authorization Endpoint to continue the Authorization Process.
   *
   * @param parameters Parameters of the Authorization Request.
   * @param session Session of the Request.
   * @returns Redirect Response to the Authorization Endpoint with the Session Cookie set.
   */
  private reloadAuthorizationEndpoint(parameters: AuthorizationRequest, session: Session): HttpResponse {
    this.logger.debug(
      `[${this.constructor.name}] Called reloadAuthorizationEndpoint()`,
      '182fed4d-63d9-4aab-8334-27d480f542b6',
      { parameters, session },
    );

    const url = addParametersToUrl(new URL(this.path, this.settings.issuer), parameters);
    const response = new HttpResponse().redirect(url).setCookie('guarani:session', session!.id);

    this.logger.debug(
      `[${this.constructor.name}] Completed reloadAuthorizationEndpoint()`,
      '8fe4f4c7-8700-42ae-96cf-0f4a6e8b8015',
      { parameters, session, response },
    );

    return response;
  }

  /**
   * Redirects the User-Agent to the Identity Provider's User Registration Page
   * for the User to create an Account in order to proceed with the Authorization Process.
   *
   * @param grant Grant of the Request.
   * @param display Display of the Request.
   * @returns Http Redirect Response to the User Registration Page.
   */
  private redirectToRegistrationPage(grant: Grant, display: Display): HttpResponse {
    this.logger.debug(
      `[${this.constructor.name}] Called redirectToRegistrationPage()`,
      '3b05610a-7007-434c-8e1c-5382a18e9010',
      { grant, display },
    );

    const parameters: NodeJS.Dict<unknown> = { login_challenge: grant!.loginChallenge };
    const response = display.createHttpResponse(this.settings.interactions.registrationUrl, parameters);

    this.logger.debug(
      `[${this.constructor.name}] Completed redirectToRegistrationPage()`,
      'd48b83ab-62d6-4c1a-b8c8-4cf7468ad9b9',
      { grant, display, response },
    );

    return response;
  }

  /**
   * Redirects the User-Agent to the Identity Provider's Account Selection Page
   * for the User to select an Account in order to proceed with the Authorization Process.
   *
   * @param grant Grant of the Request.
   * @param display Display of the Request.
   * @returns Http Redirect Response to the Account Selection Page.
   */
  private redirectToAccountSelectionPage(grant: Grant, display: Display): HttpResponse {
    this.logger.debug(
      `[${this.constructor.name}] Called redirectToAccountSelectionPage()`,
      '6ac731ce-2634-4bee-9416-4f33a2f69bc0',
      { grant, display },
    );

    const parameters: NodeJS.Dict<unknown> = { login_challenge: grant!.loginChallenge };
    const response = display.createHttpResponse(this.settings.interactions.accountSelectionUrl, parameters);

    this.logger.debug(
      `[${this.constructor.name}] Completed redirectToAccountSelectionPage()`,
      'c2f6e08d-e13e-403b-9031-fcba0a093867',
      { grant, display, response },
    );

    return response;
  }

  /**
   * Redirects the User-Agent to the Identity Provider's Login Page for it to Authenticate the User.
   *
   * @param grant Grant of the Request.
   * @param display Display of the Request.
   * @returns Http Redirect Response to the Login Page.
   */
  private redirectToLoginPage(grant: Grant, display: Display): HttpResponse {
    this.logger.debug(
      `[${this.constructor.name}] Called redirectToLoginPage()`,
      '4d48832f-d67b-4462-a368-d70cb3742a39',
      { grant, display },
    );

    const parameters: NodeJS.Dict<unknown> = { login_challenge: grant!.loginChallenge };
    const response = display.createHttpResponse(this.settings.interactions.loginUrl, parameters);

    this.logger.debug(
      `[${this.constructor.name}] Completed redirectToLoginPage()`,
      '5bdf73e2-ed2e-4b0b-b6d1-788e4fa0a4d3',
      { grant, display, response },
    );

    return response;
  }

  /**
   * Redirects the User-Agent to the Identity Provider's Consent Page for it to obtain Consent from the User.
   *
   * @param grant Grant of the Request.
   * @param display Display of the Request.
   * @returns Http Redirect Response to the Consent Page.
   */
  private redirectToConsentPage(grant: Grant, display: Display): HttpResponse {
    this.logger.debug(
      `[${this.constructor.name}] Called redirectToConsentPage()`,
      '7343587c-5cad-472d-8255-97a541812163',
      { grant, display },
    );

    const parameters: NodeJS.Dict<unknown> = { consent_challenge: grant!.consentChallenge };
    const response = display.createHttpResponse(this.settings.interactions.consentUrl, parameters);

    this.logger.debug(
      `[${this.constructor.name}] Completed redirectToConsentPage()`,
      'aeb3b928-dc9d-4a22-bc58-3a1a5afa1816',
      { grant, display, response },
    );

    return response;
  }

  /**
   * Handles a fatal Authorization Error - that is, an error that cannot be redirected to the Client's Redirect URI.
   *
   * @param error Identity Provider Error.
   * @param state State of the Client prior to the Authorization Request.
   * @returns Http Response.
   */
  private handleFatalAuthorizationError(error: IdentityProviderError, state: string | null): HttpResponse {
    this.logger.debug(
      `[${this.constructor.name}] Called handleFatalAuthorizationError()`,
      'cd814f48-50bf-49f1-b98e-15cce7cb82bd',
      { error, state },
    );

    const location = addParametersToUrl(
      new URL(this.settings.interactions.errorUrl.href),
      includeAdditionalParameters(error.toJSON(), { state }),
    );

    const response = new HttpResponse().redirect(location);

    this.logger.debug(
      `[${this.constructor.name}] Completed handleFatalAuthorizationError()`,
      'aa758a6c-85a6-4011-a458-36b5d78448dd',
      { error, state, response },
    );

    return response;
  }

  /**
   * Treats the caught error into a valid Identity Provider Error.
   *
   * @param error Error caught.
   * @returns Treated Identity Provider Error.
   */
  private asIdentityProviderError(error: unknown): IdentityProviderError {
    this.logger.debug(
      `[${this.constructor.name}] Called asIdentityProviderError()`,
      'ee6c64f0-c7a1-4dc6-9de0-648aaf051e50',
      { error },
    );

    const identityProviderError =
      error instanceof IdentityProviderError
        ? error
        : new ServerErrorError('An unexpected error occurred.', { cause: error });

    this.logger.debug(
      `[${this.constructor.name}] Completed asIdentityProviderError()`,
      'd010d938-48d6-47f9-ac54-c138da5f6154',
      { error, identity_provider_error: identityProviderError },
    );

    return identityProviderError;
  }
}
