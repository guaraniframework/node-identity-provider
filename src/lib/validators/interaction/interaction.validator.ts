import { InteractionContext } from '../../context/interaction/interaction-context';
import { EndpointName } from '../../endpoints/endpoint-name.type';
import { HttpRequest } from '../../http/request/http-request';
import { HttpRequestMethod } from '../../http/request/http-request-method.enum';
import { InteractionType } from '../../interaction-types/interaction-type';
import { InteractionTypeName } from '../../interaction-types/interaction-type-name.type';
import { Logger } from '../../loggers/logger';
import { InteractionRequest } from '../../requests/interaction/interaction-request';
import { Validator } from '../validator';

/**
 * Implementation of the Interaction Validator.
 *
 * It parses the Parameters of the Interaction Request and populates its actors.
 */
export abstract class InteractionValidator<
  TContext extends InteractionContext = InteractionContext,
> extends Validator<TContext> {
  /**
   * Name of the Interaction Type that uses this Validator.
   */
  public abstract readonly name: InteractionTypeName;

  /**
   * Name of the Endpoint that uses this Validator.
   */
  public readonly endpoint: EndpointName = 'interaction';

  /**
   * Http Request Methods supported by the Validator.
   */
  public readonly supportedHttpRequestMethods: HttpRequestMethod[] = [HttpRequestMethod.GET, HttpRequestMethod.POST];

  /**
   * Instantiates a new Interaction Validator.
   *
   * @param logger Logger of the Identity Provider.
   * @param interactionTypes Interaction Types of the Identity Provider.
   */
  public constructor(
    protected override readonly logger: Logger,
    protected readonly interactionTypes: InteractionType[],
  ) {
    super(logger);
  }

  /**
   * Validates the Interaction Http Request and returns the actors of the Interaction Context.
   *
   * @param request Http Request.
   * @throws {IdentityProviderError} An error occurred when validating the Http Request.
   * @returns Interaction Context.
   */
  public override async validate(request: HttpRequest): Promise<TContext> {
    this.logger.debug(`[${this.constructor.name}] Called validate()`, '7cff13ce-d172-49a2-80a2-20bb86ee68ba', {
      request,
    });

    this.checkHttpRequestMethod(request);

    const context = {} as TContext;

    this.logger.debug(`[${this.constructor.name}] Completed validate()`, '19f2afed-695c-492e-af97-c05b47a57882', {
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
  protected getInteractionType(parameters: InteractionRequest): InteractionType {
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
