import { OutgoingHttpHeaders } from 'http';

import { Injectable, InjectAll } from '@guarani/di';
import { isNonEmptyString, removeNullishValues } from '@guarani/primitives';

import { InvalidRequestError } from '../../errors/invalid-request/invalid-request.error';
import { UnsupportedInteractionTypeError } from '../../errors/unsupported-interaction-type/unsupported-interaction-type.error';
import { HttpRequest } from '../../http/request/http-request';
import { HttpRequestMethod } from '../../http/request/http-request-method.enum';
import { HttpResponse } from '../../http/response/http-response';
import { HttpRoute } from '../../http/route/http-route';
import { Logger } from '../../loggers/logger';
import { ContextInteractionRequest } from '../../requests/interaction/context/context-interaction-request';
import { DecisionInteractionRequest } from '../../requests/interaction/decision/decision-interaction-request';
import { asIdentityProviderError } from '../../utils/as-identity-provider-error/as-identity-provider-error';
import { ContextInteractionValidator } from '../../validators/interaction/context/context-interaction.validator';
import { DecisionInteractionValidator } from '../../validators/interaction/decision/decision-interaction.validator';
import { Endpoint } from '../endpoint';
import { EndpointName } from '../endpoint-name.type';

/**
 * Implementation of the Interaction Endpoint.
 *
 * This Endpoint is used to allow the User to perform the necessary interactions for the Authorization Process.
 */
@Injectable()
export class InteractionEndpoint extends Endpoint {
  /**
   * Name of the Endpoint.
   */
  public readonly name: EndpointName = 'interaction';

  /**
   * Path of the Endpoint.
   */
  public readonly path: string = '/oidc/interaction';

  /**
   * Http Routes of the Endpoint.
   */
  public readonly routes: HttpRoute[] = [
    { method: HttpRequestMethod.GET, handler: this.handleContext },
    { method: HttpRequestMethod.POST, handler: this.handleDecision },
  ];

  /**
   * Default Http Headers to be included in the Response.
   */
  private readonly headers: OutgoingHttpHeaders = { 'cache-control': 'no-store', pragma: 'no-cache' };

  /**
   * Instantiates a new Interaction Endpoint.
   *
   * @param logger Logger of the Identity Provider.
   * @param contextValidators Context Interaction Validators of the Identity Provider.
   * @param decisionValidators Decision Interaction Validators of the Identity Provider.
   */
  public constructor(
    private readonly logger: Logger,
    @InjectAll(ContextInteractionValidator)
    private readonly contextValidators: ContextInteractionValidator[],
    @InjectAll(DecisionInteractionValidator)
    private readonly decisionValidators: DecisionInteractionValidator[],
  ) {
    super();
  }

  /**
   * Creates an Http JSON Context Interaction Response.
   *
   * @param request Http Request.
   * @returns Http Response.
   */
  public async handleContext(request: HttpRequest): Promise<HttpResponse> {
    this.logger.debug(`[${this.constructor.name}] Called handleContext()`, 'd17d4df9-8661-4090-87ef-1d828cde47db', {
      request,
    });

    try {
      const parameters = request.query as ContextInteractionRequest;

      const validator = this.getContextValidator(parameters);

      const context = await validator.validate(request);
      const interactionResponse = await context.interactionType.handleContext(context);

      const response = new HttpResponse().setHeaders(this.headers).json(removeNullishValues(interactionResponse));

      this.logger.debug(
        `[${this.constructor.name}] Completed handleContext()`,
        '7b6ec1ac-66a4-4b7d-a6bb-274a8939710f',
        { request, response },
      );

      return response;
    } catch (err: unknown) {
      const error = asIdentityProviderError(err);

      const response = new HttpResponse()
        .setStatus(error.status)
        .setHeaders(error.headers)
        .setHeaders(this.headers)
        .json(removeNullishValues(error.toJSON()));

      this.logger.debug(
        `[${this.constructor.name}] Completed handleContext()`,
        'f5f4197b-b044-4e94-bb22-a4317ddab443',
        { request, response },
      );

      return response;
    }
  }

  /**
   * Creates an Http JSON Decision Interaction Response.
   *
   * @param request Http Request.
   * @returns Http Response.
   */
  public async handleDecision(request: HttpRequest): Promise<HttpResponse> {
    this.logger.debug(`[${this.constructor.name}] Called handleDecision()`, '599336c2-45bd-4655-9a47-c69657e801a1', {
      request,
    });

    try {
      const parameters = request.form<DecisionInteractionRequest>();

      const validator = this.getDecisionValidator(parameters);

      const context = await validator.validate(request);
      const interactionResponse = await context.interactionType.handleDecision(context);

      const response = new HttpResponse().setHeaders(this.headers).json(removeNullishValues(interactionResponse));

      this.logger.debug(
        `[${this.constructor.name}] Completed handleDecision()`,
        '79c688f3-f1f7-4315-907e-55719d3c9270',
        { request, response },
      );

      return response;
    } catch (err: unknown) {
      const error = asIdentityProviderError(err);

      const response = new HttpResponse()
        .setStatus(error.status)
        .setHeaders(error.headers)
        .setHeaders(this.headers)
        .json(removeNullishValues(error.toJSON()));

      this.logger.debug(
        `[${this.constructor.name}] Completed handleDecision()`,
        '8892eb04-81be-4b84-a063-79c5d79fc591',
        { request, response },
      );

      return response;
    }
  }

  /**
   * Retrieves the Context Interaction Request Validator based on the Interaction Type requested by the Client.
   *
   * @param parameters Parameters of the Context Interaction Request.
   * @returns Context Interaction Request Validator.
   */
  private getContextValidator(parameters: ContextInteractionRequest): ContextInteractionValidator {
    this.logger.debug(
      `[${this.constructor.name}] Called getContextValidator()`,
      'bcc58f23-ef8b-4cd7-a64a-ff36358a7aac',
      { parameters },
    );

    if (!('interaction_type' in parameters) || !isNonEmptyString(parameters.interaction_type)) {
      const error = new InvalidRequestError('Invalid parameter "interaction_type".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "interaction_type"`,
        'e86743b6-fb58-489f-b489-e8eedaeb2fd4',
        { parameters },
        error,
      );

      throw error;
    }

    const validator = this.contextValidators.find((validator) => validator.name === parameters.interaction_type);

    if (!(validator instanceof ContextInteractionValidator)) {
      const error = new UnsupportedInteractionTypeError(
        `Unsupported Interaction Type "${parameters.interaction_type}".`,
      );

      this.logger.error(
        `[${this.constructor.name}] Unsupported Interaction Type "${parameters.interaction_type}"`,
        '09e45b3f-5508-4cc9-a5c7-fe1c7734962c',
        { parameters },
        error,
      );

      throw error;
    }

    this.logger.debug(
      `[${this.constructor.name}] Completed getContextValidator()`,
      '1d370899-447b-4fb0-bfe0-870621a04e04',
      { parameters, validator },
    );

    return validator;
  }

  /**
   * Retrieves the Decision Interaction Request Validator based on the Interaction Type requested by the Client.
   *
   * @param parameters Parameters of the Decision Interaction Request.
   * @returns Decision Interaction Request Validator.
   */
  private getDecisionValidator(parameters: DecisionInteractionRequest): DecisionInteractionValidator {
    this.logger.debug(
      `[${this.constructor.name}] Called getDecisionValidator()`,
      'b7f145a9-e839-41b8-9191-9015a9fed6c8',
      { parameters },
    );

    if (!('interaction_type' in parameters) || !isNonEmptyString(parameters.interaction_type)) {
      const error = new InvalidRequestError('Invalid parameter "interaction_type".');

      this.logger.error(
        `[${this.constructor.name}] Invalid parameter "interaction_type"`,
        'a65757af-c109-44f6-857e-2d05c9d51972',
        { parameters },
        error,
      );

      throw error;
    }

    const validator = this.decisionValidators.find((validator) => validator.name === parameters.interaction_type);

    if (!(validator instanceof DecisionInteractionValidator)) {
      const error = new UnsupportedInteractionTypeError(
        `Unsupported Interaction Type "${parameters.interaction_type}".`,
      );

      this.logger.error(
        `[${this.constructor.name}] Unsupported Interaction Type "${parameters.interaction_type}"`,
        '51403e7c-c28b-427f-a95f-d2a3708d6622',
        { parameters },
        error,
      );

      throw error;
    }

    this.logger.debug(
      `[${this.constructor.name}] Completed getDecisionValidator()`,
      'e1c0a5ac-4696-44f2-9d81-83e2fa96e94b',
      { parameters, validator },
    );

    return validator;
  }
}
