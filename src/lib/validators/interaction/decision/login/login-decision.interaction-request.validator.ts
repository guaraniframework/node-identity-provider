import { Inject, Injectable, InjectAll } from '@guarani/di';
import { isNonEmptyString } from '@guarani/primitives';

import { LoginDecisionInteractionContext } from '../../../../context/interaction/decision/login/login-decision.interaction-context';
import { LoginDecisionAcceptInteractionContext } from '../../../../context/interaction/decision/login/login-decision-accept.interaction-context';
import { LoginDecisionDenyInteractionContext } from '../../../../context/interaction/decision/login/login-decision-deny.interaction-context';
import { DataAccess } from '../../../../data-access/data-access';
import { Client } from '../../../../entities/client';
import { Grant } from '../../../../entities/grant';
import { User } from '../../../../entities/user';
import { AccessDeniedError } from '../../../../errors/access-denied/access-denied.error';
import { IdentityProviderError } from '../../../../errors/identity-provider.error';
import { InvalidRequestError } from '../../../../errors/invalid-request/invalid-request.error';
import { ClientAuthenticationHandler } from '../../../../handlers/client-authentication/client-authentication.handler';
import { HttpRequest } from '../../../../http/request/http-request';
import { InteractionType } from '../../../../interaction-types/interaction-type';
import { InteractionTypeName } from '../../../../interaction-types/interaction-type-name.type';
import { Logger } from '../../../../logger/logger';
import { LoginDecision } from '../../../../requests/interaction/decision/login/login-decision';
import { LoginDecisionInteractionRequest } from '../../../../requests/interaction/decision/login/login-decision.interaction-request';
import { LoginDecisionAcceptInteractionRequest } from '../../../../requests/interaction/decision/login/login-decision-accept.interaction-request';
import { LoginDecisionDenyInteractionRequest } from '../../../../requests/interaction/decision/login/login-decision-deny.interaction-request';
import { type Settings } from '../../../../settings/settings';
import { SETTINGS } from '../../../../settings/settings.token';
import { SubjectType } from '../../../../subject-types/subject-type';
import { secureStringCompare } from '../../../../utils/secure-string-compare/secure-string-compare';
import { DecisionInteractionRequestValidator } from '../decision.interaction-request.validator';

/**
 * Implementation of the Login Context Interaction Request Validator.
 */
@Injectable()
export class LoginDecisionInteractionRequestValidator extends DecisionInteractionRequestValidator<LoginDecisionInteractionContext> {
  /**
   * Name of the Interaction Type that uses this Validator.
   */
  public readonly name: InteractionTypeName = 'login';

  /**
   * Instantiates a new Login Context Interaction Request Validator.
   *
   * @param logger Logger of the Identity Provider.
   * @param dataAccess Data Access of the Identity Provider.
   * @param clientAuthenticationHandler Client Authentication Handler of the Identity Provider.
   * @param settings Settings of the Identity Provider.
   * @param interactionTypes Interaction Types registered at the Identity Provider.
   * @param subjectTypes Subject Types registered at the Identity Provider.
   */
  public constructor(
    protected override readonly logger: Logger,
    private readonly dataAccess: DataAccess,
    protected override readonly clientAuthenticationHandler: ClientAuthenticationHandler,
    @Inject(SETTINGS) private readonly settings: Settings,
    @InjectAll(InteractionType) protected override readonly interactionTypes: InteractionType[],
    @InjectAll(SubjectType) private readonly subjectTypes: SubjectType[],
  ) {
    super(logger, clientAuthenticationHandler, interactionTypes);
  }

  /**
   * Validates the Http Context Interaction Request and returns the actors of the Context Interaction Context.
   *
   * @param request Http Request.
   * @throws {InvalidRequestError} The provided parameter "login_challenge" is invalid.
   * @throws {AccessDeniedError} Could not find a Grant based on the provided Login Challenge.
   * @returns Context Interaction Context.
   */
  public override async validate(request: HttpRequest): Promise<LoginDecisionInteractionContext> {
    this.logger.debug(`[${this.constructor.name}] Called validate()`, 'dc849777-3832-4429-969a-ee02305f5ac3', {
      request,
    });

    const context = await super.validate(request);
    const grant = await this.getGrant(context.parameters, context.client);
    const decision = this.getDecision(context.parameters);

    Object.assign<LoginDecisionInteractionContext, Partial<LoginDecisionInteractionContext>>(context, {
      grant,
      decision,
    });

    switch (decision) {
      case 'accept': {
        const parameters = context.parameters as LoginDecisionAcceptInteractionRequest;

        const user = await this.getUser(parameters, context.client);
        const amr = this.getAuthenticationMethods(parameters);
        const acr = this.getAuthenticationContextClass(parameters);

        Object.assign<LoginDecisionInteractionContext, Partial<LoginDecisionAcceptInteractionContext>>(context, {
          user,
          amr,
          acr,
        });

        break;
      }

      case 'deny': {
        const parameters = context.parameters as LoginDecisionDenyInteractionRequest;
        const error = this.getError(parameters);

        Object.assign<LoginDecisionInteractionContext, Partial<LoginDecisionDenyInteractionContext>>(context, {
          error,
        });

        break;
      }
    }

    this.logger.debug(`[${this.constructor.name}] Completed validate()`, 'fc177fef-1037-4f5c-aca8-c265c821c1c7', {
      request,
      context,
    });

    return context;
  }

  /**
   * Fetches the requested Grant from the application's storage.
   *
   * @param parameters Parameters of the Interaction Request.
   * @param client Client of the Interaction Request.
   * @throws {InvalidRequestError} The provided parameter "login_challenge" is invalid.
   * @throws {AccessDeniedError} Could not find a Grant based on the provided Login Challenge.
   * @returns Grant based on the provided Login Challenge.
   */
  private async getGrant(parameters: LoginDecisionInteractionRequest, client: Client): Promise<Grant> {
    this.logger.debug(`[${this.constructor.name}] Called getGrant()`, 'cf34b45d-6dc8-455f-8717-9e1796c3e725', {
      parameters,
      client,
    });

    if (!('login_challenge' in parameters) || !isNonEmptyString(parameters.login_challenge)) {
      const error = new InvalidRequestError('Invalid parameter "login_challenge".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "login_challenge"`,
        '256c4032-69d7-42b7-9531-6a6fb1665169',
        { parameters, client },
        error,
      );

      throw error;
    }

    const grant = await this.dataAccess.findGrantByLoginChallenge(parameters.login_challenge);

    if (!(grant instanceof Grant)) {
      const error = new AccessDeniedError('Invalid Login Challenge.');

      this.logger.error(
        `[${this.constructor.name}] Invalid Login Challenge`,
        '29753f1d-034b-47dd-8b02-fbccaf22107b',
        { parameters, client },
        error,
      );

      throw error;
    }

    if (!secureStringCompare(grant.client.id, client.id)) {
      const error = new AccessDeniedError('Invalid Login Challenge.');

      this.logger.error(
        `[${this.constructor.name}] The Grant was not issued to this Client`,
        '0825051f-6751-4f0a-871e-75def43520e3',
        { parameters, client },
        error,
      );

      throw error;
    }

    this.logger.debug(`[${this.constructor.name}] Completed getGrant()`, '965789b1-b457-4b8d-ae1d-b8f32333ae20', {
      parameters,
      client,
      grant,
    });

    return grant;
  }

  /**
   * Checks and returns the Login Decision provided by the Client.
   *
   * @param parameters Parameters of the Interaction Request.
   * @throws {InvalidRequestError} The provided parameter "decision" is invalid or unsupported.
   * @returns Login Decision provided by the Client.
   */
  private getDecision(parameters: LoginDecisionInteractionRequest): LoginDecision {
    this.logger.debug(`[${this.constructor.name}] Called getDecision()`, 'ed8b3656-0970-48e0-b64c-85890f4c0d5c', {
      parameters,
    });

    if (!('decision' in parameters) || !isNonEmptyString(parameters.decision)) {
      const error = new InvalidRequestError('Invalid parameter "decision".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "decision"`,
        'f9681f7d-a25d-4b3c-8d08-8219b75f91ba',
        { parameters },
        error,
      );

      throw error;
    }

    if (parameters.decision !== 'accept' && parameters.decision !== 'deny') {
      const error = new InvalidRequestError(`Unsupported decision "${parameters.decision}".`);

      this.logger.error(
        `[${this.constructor.name}] Unsupported decision "${parameters.decision}"`,
        '7d94f4a7-d80e-4b9d-8c46-dde15cf7863f',
        { parameters },
        error,
      );

      throw error;
    }

    this.logger.debug(`[${this.constructor.name}] Completed getDecision()`, 'e1eb6eaa-392d-4176-ab5e-726bc0406cf1', {
      parameters,
      decision: parameters.decision,
    });

    return parameters.decision;
  }

  // #region Decision Accept
  /**
   * Fetches a User from the application's storage based on the provided Subject Identifier.
   *
   * @param parameters Parameters of the Interaction Request.
   * @throws {InvalidRequestError} The provided parameter "subject_id" is invalid or unsupported.
   * @throws {AccessDeniedError} Failed to retrieve a User based on the provided Subject Identifier.
   * @returns User based on the provided Subject Identifier.
   */
  private async getUser(parameters: LoginDecisionAcceptInteractionRequest, client: Client): Promise<User> {
    this.logger.debug(`[${this.constructor.name}] Called getUser()`, '9711a8ff-91f5-4668-955d-07a2c8de7b81', {
      parameters,
      client,
    });

    if (!('subject_id' in parameters) || !isNonEmptyString(parameters.subject_id)) {
      const error = new InvalidRequestError('Invalid parameter "subject_id".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "subject_id"`,
        '6ca68f17-282c-49f0-ba8e-72b19e27791e',
        { parameters, client },
        error,
      );

      throw error;
    }

    const subjectType = this.subjectTypes.find((subjectType) => subjectType.name === client.subjectType)!;
    const subjectId = subjectType.retrieveSubjectIdentifier(parameters.subject_id, client);

    const user = await this.dataAccess.findUserById(subjectId);

    if (!(user instanceof User)) {
      const error = new AccessDeniedError('Invalid Subject Identifier.');

      this.logger.error(
        `[${this.constructor.name}] Invalid Subject Identifier`,
        '54ee3b7e-1e91-49df-a9d7-a2c5cb767e55',
        { parameters, client },
        error,
      );

      throw error;
    }

    this.logger.debug(`[${this.constructor.name}] Completed getUser()`, 'fba8c2eb-33ab-499d-8400-c0e91690550b', {
      parameters,
      client,
      user,
    });

    return user;
  }

  /**
   * Checks and returns the Authentication Methods provided by the Client.
   *
   * @param parameters Parameters of the Interaction Request.
   * @throws {InvalidRequestError} The provided parameter "amr" is invalid.
   * @returns Authentication Methods provided by the Client.
   */
  private getAuthenticationMethods(parameters: LoginDecisionAcceptInteractionRequest): string[] {
    this.logger.debug(
      `[${this.constructor.name}] Called getAuthenticationMethods()`,
      'bd61afe3-4589-4073-9643-fa090a7ce54e',
      { parameters },
    );

    if ('amr' in parameters && !isNonEmptyString(parameters.amr)) {
      const error = new InvalidRequestError('Invalid parameter "amr".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "amr"`,
        'a5d8b5be-9965-432c-a8a0-b0fa95febb25',
        { parameters },
        error,
      );

      throw error;
    }

    const amr = parameters.amr?.split(' ') ?? [];

    this.logger.debug(
      `[${this.constructor.name}] Completed getAuthenticationMethods()`,
      'c0bd7e93-72db-4a93-a6bb-3dcde62bb34f',
      { parameters, amr },
    );

    return amr;
  }

  /**
   * Checks and returns the Authentication Context Class provided by the Client.
   *
   * @param parameters Parameters of the Interaction Request.
   * @throws {InvalidRequestError} The provided parameter "acr" is invalid or unsupported.
   * @returns Authentication Context Class provided by the Client.
   */
  private getAuthenticationContextClass(parameters: LoginDecisionAcceptInteractionRequest): string {
    this.logger.debug(
      `[${this.constructor.name}] Called getAuthenticationContextClass()`,
      '81b8e7bc-f379-45d3-822c-95421ddccb19',
      { parameters },
    );

    if ('acr' in parameters) {
      if (!isNonEmptyString(parameters.acr)) {
        const error = new InvalidRequestError('Invalid parameter "acr".');

        this.logger.error(
          `[${this.constructor.name}] Invalid parameter "acr"`,
          '34501b31-ea83-4b33-bdc5-08cc3000e3ed',
          { parameters },
          error,
        );

        throw error;
      }

      if (!this.settings.acrValues.includes(parameters.acr)) {
        const error = new InvalidRequestError(
          `Unsupported Authentication Context Class Reference "${parameters.acr}".`,
        );

        this.logger.error(
          `[${this.constructor.name}] Unsupported Authentication Context Class Reference "${parameters.acr}"`,
          'ffce7709-46e1-481d-8315-5fd9a7e38936',
          { parameters },
          error,
        );

        throw error;
      }
    }

    const acr = parameters.acr ?? '0';

    this.logger.debug(
      `[${this.constructor.name}] Completed getAuthenticationContextClass()`,
      '4dc1d6a9-ad0e-470f-b061-2e8e97566b43',
      { parameters, acr },
    );

    return acr;
  }
  // #endregion

  // #region Decision Deny
  /**
   * Checks and returns the Error Parameters provided by the Client.
   *
   * @param parameters Parameters of the Interaction Request.
   * @throws {InvalidRequestError} One of the provided parameters is invalid.
   * @returns Error object based on the Error Parameters provided by the Client.
   */
  private getError(parameters: LoginDecisionDenyInteractionRequest): IdentityProviderError {
    this.logger.debug(`[${this.constructor.name}] Called getError()`, 'e7b7b895-1de8-4ce1-8ca3-315b4118ce18', {
      parameters,
    });

    if (!('error' in parameters) || !isNonEmptyString(parameters.error)) {
      const error = new InvalidRequestError('Invalid parameter "error".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "error"`,
        '175ffdb6-cdda-480d-8523-8e211f399b6a',
        { parameters },
        error,
      );

      throw error;
    }

    if (!('error_description' in parameters) || !isNonEmptyString(parameters.error_description)) {
      const error = new InvalidRequestError('Invalid parameter "error_description".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "error_description"`,
        '575214ec-e871-487a-9e2b-7b2c71450d1c',
        { parameters },
        error,
      );

      throw error;
    }

    const error: IdentityProviderError = Object.assign<IdentityProviderError, Partial<IdentityProviderError>>(
      Reflect.construct(IdentityProviderError, [parameters.error_description]),
      { error: parameters.error },
    );

    this.logger.debug(`[${this.constructor.name}] Completed getError()`, 'd20ec00d-a995-4aa5-9928-eca1a89b7ecc', {
      parameters,
      error,
    });

    return error;
  }
  // #endregion
}
