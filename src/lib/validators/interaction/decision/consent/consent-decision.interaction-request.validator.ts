import { Injectable, InjectAll } from '@guarani/di';
import { isNonEmptyString } from '@guarani/primitives';

import { ConsentDecisionInteractionContext } from '../../../../context/interaction/decision/consent/consent-decision.interaction-context';
import { ConsentDecisionAcceptInteractionContext } from '../../../../context/interaction/decision/consent/consent-decision-accept.interaction-context';
import { ConsentDecisionDenyInteractionContext } from '../../../../context/interaction/decision/consent/consent-decision-deny.interaction-context';
import { DataAccess } from '../../../../data-access/data-access';
import { Client } from '../../../../entities/client';
import { Grant } from '../../../../entities/grant';
import { AccessDeniedError } from '../../../../errors/access-denied/access-denied.error';
import { IdentityProviderError } from '../../../../errors/identity-provider.error';
import { InvalidRequestError } from '../../../../errors/invalid-request/invalid-request.error';
import { ClientAuthenticationHandler } from '../../../../handlers/client-authentication/client-authentication.handler';
import { ScopeHandler } from '../../../../handlers/scope/scope.handler';
import { HttpRequest } from '../../../../http/request/http-request';
import { InteractionType } from '../../../../interaction-types/interaction-type';
import { InteractionTypeName } from '../../../../interaction-types/interaction-type-name.type';
import { Logger } from '../../../../logger/logger';
import { ConsentDecision } from '../../../../requests/interaction/decision/consent/consent-decision';
import { ConsentDecisionInteractionRequest } from '../../../../requests/interaction/decision/consent/consent-decision.interaction-request';
import { ConsentDecisionAcceptInteractionRequest } from '../../../../requests/interaction/decision/consent/consent-decision-accept.interaction-request';
import { ConsentDecisionDenyInteractionRequest } from '../../../../requests/interaction/decision/consent/consent-decision-deny.interaction-request';
import { secureStringCompare } from '../../../../utils/secure-string-compare/secure-string-compare';
import { DecisionInteractionRequestValidator } from '../decision.interaction-request.validator';

/**
 * Implementation of the Consent Context Interaction Request Validator.
 */
@Injectable()
export class ConsentDecisionInteractionRequestValidator extends DecisionInteractionRequestValidator<ConsentDecisionInteractionContext> {
  /**
   * Name of the Interaction Type that uses this Validator.
   */
  public readonly name: InteractionTypeName = 'consent';

  /**
   * Instantiates a new Consent Context Interaction Request Validator.
   *
   * @param logger Logger of the Identity Provider.
   * @param dataAccess Data Access of the Identity Provider.
   * @param clientAuthenticationHandler Client Authentication Handler of the Identity Provider.
   * @param scopeHandler Scope Handler of the Identity Provider.
   * @param interactionTypes Interaction Types registered at the Identity Provider.
   */
  public constructor(
    protected override readonly logger: Logger,
    private readonly dataAccess: DataAccess,
    protected override readonly clientAuthenticationHandler: ClientAuthenticationHandler,
    private readonly scopeHandler: ScopeHandler,
    @InjectAll(InteractionType) protected override readonly interactionTypes: InteractionType[],
  ) {
    super(logger, clientAuthenticationHandler, interactionTypes);
  }

  /**
   * Validates the Http Context Interaction Request and returns the actors of the Context Interaction Context.
   *
   * @param request Http Request.
   * @throws {InvalidRequestError} The provided parameter "consent_challenge" is invalid.
   * @throws {AccessDeniedError} Could not find a Grant based on the provided Consent Challenge.
   * @returns Context Interaction Context.
   */
  public override async validate(request: HttpRequest): Promise<ConsentDecisionInteractionContext> {
    this.logger.debug(`[${this.constructor.name}] Called validate()`, '322126e9-8090-4ff2-9dab-dffdfa8563cb', {
      request,
    });

    const context = await super.validate(request);
    const grant = await this.getGrant(context.parameters, context.client);
    const decision = this.getDecision(context.parameters);

    Object.assign<ConsentDecisionInteractionContext, Partial<ConsentDecisionInteractionContext>>(context, {
      grant,
      decision,
    });

    switch (decision) {
      case 'accept': {
        const parameters = context.parameters as ConsentDecisionAcceptInteractionRequest;
        const grantedScopes = this.getGrantedScopes(parameters, grant);

        Object.assign<ConsentDecisionInteractionContext, Partial<ConsentDecisionAcceptInteractionContext>>(context, {
          grantedScopes,
        });

        break;
      }

      case 'deny': {
        const parameters = context.parameters as ConsentDecisionDenyInteractionRequest;
        const error = this.getError(parameters);

        Object.assign<ConsentDecisionInteractionContext, Partial<ConsentDecisionDenyInteractionContext>>(context, {
          error,
        });

        break;
      }
    }

    this.logger.debug(`[${this.constructor.name}] Completed validate()`, 'cbc4a6db-8159-49b8-85a2-f4ab9ed68367', {
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
   * @throws {InvalidRequestError} The provided parameter "consent_challenge" is invalid.
   * @throws {AccessDeniedError} Could not find a Grant based on the provided Consent Challenge.
   * @returns Grant based on the provided Consent Challenge.
   */
  private async getGrant(parameters: ConsentDecisionInteractionRequest, client: Client): Promise<Grant> {
    this.logger.debug(`[${this.constructor.name}] Called getGrant()`, 'd96a5e4b-6a14-4367-8e7a-82be6c8a57a9', {
      parameters,
      client,
    });

    if (!('consent_challenge' in parameters) || !isNonEmptyString(parameters.consent_challenge)) {
      const error = new InvalidRequestError('Invalid parameter "consent_challenge".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "consent_challenge"`,
        'e93cd171-debc-480c-a17b-92da2cfe263d',
        { parameters, client },
        error,
      );

      throw error;
    }

    const grant = await this.dataAccess.findGrantByConsentChallenge(parameters.consent_challenge);

    if (!(grant instanceof Grant)) {
      const error = new AccessDeniedError('Invalid Consent Challenge.');

      this.logger.error(
        `[${this.constructor.name}] Invalid Consent Challenge`,
        '4e7a0b47-797e-4e8f-a716-10923b9b70c0',
        { parameters, client },
        error,
      );

      throw error;
    }

    if (!secureStringCompare(grant.client.id, client.id)) {
      const error = new AccessDeniedError('Invalid Consent Challenge.');

      this.logger.error(
        `[${this.constructor.name}] The Grant was not issued to this Client`,
        'ea6a88c5-adb4-4f54-8f97-879c848b1b31',
        { parameters, client },
        error,
      );

      throw error;
    }

    this.logger.debug(`[${this.constructor.name}] Completed getGrant()`, 'ee65e685-bb0d-45e3-bf75-2e607b193f48', {
      parameters,
      client,
      grant,
    });

    return grant;
  }

  /**
   * Checks and returns the Consent Decision provided by the Client.
   *
   * @param parameters Parameters of the Interaction Request.
   * @throws {InvalidRequestError} The provided parameter "decision" is invalid or unsupported.
   * @returns Consent Decision provided by the Client.
   */
  private getDecision(parameters: ConsentDecisionInteractionRequest): ConsentDecision {
    this.logger.debug(`[${this.constructor.name}] Called getDecision()`, 'cc44c147-4b8c-4bf9-b926-a2e9223c2840', {
      parameters,
    });

    if (!('decision' in parameters) || !isNonEmptyString(parameters.decision)) {
      const error = new InvalidRequestError('Invalid parameter "decision".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "decision"`,
        '2958a9e8-2244-4121-92b2-e8f5e3d867d9',
        { parameters },
        error,
      );

      throw error;
    }

    if (parameters.decision !== 'accept' && parameters.decision !== 'deny') {
      const error = new InvalidRequestError(`Unsupported decision "${parameters.decision}".`);

      this.logger.error(
        `[${this.constructor.name}] Unsupported decision "${parameters.decision}"`,
        'ce5998f9-46da-4e44-9c21-9cfb77c3502e',
        { parameters },
        error,
      );

      throw error;
    }

    this.logger.debug(`[${this.constructor.name}] Completed getDecision()`, 'd5c0e1ad-8f78-45f7-a1b1-bee0aab1907a', {
      parameters,
      decision: parameters.decision,
    });

    return parameters.decision;
  }

  // #region Decision Accept
  /**
   * Checks and returns the scopes granted by the User.
   *
   * @param parameters Parameters of the Interaction Request.
   * @throws {InvalidRequestError} The provided parameter "granted_scope" is invalid or unsupported.
   * @throws {AccessDeniedError} The User granted a Scope not requested by the Client.
   * @returns Scopes grated by the User.
   */
  private getGrantedScopes(parameters: ConsentDecisionAcceptInteractionRequest, grant: Grant): string[] {
    this.logger.debug(`[${this.constructor.name}] Called getGrantedScopes()`, '0090a107-902f-4667-84a7-b79c6dc2cd2d', {
      parameters,
      grant,
    });

    if (!('granted_scope' in parameters) || !isNonEmptyString(parameters.granted_scope)) {
      const error = new InvalidRequestError('Invalid parameter "granted_scope".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "granted_scope"`,
        '9e47d7de-1242-40e2-9f72-102e2ebdb507',
        { parameters, grant },
        error,
      );

      throw error;
    }

    const grantedScopes = parameters.granted_scope.split(' ');
    this.scopeHandler.checkRequestedScope(grantedScopes);
    const requestedScopes = grant.parameters.scope.split(' ');

    grantedScopes.forEach((grantedScope) => {
      if (!requestedScopes.includes(grantedScope)) {
        const error = new AccessDeniedError(`The scope "${grantedScope}" was not requested by the Client.`);

        this.logger.error(
          `[${this.constructor.name}] The scope "${grantedScope}" was not requested by the Client`,
          '37aed28e-2f3b-4b24-8cb1-1438cc647cd5',
          { parameters, grant },
          error,
        );

        throw error;
      }
    });

    this.logger.debug(
      `[${this.constructor.name}] Completed getGrantedScopes()`,
      'c60bb988-1f8d-4e1d-a639-42eefadeab77',
      { parameters, grant, granted_scopes: grantedScopes },
    );

    return grantedScopes;
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
  private getError(parameters: ConsentDecisionDenyInteractionRequest): IdentityProviderError {
    this.logger.debug(`[${this.constructor.name}] Called getError()`, '81e397d8-934e-4b85-bf41-aca4cfeac41e', {
      parameters,
    });

    if (!('error' in parameters) || !isNonEmptyString(parameters.error)) {
      const error = new InvalidRequestError('Invalid parameter "error".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "error"`,
        '735f8d04-b1f7-4425-86b3-02566a142fb8',
        { parameters },
        error,
      );

      throw error;
    }

    if (!('error_description' in parameters) || !isNonEmptyString(parameters.error_description)) {
      const error = new InvalidRequestError('Invalid parameter "error_description".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "error_description"`,
        'eca7594f-d588-4bff-9c92-37dd2aed6870',
        { parameters },
        error,
      );

      throw error;
    }

    const error: IdentityProviderError = Object.assign<IdentityProviderError, Partial<IdentityProviderError>>(
      Reflect.construct(IdentityProviderError, [parameters.error_description]),
      { error: parameters.error },
    );

    this.logger.debug(`[${this.constructor.name}] Completed getError()`, 'd47cec5c-d831-4d34-880c-70f6b4bdb082', {
      parameters,
      error,
    });

    return error;
  }
  // #endregion
}
