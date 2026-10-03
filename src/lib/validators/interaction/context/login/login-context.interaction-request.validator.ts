import { Injectable, InjectAll } from '@guarani/di';
import { isNonEmptyString } from '@guarani/primitives';

import { LoginContextInteractionContext } from '../../../../context/interaction/context/login/login-context.interaction-context';
import { DataAccess } from '../../../../data-access/data-access';
import { Client } from '../../../../entities/client';
import { Grant } from '../../../../entities/grant';
import { AccessDeniedError } from '../../../../errors/access-denied/access-denied.error';
import { InvalidRequestError } from '../../../../errors/invalid-request/invalid-request.error';
import { HttpRequest } from '../../../../http/request/http-request';
import { InteractionType } from '../../../../interaction-types/interaction-type';
import { InteractionTypeName } from '../../../../interaction-types/interaction-type-name.type';
import { Logger } from '../../../../logger/logger';
import { LoginContextInteractionRequest } from '../../../../requests/interaction/context/login/login-context.interaction-request';
import { secureStringCompare } from '../../../../utils/secure-string-compare/secure-string-compare';
import { ContextInteractionRequestValidator } from '../context.interaction-request.validator';

/**
 * Implementation of the Login Context Interaction Request Validator.
 */
@Injectable()
export class LoginContextInteractionRequestValidator extends ContextInteractionRequestValidator<LoginContextInteractionContext> {
  /**
   * Name of the Interaction Type that uses this Validator.
   */
  public readonly name: InteractionTypeName = 'login';

  /**
   * Instantiates a new Login Context Interaction Request Validator.
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
  public override async validate(request: HttpRequest): Promise<LoginContextInteractionContext> {
    this.logger.debug(`[${this.constructor.name}] Called validate()`, 'a61490e8-eeff-4f28-8d24-709ea3f035fc', {
      request,
    });

    const context = await super.validate(request);
    const grant = await this.getGrant(context.parameters, context.client);

    Object.assign<LoginContextInteractionContext, Partial<LoginContextInteractionContext>>(context, { grant });

    this.logger.debug(`[${this.constructor.name}] Completed validate()`, '2df74cbe-a8a4-4c44-a13f-a102b4a34429', {
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
  private async getGrant(parameters: LoginContextInteractionRequest, client: Client): Promise<Grant> {
    this.logger.debug(`[${this.constructor.name}] Called getGrant()`, '3a0a556f-24dd-4046-86ee-77cd050ac20a', {
      parameters,
      client,
    });

    if (!('login_challenge' in parameters) || !isNonEmptyString(parameters.login_challenge)) {
      const error = new InvalidRequestError('Invalid parameter "login_challenge".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "login_challenge"`,
        'be8f4a90-f87f-47e8-be43-e012812de4a5',
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
        '9f341c1d-289e-44df-a7cf-cb217c7e3d5c',
        { parameters, client },
        error,
      );

      throw error;
    }

    if (!secureStringCompare(grant.client.id, client.id)) {
      const error = new AccessDeniedError('Invalid Login Challenge.');

      this.logger.error(
        `[${this.constructor.name}] The Grant was not issued to this Client`,
        '377d13f6-103e-4876-971e-8fc930a5f4fc',
        { parameters, client },
        error,
      );

      throw error;
    }

    this.logger.debug(`[${this.constructor.name}] Completed getGrant()`, '15f84b15-f763-4164-8cb1-d88af7a52598', {
      parameters,
      client,
      grant,
    });

    return grant;
  }
}
