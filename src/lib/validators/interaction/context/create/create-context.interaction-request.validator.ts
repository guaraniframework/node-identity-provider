import { Injectable, InjectAll } from '@guarani/di';
import { isNonEmptyString } from '@guarani/primitives';

import { CreateContextInteractionContext } from '../../../../context/interaction/context/create/create-context.interaction-context';
import { DataAccess } from '../../../../data-access/data-access';
import { Client } from '../../../../entities/client';
import { Grant } from '../../../../entities/grant';
import { AccessDeniedError } from '../../../../errors/access-denied/access-denied.error';
import { InvalidRequestError } from '../../../../errors/invalid-request/invalid-request.error';
import { HttpRequest } from '../../../../http/request/http-request';
import { InteractionType } from '../../../../interaction-types/interaction-type';
import { InteractionTypeName } from '../../../../interaction-types/interaction-type-name.type';
import { Logger } from '../../../../logger/logger';
import { CreateContextInteractionRequest } from '../../../../requests/interaction/context/create/create-context.interaction-request';
import { secureStringCompare } from '../../../../utils/secure-string-compare/secure-string-compare';
import { ContextInteractionRequestValidator } from '../context.interaction-request.validator';

/**
 * Implementation of the Create Context Interaction Request Validator.
 */
@Injectable()
export class CreateContextInteractionRequestValidator extends ContextInteractionRequestValidator<CreateContextInteractionContext> {
  /**
   * Name of the Interaction Type that uses this Validator.
   */
  public readonly name: InteractionTypeName = 'create';

  /**
   * Instantiates a new Create Context Interaction Request Validator.
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
  public override async validate(request: HttpRequest): Promise<CreateContextInteractionContext> {
    this.logger.debug(`[${this.constructor.name}] Called validate()`, 'd5ac55dc-2310-4021-b358-947f20a9e663', {
      request,
    });

    const context = await super.validate(request);
    const grant = await this.getGrant(context.parameters, context.client);

    Object.assign<CreateContextInteractionContext, Partial<CreateContextInteractionContext>>(context, { grant });

    this.logger.debug(`[${this.constructor.name}] Completed validate()`, '814b77c6-feab-4cf5-a5cd-69e4d8de5b80', {
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
  private async getGrant(parameters: CreateContextInteractionRequest, client: Client): Promise<Grant> {
    this.logger.debug(`[${this.constructor.name}] Called getGrant()`, 'fe617fa3-1ad0-413e-8d1c-d436843d38ed', {
      parameters,
      client,
    });

    if (!('login_challenge' in parameters) || !isNonEmptyString(parameters.login_challenge)) {
      const error = new InvalidRequestError('Invalid parameter "login_challenge".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "login_challenge"`,
        '48003fdf-53f8-43ea-aa9b-12ce30566454',
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
        '809a7cdd-1aa9-4a00-90e9-6f47c6e0a0b6',
        { parameters, client },
        error,
      );

      throw error;
    }

    if (!secureStringCompare(grant.client.id, client.id)) {
      const error = new AccessDeniedError('Invalid Login Challenge.');

      this.logger.error(
        `[${this.constructor.name}] The Grant was not issued to this Client`,
        '2aa14a3a-4930-410c-8b2c-a21c780ac87b',
        { parameters, client },
        error,
      );

      throw error;
    }

    this.logger.debug(`[${this.constructor.name}] Completed getGrant()`, 'ddf47108-a14c-47da-bec2-6706a1ca679d', {
      parameters,
      client,
      grant,
    });

    return grant;
  }
}
