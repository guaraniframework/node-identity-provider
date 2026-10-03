import { isNonEmptyString } from '@guarani/primitives';

import { ContextInteractionContext } from '../../../context/interaction/context/context.interaction-context';
import { DataAccess } from '../../../data-access/data-access';
import { Client } from '../../../entities/client';
import { InvalidClientError } from '../../../errors/invalid-client/invalid-client.error';
import { InvalidRequestError } from '../../../errors/invalid-request/invalid-request.error';
import { HttpRequest } from '../../../http/request/http-request';
import { InteractionType } from '../../../interaction-types/interaction-type';
import { InteractionTypeName } from '../../../interaction-types/interaction-type-name.type';
import { Logger } from '../../../logger/logger';
import { ContextInteractionRequest } from '../../../requests/interaction/context/context.interaction-request';

/**
 * Implementation of the Context Interaction Request Validator.
 */
export abstract class ContextInteractionRequestValidator<
  TContext extends ContextInteractionContext = ContextInteractionContext,
> {
  /**
   * Name of the Interaction Type that uses this Validator.
   */
  public abstract readonly name: InteractionTypeName;

  /**
   * Instantiates a new Context Interaction Request Validator.
   *
   * @param logger Logger of the Identity Provider.
   * @param dataAccess Data Access of the Identity Provider.
   * @param interactionTypes Interaction Types registered at the Identity Provider.
   */
  public constructor(
    protected readonly logger: Logger,
    protected readonly dataAccess: DataAccess,
    protected readonly interactionTypes: InteractionType[],
  ) {}

  /**
   * Validates the Http Context Interaction Request and returns the actors of the Context Interaction Context.
   *
   * @param request Http Request.
   * @throws {IdentityProviderError} An error occurred when validating the Http Request.
   * @returns Context Interaction Context.
   */
  public async validate(request: HttpRequest): Promise<TContext> {
    this.logger.debug(`[${this.constructor.name}] Called validate()`, '1047927f-ace9-4349-8070-2b2145abcce3', {
      request,
    });

    const parameters = request.query as ContextInteractionRequest;

    const interactionType = this.getInteractionType(parameters);
    const client = await this.getClient(parameters);

    const context = { parameters, interactionType, client } as TContext;

    this.logger.debug(`[${this.constructor.name}] Completed validate()`, '44c8f530-6d47-4deb-883e-3d6377e59d35', {
      request,
      context,
    });

    return context;
  }

  /**
   * Retrieves the Interaction Type requested by the Client.
   *
   * @param parameters Parameters of the Interaction Request.
   * @returns Interaction Type.
   */
  private getInteractionType(parameters: ContextInteractionRequest): InteractionType {
    this.logger.debug(
      `[${this.constructor.name}] Called getInteractionType()`,
      'ed9c9114-8d20-4e21-bb3b-4b5a4b6e406d',
      { parameters },
    );

    const interactionType = this.interactionTypes.find((interactionType) => {
      return interactionType.name === parameters.interaction_type;
    })!;

    this.logger.debug(
      `[${this.constructor.name}] Completed getInteractionType()`,
      '0745e4b2-95ae-43a2-b465-37f4c3d6ab03',
      { parameters },
    );

    return interactionType;
  }

  /**
   * Fetches a Client from the application's storage based on the provided Client Identifier.
   *
   * @param parameters Parameters of the Authorization Request.
   * @throws {InvalidRequestError} The provided parameter "client_id" is invalid.
   * @throws {InvalidClientError} Failed to find a Client with the provided Client Identifier.
   * @returns Client based on the provided Client Identifier.
   */
  private async getClient(parameters: ContextInteractionRequest): Promise<Client> {
    this.logger.debug(`[${this.constructor.name}] Called getClient()`, '234bc274-3063-4cfe-8eb5-11d66804c4dc', {
      parameters,
    });

    if (!isNonEmptyString(parameters.client_id)) {
      const error = new InvalidRequestError('Invalid parameter "client_id".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "client_id"`,
        '709ad3dd-cf9e-4779-b62e-47b19ca5f76b',
        { parameters },
        error,
      );

      throw error;
    }

    const client = await this.dataAccess.findClientById(parameters.client_id);

    if (!(client instanceof Client)) {
      const error = new InvalidClientError('Invalid Client.');

      this.logger.error(
        `[${this.constructor.name}] Invalid Client`,
        'fba65d38-17bd-4391-90b3-011df1945964',
        { parameters },
        error,
      );

      throw error;
    }

    this.logger.debug(`[${this.constructor.name}] Completed getClient()`, '7575633d-5383-420a-a1ed-7764f1f14cdc', {
      parameters,
      client,
    });

    return client;
  }
}
