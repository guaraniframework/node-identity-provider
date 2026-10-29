import { URL } from 'url';

import { Injectable, InjectAll } from '@guarani/di';
import { isNonEmptyString } from '@guarani/primitives';

import { ClientAuthentication } from '../../../../client-authentication/client-authentication';
import { INTERACTION_CLIENT_AUTHENTICATION } from '../../../../constants';
import { ConsentDecisionInteractionContext } from '../../../../context/interaction/decision/consent/consent.decision-interaction-context';
import { ConsentAcceptDecisionInteractionContext } from '../../../../context/interaction/decision/consent/consent-accept.decision-interaction-context';
import { ConsentDenyDecisionInteractionContext } from '../../../../context/interaction/decision/consent/consent-deny.decision-interaction-context';
import { DataAccess } from '../../../../data-access/data-access';
import { Client } from '../../../../entities/client';
import { Grant } from '../../../../entities/grant';
import { Login } from '../../../../entities/login';
import { Scope } from '../../../../entities/scope';
import { AccessDeniedError } from '../../../../errors/access-denied/access-denied.error';
import { AccountSelectionRequiredError } from '../../../../errors/account-selection-required/account-selection-required.error';
import { IdentityProviderError } from '../../../../errors/identity-provider.error';
import { InteractionRequiredError } from '../../../../errors/interaction-required/interaction-required.error';
import { InvalidRequestError } from '../../../../errors/invalid-request/invalid-request.error';
import { LoginRequiredError } from '../../../../errors/login-required/login-required.error';
import { ClientAuthenticationHandler } from '../../../../handlers/client-authentication/client-authentication.handler';
import { ScopeHandler } from '../../../../handlers/scope/scope.handler';
import { HttpRequest } from '../../../../http/request/http-request';
import { InteractionType } from '../../../../interaction-types/interaction-type';
import { InteractionTypeName } from '../../../../interaction-types/interaction-type-name.type';
import { Logger } from '../../../../loggers/logger';
import { ConsentDecision } from '../../../../requests/interaction/decision/consent/consent.decision';
import { ConsentDecisionInteractionRequest } from '../../../../requests/interaction/decision/consent/consent.decision-interaction-request';
import { ConsentAcceptDecisionInteractionRequest } from '../../../../requests/interaction/decision/consent/consent-accept.decision-interaction-request';
import { ConsentDenyDecisionInteractionRequest } from '../../../../requests/interaction/decision/consent/consent-deny.decision-interaction-request';
import { secureStringCompare } from '../../../../utils/secure-string-compare/secure-string-compare';
import { DecisionInteractionValidator } from '../decision-interaction.validator';

/**
 * Implementation of the Consent Decision Interaction Validator.
 */
@Injectable()
export class ConsentDecisionInteractionValidator extends DecisionInteractionValidator<ConsentDecisionInteractionContext> {
  /**
   * Name of the Interaction Type that uses this Validator.
   */
  public readonly name: InteractionTypeName = 'consent';

  /**
   * Instantiates a new Consent Decision Interaction Validator.
   *
   * @param logger Logger of the Identity Provider.
   * @param dataAccess Data Access of the Identity Provider.
   * @param clientAuthenticationHandler Client Authentication Handler of the Identity Provider.
   * @param scopeHandler Scope Handler of the Identity Provider.
   * @param interactionTypes Interaction Types of the Identity Provider.
   * @param clientAuthenticationMethods Interaction Endpoint Client Authentication Methods of the Identity Provider.
   */
  public constructor(
    protected override readonly logger: Logger,
    private readonly dataAccess: DataAccess,
    protected override readonly clientAuthenticationHandler: ClientAuthenticationHandler,
    private readonly scopeHandler: ScopeHandler,
    @InjectAll(InteractionType) protected override readonly interactionTypes: InteractionType[],
    @InjectAll(INTERACTION_CLIENT_AUTHENTICATION)
    protected override readonly clientAuthenticationMethods: ClientAuthentication[],
  ) {
    super(logger, clientAuthenticationHandler, interactionTypes, clientAuthenticationMethods);
  }

  /**
   * Validates the Consent Decision Interaction Http Request and returns the actors of the Consent Decision Interaction Context.
   *
   * @param request Http Request.
   * @throws {IdentityProviderError} An error occurred when validating the Http Request.
   * @returns Consent Decision Interaction Context.
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
        const parameters = context.parameters as ConsentAcceptDecisionInteractionRequest;
        const grantedScopes = await this.getGrantedScopes(parameters, grant);

        Object.assign<ConsentDecisionInteractionContext, Partial<ConsentAcceptDecisionInteractionContext>>(context, {
          grantedScopes,
        });

        break;
      }

      case 'deny': {
        const parameters = context.parameters as ConsentDenyDecisionInteractionRequest;
        const error = this.getError(parameters);

        Object.assign<ConsentDecisionInteractionContext, Partial<ConsentDenyDecisionInteractionContext>>(context, {
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
   * @throws {AccessDeniedError} Could not find a Grant based on the provided Consent Challenge.
   * @throws {InvalidRequestError} The provided parameter "consent_challenge" is invalid.
   * @throws {AccountSelectionRequiredError|InteractionRequiredError|LoginRequiredError} No Active Login found.
   * @returns Grant based on the provided Consent Challenge.
   */
  private async getGrant(parameters: ConsentDecisionInteractionRequest, client: Client): Promise<Grant> {
    this.logger.debug(`[${this.constructor.name}] Called getGrant()`, 'd96a5e4b-6a14-4367-8e7a-82be6c8a57a9', {
      parameters,
      client_id: client.id,
    });

    if (!('consent_challenge' in parameters) || !isNonEmptyString(parameters.consent_challenge)) {
      const error = new InvalidRequestError('Invalid parameter "consent_challenge".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "consent_challenge"`,
        'e93cd171-debc-480c-a17b-92da2cfe263d',
        { parameters, client_id: client.id },
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
        { parameters, client_id: client.id },
        error,
      );

      throw error;
    }

    if (!secureStringCompare(grant.client.id, client.id)) {
      const error = new AccessDeniedError('Invalid Consent Challenge.');

      this.logger.error(
        `[${this.constructor.name}] The Grant was not issued to this Client`,
        'ea6a88c5-adb4-4f54-8f97-879c848b1b31',
        { parameters, client_id: client.id },
        error,
      );

      throw error;
    }

    if (new Date() > grant.expiresAt) {
      await this.dataAccess.removeGrant(grant);

      const error = new AccessDeniedError('Invalid Consent Challenge.');

      this.logger.error(
        `[${this.constructor.name}] Expired Grant`,
        'd25a5b81-c749-49d0-a8e6-1d5d3529d7f6',
        { parameters, client_id: client.id },
        error,
      );

      throw error;
    }

    if (!(grant.session.activeLogin instanceof Login)) {
      await this.dataAccess.removeGrant(grant);

      let error: IdentityProviderError;

      switch (true) {
        case grant.parameters.prompt?.includes('create') === true:
          error = new InteractionRequiredError('Account Creation required.');
          break;

        case grant.parameters.prompt?.includes('select_account') === true:
          error = new AccountSelectionRequiredError('Account Selection required.');
          break;

        default:
          error = new LoginRequiredError('Login required.');
          break;
      }

      this.logger.error(
        `[${this.constructor.name}] No Active Login found`,
        '77c50712-a8f8-4154-bbbb-e028616c149b',
        { parameters, client_id: client.id },
        error,
      );

      throw error;
    }

    this.logger.debug(`[${this.constructor.name}] Completed getGrant()`, 'ee65e685-bb0d-45e3-bf75-2e607b193f48', {
      parameters,
      client_id: client.id,
      grant_id: grant.id,
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
      const error = new InvalidRequestError(`Unsupported Decision "${parameters.decision}".`);

      this.logger.error(
        `[${this.constructor.name}] Unsupported Decision "${parameters.decision}"`,
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

  // #region Accept Decision
  /**
   * Checks and returns the scopes granted by the User.
   *
   * @param parameters Parameters of the Interaction Request.
   * @param grant Grant of the Interaction Request.
   * @throws {AccessDeniedError} The User granted a Scope not requested by the Client.
   * @throws {InvalidRequestError} The provided parameter "granted_scope" is invalid or unsupported.
   * @returns Scopes grated by the User.
   */
  private async getGrantedScopes(parameters: ConsentAcceptDecisionInteractionRequest, grant: Grant): Promise<Scope[]> {
    this.logger.debug(`[${this.constructor.name}] Called getGrantedScopes()`, '0090a107-902f-4667-84a7-b79c6dc2cd2d', {
      parameters,
      grant_id: grant.id,
    });

    if (!('granted_scope' in parameters) || !isNonEmptyString(parameters.granted_scope)) {
      const error = new InvalidRequestError('Invalid parameter "granted_scope".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "granted_scope"`,
        '9e47d7de-1242-40e2-9f72-102e2ebdb507',
        { parameters, grant_id: grant.id },
        error,
      );

      throw error;
    }

    const grantedScopes = parameters.granted_scope.split(' ');
    await this.scopeHandler.checkRequestedScopes(grantedScopes);
    const requestedScopes = grant.parameters.scope.split(' ');

    grantedScopes.forEach((grantedScope) => {
      if (!requestedScopes.includes(grantedScope)) {
        const error = new AccessDeniedError(`The Scope "${grantedScope}" was not requested by the Client.`);

        this.logger.error(
          `[${this.constructor.name}] The Scope "${grantedScope}" was not requested by the Client`,
          '37aed28e-2f3b-4b24-8cb1-1438cc647cd5',
          { parameters, grant_id: grant.id },
          error,
        );

        throw error;
      }
    });

    this.logger.debug(
      `[${this.constructor.name}] Completed getGrantedScopes()`,
      'c60bb988-1f8d-4e1d-a639-42eefadeab77',
      { parameters, grant_id: grant.id, granted_scopes: grantedScopes },
    );

    return await this.dataAccess.getScopesByName(grantedScopes);
  }
  // #endregion

  // #region Deny Decision
  /**
   * Checks and returns the Error Parameters provided by the Client.
   *
   * @param parameters Parameters of the Interaction Request.
   * @throws {InvalidRequestError} One of the provided parameters is invalid.
   * @returns Error object based on the Error Parameters provided by the Client.
   */
  private getError(parameters: ConsentDenyDecisionInteractionRequest): IdentityProviderError {
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

    if ('error_uri' in parameters && (!isNonEmptyString(parameters.error_uri) || !URL.canParse(parameters.error_uri))) {
      const error = new InvalidRequestError('Invalid parameter "error_uri".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "error_uri"`,
        'ad1717d6-8820-4920-ba0c-8270259fcf7a',
        { parameters },
        error,
      );

      throw error;
    }

    const error = new IdentityProviderError(parameters.error, parameters.error_description);

    if ('error_uri' in parameters) {
      error.setUri(parameters.error_uri);
    }

    this.logger.debug(`[${this.constructor.name}] Completed getError()`, 'd47cec5c-d831-4d34-880c-70f6b4bdb082', {
      parameters,
      error,
    });

    return error;
  }
  // #endregion
}
