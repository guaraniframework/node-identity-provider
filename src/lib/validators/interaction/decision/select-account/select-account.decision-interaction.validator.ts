import { Injectable, InjectAll } from '@guarani/di';
import { isNonEmptyString } from '@guarani/primitives';

import { ClientAuthentication } from '../../../../client-authentication/client-authentication';
import { INTERACTION_CLIENT_AUTHENTICATION } from '../../../../constants';
import { SelectAccountDecisionInteractionContext } from '../../../../context/interaction/decision/select-account/select-account.decision-interaction-context';
import { DataAccess } from '../../../../data-access/data-access';
import { Client } from '../../../../entities/client';
import { Grant } from '../../../../entities/grant';
import { Login } from '../../../../entities/login';
import { AccessDeniedError } from '../../../../errors/access-denied/access-denied.error';
import { InteractionRequiredError } from '../../../../errors/interaction-required/interaction-required.error';
import { InvalidRequestError } from '../../../../errors/invalid-request/invalid-request.error';
import { ClientAuthenticationHandler } from '../../../../handlers/client-authentication/client-authentication.handler';
import { HttpRequest } from '../../../../http/request/http-request';
import { InteractionType } from '../../../../interaction-types/interaction-type';
import { InteractionTypeName } from '../../../../interaction-types/interaction-type-name.type';
import { Logger } from '../../../../loggers/logger';
import { SelectAccountDecisionInteractionRequest } from '../../../../requests/interaction/decision/select-account/select-account.decision-interaction-request';
import { secureStringCompare } from '../../../../utils/secure-string-compare/secure-string-compare';
import { DecisionInteractionValidator } from '../decision-interaction.validator';

/**
 * Implementation of the Select Account Decision Interaction Validator.
 */
@Injectable()
export class SelectAccountDecisionInteractionValidator extends DecisionInteractionValidator<SelectAccountDecisionInteractionContext> {
  /**
   * Name of the Interaction Type that uses this Validator.
   */
  public readonly name: InteractionTypeName = 'select_account';

  /**
   * Instantiates a new Select Account Decision Interaction Validator.
   *
   * @param logger Logger of the Identity Provider.
   * @param dataAccess Data Access of the Identity Provider.
   * @param clientAuthenticationHandler Client Authentication Handler of the Identity Provider.
   * @param interactionTypes Interaction Types of the Identity Provider.
   * @param clientAuthenticationMethods Interaction Endpoint Client Authentication Methods of the Identity Provider.
   */
  public constructor(
    protected override readonly logger: Logger,
    private readonly dataAccess: DataAccess,
    protected override readonly clientAuthenticationHandler: ClientAuthenticationHandler,
    @InjectAll(InteractionType) protected override readonly interactionTypes: InteractionType[],
    @InjectAll(INTERACTION_CLIENT_AUTHENTICATION)
    protected override readonly clientAuthenticationMethods: ClientAuthentication[],
  ) {
    super(logger, clientAuthenticationHandler, interactionTypes, clientAuthenticationMethods);
  }

  /**
   * Validates the Select Account Decision Interaction Http Request and returns the actors of the Select Account Decision Interaction Context.
   *
   * @param request Http Request.
   * @throws {IdentityProviderError} An error occurred when validating the Http Request.
   * @returns Select Account Decision Interaction Context.
   */
  public override async validate(request: HttpRequest): Promise<SelectAccountDecisionInteractionContext> {
    this.logger.debug(`[${this.constructor.name}] Called validate()`, 'a04e1350-635d-4742-8139-0a997219a617', {
      request,
    });

    const context = await super.validate(request);

    const grant = await this.getGrant(context.parameters, context.client);
    const login = await this.getLogin(context.parameters, grant);

    Object.assign<SelectAccountDecisionInteractionContext, Partial<SelectAccountDecisionInteractionContext>>(context, {
      grant,
      login,
    });

    this.logger.debug(`[${this.constructor.name}] Completed validate()`, '6912a09f-ec59-4ded-9f46-c744cd5fffcd', {
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
  private async getGrant(parameters: SelectAccountDecisionInteractionRequest, client: Client): Promise<Grant> {
    this.logger.debug(`[${this.constructor.name}] Called getGrant()`, '48701142-9462-42f0-b0f0-f52783eceb25', {
      parameters,
      client_id: client.id,
    });

    if (!('login_challenge' in parameters) || !isNonEmptyString(parameters.login_challenge)) {
      const error = new InvalidRequestError('Invalid parameter "login_challenge".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "login_challenge"`,
        '2c588c79-2a0c-4792-894d-6a0aa77616fb',
        { parameters, client_id: client.id },
        error,
      );

      throw error;
    }

    const grant = await this.dataAccess.findGrantByLoginChallenge(parameters.login_challenge);

    if (!(grant instanceof Grant)) {
      const error = new AccessDeniedError('Invalid Login Challenge.');

      this.logger.error(
        `[${this.constructor.name}] Invalid Login Challenge`,
        '5f2827db-0bab-4d40-8411-fc3b5d159cba',
        { parameters, client_id: client.id },
        error,
      );

      throw error;
    }

    if (!secureStringCompare(grant.client.id, client.id)) {
      const error = new AccessDeniedError('Invalid Login Challenge.');

      this.logger.error(
        `[${this.constructor.name}] The Grant was not issued to this Client`,
        'c3eeb57e-2cfa-4fda-a221-a8078c14c5e7',
        { parameters, client_id: client.id },
        error,
      );

      throw error;
    }

    if (new Date() > grant.expiresAt) {
      await this.dataAccess.removeGrant(grant);

      const error = new AccessDeniedError('Invalid Login Challenge.');

      this.logger.error(
        `[${this.constructor.name}] Expired Grant`,
        '1106c4ca-796d-4779-a10b-f9296437c74e',
        { parameters, client_id: client.id },
        error,
      );

      throw error;
    }

    this.logger.debug(`[${this.constructor.name}] Completed getGrant()`, 'c19eead8-0e7e-47e5-803c-5f2c26290109', {
      parameters,
      client_id: client.id,
      grant_id: grant.id,
    });

    return grant;
  }

  /**
   * Fetches the requested Login from the Session of the Grant.
   *
   * @param parameters Parameters of the Interaction Request.
   * @param grant Grant of the Interaction Request.
   * @throws {InteractionRequiredError} Could not find a Login based on the provided Login Identifier.
   * @throws {InvalidRequestError} The provided parameter "login_id" is invalid.
   * @returns Login of the Session based on the provided Login Identifier.
   */
  private async getLogin(parameters: SelectAccountDecisionInteractionRequest, grant: Grant): Promise<Login> {
    this.logger.debug(`[${this.constructor.name}] Called getLogin()`, 'f4921ee4-9363-4e7f-8845-3c05dc715a1d', {
      parameters,
      grant_id: grant.id,
    });

    if (!('login_id' in parameters) || !isNonEmptyString(parameters.login_id)) {
      const error = new InvalidRequestError('Invalid parameter "login_id".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "login_id"`,
        '8e880ded-283c-4e10-9b7f-bdd274530ae9',
        { parameters, grant_id: grant.id },
        error,
      );

      throw error;
    }

    const login = grant.session.logins.find((login) => login.id === parameters.login_id);

    if (!(login instanceof Login)) {
      const error = new InteractionRequiredError('Invalid Login Identifier.');

      this.logger.error(
        `[${this.constructor.name}] Invalid Login Identifier`,
        '9be0a21e-aa0e-4d97-ac99-ef6cc696e4bc',
        { parameters, grant_id: grant.id },
        error,
      );

      throw error;
    }

    if (login.expiresAt instanceof Date && new Date() > login.expiresAt) {
      await this.dataAccess.logout(login, grant.session);

      const error = new InteractionRequiredError('Invalid Login Identifier.');

      this.logger.error(
        `[${this.constructor.name}] Expired Login`,
        'c90b253f-4b57-4d8d-817c-68daa89a3a23',
        { parameters, login_id: login.id },
        error,
      );

      throw error;
    }

    this.logger.debug(`[${this.constructor.name}] Completed getLogin()`, '0eb2c09b-94fd-4031-a8b4-58011799d5bc', {
      parameters,
      grant_id: grant.id,
      login_id: login.id,
    });

    return login;
  }
}
