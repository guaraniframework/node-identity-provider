import { Injectable, InjectAll } from '@guarani/di';
import { isNonEmptyString } from '@guarani/primitives';

import { ConsentContextInteractionContext } from '../../../../context/interaction/context/consent/consent-context.interaction-context';
import { DataAccess } from '../../../../data-access/data-access';
import { Client } from '../../../../entities/client';
import { Grant } from '../../../../entities/grant';
import { AccessDeniedError } from '../../../../errors/access-denied/access-denied.error';
import { InvalidRequestError } from '../../../../errors/invalid-request/invalid-request.error';
import { HttpRequest } from '../../../../http/request/http-request';
import { InteractionType } from '../../../../interaction-types/interaction-type';
import { InteractionTypeName } from '../../../../interaction-types/interaction-type-name.type';
import { Logger } from '../../../../logger/logger';
import { ConsentContextInteractionRequest } from '../../../../requests/interaction/context/consent/consent-context.interaction-request';
import { secureStringCompare } from '../../../../utils/secure-string-compare/secure-string-compare';
import { ContextInteractionRequestValidator } from '../context.interaction-request.validator';

/**
 * Implementation of the Consent Context Interaction Request Validator.
 */
@Injectable()
export class ConsentContextInteractionRequestValidator extends ContextInteractionRequestValidator<ConsentContextInteractionContext> {
  /**
   * Name of the Interaction Type that uses this Validator.
   */
  public readonly name: InteractionTypeName = 'consent';

  /**
   * Instantiates a new Consent Context Interaction Request Validator.
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
   * @throws {InvalidRequestError} The provided parameter "consent_challenge" is invalid.
   * @throws {AccessDeniedError} Could not find a Grant based on the provided Consent Challenge.
   * @returns Context Interaction Context.
   */
  public override async validate(request: HttpRequest): Promise<ConsentContextInteractionContext> {
    this.logger.debug(`[${this.constructor.name}] Called validate()`, '91cf4d67-4bf8-496b-9bb4-a2a2e1ee1682', {
      request,
    });

    const context = await super.validate(request);
    const grant = await this.getGrant(context.parameters, context.client);

    Object.assign<ConsentContextInteractionContext, Partial<ConsentContextInteractionContext>>(context, { grant });

    this.logger.debug(`[${this.constructor.name}] Completed validate()`, '910f65fc-6f38-47e6-ad43-2a6a0dfb201d', {
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
  private async getGrant(parameters: ConsentContextInteractionRequest, client: Client): Promise<Grant> {
    this.logger.debug(`[${this.constructor.name}] Called getGrant()`, 'd0167c21-0a57-4882-b183-b1d5f89519cf', {
      parameters,
      client,
    });

    if (!('consent_challenge' in parameters) || !isNonEmptyString(parameters.consent_challenge)) {
      const error = new InvalidRequestError('Invalid parameter "consent_challenge".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "consent_challenge"`,
        'f23bd294-4050-4587-b082-a0602c60d831',
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
        '0694bac5-ddf7-4045-9aed-b61086e3e18b',
        { parameters, client },
        error,
      );

      throw error;
    }

    if (!secureStringCompare(grant.client.id, client.id)) {
      const error = new AccessDeniedError('Invalid Consent Challenge.');

      this.logger.error(
        `[${this.constructor.name}] The Grant was not issued to this Client`,
        'f2a39eda-ffd9-4e7f-8e6a-81b590aae025',
        { parameters, client },
        error,
      );

      throw error;
    }

    this.logger.debug(`[${this.constructor.name}] Completed getGrant()`, '553759d8-1d65-4b16-b84b-19f8c792f4a7', {
      parameters,
      client,
      grant,
    });

    return grant;
  }
}
