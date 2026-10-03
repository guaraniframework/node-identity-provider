import { Injectable, InjectAll } from '@guarani/di';
import { isNonEmptyString } from '@guarani/primitives';

import { CreateDecisionInteractionContext } from '../../../../context/interaction/decision/create/create-decision.interaction-context';
import { DataAccess } from '../../../../data-access/data-access';
import { Client } from '../../../../entities/client';
import { Grant } from '../../../../entities/grant';
import { AccessDeniedError } from '../../../../errors/access-denied/access-denied.error';
import { InvalidRequestError } from '../../../../errors/invalid-request/invalid-request.error';
import { ClientAuthenticationHandler } from '../../../../handlers/client-authentication/client-authentication.handler';
import { HttpRequest } from '../../../../http/request/http-request';
import { InteractionType } from '../../../../interaction-types/interaction-type';
import { InteractionTypeName } from '../../../../interaction-types/interaction-type-name.type';
import { Logger } from '../../../../logger/logger';
import { CreateDecisionInteractionRequest } from '../../../../requests/interaction/decision/create/create-decision.interaction-request';
import { secureStringCompare } from '../../../../utils/secure-string-compare/secure-string-compare';
import { DecisionInteractionRequestValidator } from '../decision.interaction-request.validator';

/**
 * Implementation of the Create Decision Interaction Request Validator.
 */
@Injectable()
export class CreateDecisionInteractionRequestValidator extends DecisionInteractionRequestValidator<CreateDecisionInteractionContext> {
  /**
   * Name of the Interaction Type that uses this Validator.
   */
  public readonly name: InteractionTypeName = 'create';

  /**
   * Instantiates a new Create Decision Interaction Request Validator.
   *
   * @param logger Logger of the Identity Provider.
   * @param dataAccess Data Access of the Identity Provider.
   * @param clientAuthenticationHandler Client Authentication Handler of the Identity Provider.
   * @param interactionTypes Interaction Types registered at the Identity Provider.
   */
  public constructor(
    protected override readonly logger: Logger,
    private readonly dataAccess: DataAccess,
    protected override readonly clientAuthenticationHandler: ClientAuthenticationHandler,
    @InjectAll(InteractionType) protected override readonly interactionTypes: InteractionType[],
  ) {
    super(logger, clientAuthenticationHandler, interactionTypes);
  }

  /**
   * Validates the Http Decision Interaction Request and returns the actors of the Decision Interaction Context.
   *
   * @param request Http Request.
   * @throws {InvalidRequestError} The provided parameter "login_challenge" is invalid.
   * @throws {AccessDeniedError} Could not find a Grant based on the provided Login Challenge.
   * @returns Decision Interaction Context.
   */
  public override async validate(request: HttpRequest): Promise<CreateDecisionInteractionContext> {
    this.logger.debug(`[${this.constructor.name}] Called validate()`, 'ab32fc37-1ed7-42e8-af0e-efbafb1324b1', {
      request,
    });

    const context = await super.validate(request);

    const grant = await this.getGrant(context.parameters, context.client);
    const { interaction_type: _, login_challenge: __, ...data } = context.parameters;

    Object.assign<CreateDecisionInteractionContext, Partial<CreateDecisionInteractionContext>>(context, {
      grant,
      data,
    });

    this.logger.debug(`[${this.constructor.name}] Completed validate()`, '1ef54540-64da-458f-a89d-cfc4659e4078', {
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
  private async getGrant(parameters: CreateDecisionInteractionRequest, client: Client): Promise<Grant> {
    this.logger.debug(`[${this.constructor.name}] Called getGrant()`, '6b9a55cf-05ca-46a3-82db-ab07ee069c9d', {
      parameters,
      client,
    });

    if (!('login_challenge' in parameters) || !isNonEmptyString(parameters.login_challenge)) {
      const error = new InvalidRequestError('Invalid parameter "login_challenge".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "login_challenge"`,
        '47818932-4e0e-4142-961f-f1057d9bef15',
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
        '5ab65044-b4e6-4bf0-b5d4-d3770087dba2',
        { parameters, client },
        error,
      );

      throw error;
    }

    if (!secureStringCompare(grant.client.id, client.id)) {
      const error = new AccessDeniedError('Invalid Login Challenge.');

      this.logger.error(
        `[${this.constructor.name}] The Grant was not issued to this Client`,
        'c7e03e04-8801-48fa-9046-fd1602d5698d',
        { parameters, client },
        error,
      );

      throw error;
    }

    this.logger.debug(`[${this.constructor.name}] Completed getGrant()`, 'c1db5b5a-9b93-4f74-aa92-2d86873d58a0', {
      parameters,
      client,
      grant,
    });

    return grant;
  }
}
