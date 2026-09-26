import { InteractionContext } from '../../context/interaction/interaction-context';
import { HttpRequest } from '../../http/request/http-request';
import { InteractionType } from '../../interaction-types/interaction-type';
import { InteractionTypeName } from '../../interaction-types/interaction-type-name.type';
import { Logger } from '../../logger/logger';
import { InteractionRequest } from '../../requests/interaction/interaction-request';

/**
 * Implementation of the Interaction Request Validator.
 */
export abstract class InteractionRequestValidator<
  TContextContext extends InteractionContext = InteractionContext,
  TDecisionContext extends InteractionContext = InteractionContext,
> {
  /**
   * Name of the Interaction Type that uses this Validator.
   */
  public abstract readonly name: InteractionTypeName;

  /**
   * Instantiates a new Interaction Request Validator.
   *
   * @param logger Logger of the Identity Provider.
   * @param interactionTypes Interaction Types registered at the Identity Provider.
   */
  public constructor(
    protected readonly logger: Logger,
    protected readonly interactionTypes: InteractionType[],
  ) {}

  /**
   * Validates the Http Context Interaction Request and returns the actors of the Context Interaction Context.
   *
   * @param request Http Request.
   * @returns Context Interaction Context.
   */
  public async validateContext(request: HttpRequest): Promise<TContextContext> {
    this.logger.debug(`[${this.constructor.name}] Called validateContext()`, '1047927f-ace9-4349-8070-2b2145abcce3', {
      request,
    });

    const parameters = request.query as InteractionRequest;
    const interactionType = this.getInteractionType(parameters);

    const context = { parameters, interactionType } as TContextContext;

    this.logger.debug(
      `[${this.constructor.name}] Completed validateContext()`,
      '44c8f530-6d47-4deb-883e-3d6377e59d35',
      { request, context },
    );

    return context;
  }

  /**
   * Validates the Http Decision Interaction Request and returns the actors of the Decision Interaction Context.
   *
   * @param request Http Request.
   * @returns Decision Interaction Context.
   */
  public async validateDecision(request: HttpRequest): Promise<TDecisionContext> {
    this.logger.debug(`[${this.constructor.name}] Called validateDecision()`, 'e9f38d61-dc97-440b-9e10-282449effed2', {
      request,
    });

    const parameters = request.form<InteractionRequest>();
    const interactionType = this.getInteractionType(parameters);

    const context = { parameters, interactionType } as TDecisionContext;

    this.logger.debug(
      `[${this.constructor.name}] Completed validateDecision()`,
      'f260a6ff-a526-4145-b949-834d0a7e4a5e',
      { request, context },
    );

    return context;
  }

  /**
   * Retrieves the Interaction Type requested by the Client.
   *
   * @param parameters Parameters of the Interaction Request.
   * @returns Interaction Type.
   */
  private getInteractionType(parameters: InteractionRequest): InteractionType {
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
}
