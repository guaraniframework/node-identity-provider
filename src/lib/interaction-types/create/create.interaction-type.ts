import { URL } from 'url';

import { Injectable, LazyInject } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { CreateContextInteractionContext } from '../../context/interaction/context/create/create.context-interaction-context';
import { CreateDecisionInteractionContext } from '../../context/interaction/decision/create/create.decision-interaction-context';
import { DataAccess } from '../../data-access/data-access';
import { DisplayName } from '../../displays/display-name.type';
import { IdentityProvider } from '../../http/providers/identity-provider';
import { Logger } from '../../loggers/logger';
import { CreateContextInteractionResponse } from '../../responses/interaction/context/create/create.context-interaction-response';
import { CreateContextInteractionResponseContext } from '../../responses/interaction/context/create/create.context-interaction-response-context';
import { CreateDecisionInteractionResponse } from '../../responses/interaction/decision/create/create.decision-interaction-response';
import { Settings } from '../../settings/settings';
import { Prompt } from '../../types/promt.type';
import { addParametersToUrl } from '../../utils/add-parameters-to-url/add-parameters-to-url';
import { InteractionType } from '../interaction-type';
import { InteractionTypeName } from '../interaction-type-name.type';

/**
 * Implementation of the Create Interaction Type.
 *
 * This Interaction is used by the application to inform the Identity Provider that
 * a new User Account will be created in order to proceed with the Authorization Process.
 *
 * The Context portion of the Interaction informs if the User Registration Page should be displayed.
 *
 * The Decision portion of the Interaction will receive the Identifier of the registered User
 * to proceed with the Authorization Process.
 */
@Injectable()
export class CreateInteractionType extends InteractionType {
  /**
   * Name of the Interaction Type.
   */
  public readonly name: InteractionTypeName = 'create';

  /**
   * Returns the Path of the Authorization Endpoint.
   */
  private get authorizationEndpointUrl(): string {
    return this.provider.endpoints.find((endpoint) => endpoint.name === 'authorization')!.path;
  }

  /**
   * Instantiates a new Create Interaction Type.
   *
   * @param logger Logger of the Identity Provider.
   * @param dataAccess Data Access of the Identity Provider.
   * @param settings Settings of the Identity Provider.
   * @param endpoints Endpoints of the Identity Provider.
   */
  public constructor(
    private readonly logger: Logger,
    private readonly dataAccess: DataAccess,
    private readonly settings: Settings,
    @LazyInject(() => IdentityProvider) private readonly provider: IdentityProvider,
  ) {
    super();
  }

  /**
   * Handles the Context Flow of the Create Interaction.
   *
   * @param context Create Context Interaction Context.
   * @throws {IdentityProviderError} An error occurred when handling the Create Context Interaction.
   * @returns Create Context Interaction Response.
   */
  public async handleContext(context: CreateContextInteractionContext): Promise<CreateContextInteractionResponse> {
    this.logger.debug(`[${this.constructor.name}] Called handleContext()`, '8292fe43-6bb7-4cb1-9a1e-90972cd55576', {
      context,
    });

    const { grant } = context;

    const url = addParametersToUrl(new URL(this.authorizationEndpointUrl, this.settings.issuer.href), grant.parameters);

    const response: CreateContextInteractionResponse = {
      skip: grant.interactions.includes('create'),
      request_url: url.href,
      context: removeNullishValues<CreateContextInteractionResponseContext>({
        display: grant.parameters.display as DisplayName,
        prompts: grant.parameters.prompt?.split(' ') as Prompt[],
        ui_locales: grant.parameters.ui_locales?.split(' ') as string[],
      }),
    };

    this.logger.debug(`[${this.constructor.name}] Completed handleContext()`, '4ea5d916-02cc-45b1-bfd4-7558665f44f9', {
      context,
      response,
    });

    return response;
  }

  /**
   * Handles the Decision Flow of the Create Interaction.
   *
   * @param context Create Decision Interaction Context.
   * @throws {IdentityProviderError} An error occurred when handling the Create Decision Interaction.
   * @returns Create Decision Interaction Response.
   */
  public async handleDecision(context: CreateDecisionInteractionContext): Promise<CreateDecisionInteractionResponse> {
    this.logger.debug(`[${this.constructor.name}] Called handleDecision()`, '42e021e3-4c3f-4bd2-8535-ec15666d73a9', {
      context,
    });

    const { grant, data } = context;
    const { client, session } = grant;

    if (!grant.interactions.includes('create')) {
      await this.dataAccess.atomic(async () => {
        const user = await this.dataAccess.createUser(data);
        await this.dataAccess.createLogin(user, client, session, [], null);

        grant.interactions.push('create');
        await this.dataAccess.saveGrant(grant);
      });
    }

    const url = addParametersToUrl(new URL(this.authorizationEndpointUrl, this.settings.issuer.href), grant.parameters);

    const response: CreateDecisionInteractionResponse = { redirect_to: url.href };

    this.logger.debug(`[${this.constructor.name}] Completed handleDecision()`, 'dabe16a8-0a63-410c-9269-0e6511f4a7db', {
      context,
      response,
    });

    return response;
  }
}
