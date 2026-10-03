import { DecisionInteractionContext } from '../../../context/interaction/decision/decision.interaction-context';
import { ClientAuthenticationHandler } from '../../../handlers/client-authentication/client-authentication.handler';
import { HttpRequest } from '../../../http/request/http-request';
import { InteractionType } from '../../../interaction-types/interaction-type';
import { InteractionTypeName } from '../../../interaction-types/interaction-type-name.type';
import { Logger } from '../../../logger/logger';
import { DecisionInteractionRequest } from '../../../requests/interaction/decision/decision.interaction-request';

/**
 * Implementation of the Decision Interaction Request Validator.
 */
export abstract class DecisionInteractionRequestValidator<
  TContext extends DecisionInteractionContext = DecisionInteractionContext,
> {
  /**
   * Name of the Interaction Type that uses this Validator.
   */
  public abstract readonly name: InteractionTypeName;

  /**
   * Instantiates a new Decision Interaction Request Validator.
   *
   * @param logger Logger of the Identity Provider.
   * @param clientAuthenticationHandler Client Authentication Handler of the Identity Provider.
   * @param interactionTypes Interaction Types registered at the Identity Provider.
   */
  public constructor(
    protected readonly logger: Logger,
    protected readonly clientAuthenticationHandler: ClientAuthenticationHandler,
    protected readonly interactionTypes: InteractionType[],
  ) {}

  /**
   * Validates the Http Decision Interaction Request and returns the actors of the Decision Interaction Context.
   *
   * @param request Http Request.
   * @throws {IdentityProviderError} An error occurred when validating the Http Request.
   * @returns Decision Interaction Context.
   */
  public async validate(request: HttpRequest): Promise<TContext> {
    this.logger.debug(`[${this.constructor.name}] Called validate()`, 'ce73eb12-ff1a-4da2-abdd-db137168413c', {
      request,
    });

    const parameters = request.form<DecisionInteractionRequest>();

    const interactionType = this.getInteractionType(parameters);
    const client = await this.clientAuthenticationHandler.authenticate(request);

    const context = { parameters, interactionType, client } as TContext;

    this.logger.debug(`[${this.constructor.name}] Completed validate()`, 'ec389e44-5119-441b-86c4-66e76e029a20', {
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
  private getInteractionType(parameters: DecisionInteractionRequest): InteractionType {
    this.logger.debug(
      `[${this.constructor.name}] Called getInteractionType()`,
      '669c1f50-f60f-4332-aa67-0847c2ce006f',
      { parameters },
    );

    const interactionType = this.interactionTypes.find((interactionType) => {
      return interactionType.name === parameters.interaction_type;
    })!;

    this.logger.debug(
      `[${this.constructor.name}] Completed getInteractionType()`,
      '707f8cfb-5430-427a-bfc3-55b89079509e',
      { parameters },
    );

    return interactionType;
  }
}
