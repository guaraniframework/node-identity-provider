import { Injectable, InjectAll } from '@guarani/di';
import { isNonEmptyString } from '@guarani/primitives';

import { SelectAccountContextInteractionContext } from '../../../../context/interaction/context/select-account/select-account-context.interaction-context';
import { DataAccess } from '../../../../data-access/data-access';
import { Client } from '../../../../entities/client';
import { Grant } from '../../../../entities/grant';
import { AccessDeniedError } from '../../../../errors/access-denied/access-denied.error';
import { InvalidRequestError } from '../../../../errors/invalid-request/invalid-request.error';
import { HttpRequest } from '../../../../http/request/http-request';
import { InteractionType } from '../../../../interaction-types/interaction-type';
import { InteractionTypeName } from '../../../../interaction-types/interaction-type-name.type';
import { Logger } from '../../../../logger/logger';
import { SelectAccountContextInteractionRequest } from '../../../../requests/interaction/context/select-account/select-account-context.interaction-request';
import { secureStringCompare } from '../../../../utils/secure-string-compare/secure-string-compare';
import { ContextInteractionRequestValidator } from '../context.interaction-request.validator';

/**
 * Implementation of the Select Account Context Interaction Request Validator.
 */
@Injectable()
export class SelectAccountContextInteractionRequestValidator extends ContextInteractionRequestValidator<SelectAccountContextInteractionContext> {
  /**
   * Name of the Interaction Type that uses this Validator.
   */
  public readonly name: InteractionTypeName = 'select_account';

  /**
   * Instantiates a new Select Account Context Interaction Request Validator.
   *
   * @param logger Logger of the Identity Provider.
   * @param dataAccess Data Access of the Identity Provider.
   * @param interactionTypes Interaction Types registered at the Identity Provider.
   */
  public constructor(
    protected override readonly logger: Logger,
    protected override readonly dataAccess: DataAccess,
    @InjectAll(InteractionType) protected override readonly interactionTypes: InteractionType[],
  ) {
    super(logger, dataAccess, interactionTypes);
  }

  /**
   * Validates the Http Context Interaction Request and returns the actors of the Context Interaction Context.
   *
   * @param request Http Request.
   * @throws {InvalidRequestError} The provided parameter "login_challenge" is invalid.
   * @throws {AccessDeniedError} Could not find a Grant based on the provided Login Challenge.
   * @returns Context Interaction Context.
   */
  public override async validate(request: HttpRequest): Promise<SelectAccountContextInteractionContext> {
    this.logger.debug(`[${this.constructor.name}] Called validate()`, 'e3cc2b61-b418-45d5-b02c-6a31b9180a37', {
      request,
    });

    const context = await super.validate(request);
    const grant = await this.getGrant(context.parameters, context.client);

    Object.assign<SelectAccountContextInteractionContext, Partial<SelectAccountContextInteractionContext>>(context, {
      grant,
    });

    this.logger.debug(`[${this.constructor.name}] Completed validate()`, 'f5653163-ecf2-4b0d-8b92-05f649425a17', {
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
  private async getGrant(parameters: SelectAccountContextInteractionRequest, client: Client): Promise<Grant> {
    this.logger.debug(`[${this.constructor.name}] Called getGrant()`, 'b67f7e09-546b-4aed-a2bb-9e80babba436', {
      parameters,
      client,
    });

    if (!('login_challenge' in parameters) || !isNonEmptyString(parameters.login_challenge)) {
      const error = new InvalidRequestError('Invalid parameter "login_challenge".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "login_challenge"`,
        '9b1dc0be-cdd1-425e-9836-f3337d985df8',
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
        'c62f89d1-b8f2-4e2e-b57d-67a8587bec9d',
        { parameters, client },
        error,
      );

      throw error;
    }

    if (!secureStringCompare(grant.client.id, client.id)) {
      const error = new AccessDeniedError('Invalid Login Challenge.');

      this.logger.error(
        `[${this.constructor.name}] The Grant was not issued to this Client`,
        '7c5b7f2e-e2db-46ce-9f81-988d5554c744',
        { parameters, client },
        error,
      );

      throw error;
    }

    this.logger.debug(`[${this.constructor.name}] Completed getGrant()`, '78205e6c-a9ed-48a0-868e-a7e6d8f83d6d', {
      parameters,
      client,
      grant,
    });

    return grant;
  }
}
