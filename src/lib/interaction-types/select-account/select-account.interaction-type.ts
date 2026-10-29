import { URL } from 'url';

import { Injectable, LazyInject } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { SelectAccountContextInteractionContext } from '../../context/interaction/context/select-account/select-account.context-interaction-context';
import { SelectAccountDecisionInteractionContext } from '../../context/interaction/decision/select-account/select-account.decision-interaction-context';
import { DataAccess } from '../../data-access/data-access';
import { DisplayName } from '../../displays/display-name.type';
import { IdentityProvider } from '../../http/providers/identity-provider';
import { Logger } from '../../loggers/logger';
import { SelectAccountContextInteractionResponse } from '../../responses/interaction/context/select-account/select-account.context-interaction-response';
import { SelectAccountContextInteractionResponseContext } from '../../responses/interaction/context/select-account/select-account.context-interaction-response-context';
import { SelectAccountDecisionInteractionResponse } from '../../responses/interaction/decision/select-account/select-account.decision-interaction-response';
import { Settings } from '../../settings/settings';
import { Prompt } from '../../types/promt.type';
import { addParametersToUrl } from '../../utils/add-parameters-to-url/add-parameters-to-url';
import { InteractionType } from '../interaction-type';
import { InteractionTypeName } from '../interaction-type-name.type';

/**
 * Implementation of the Select Account Interaction Type.
 *
 * This Interaction is used by the application to inform the Identity Provider
 * of the Login to be used in the Authorization Process.
 *
 * The Context portion of the Interaction returns the list of Logins currently registered at the User-Agent.
 *
 * The Decision portion of the Interaction will receive the Identifier of the Login
 * selected by the User to be used in the Authorization Process.
 */
@Injectable()
export class SelectAccountInteractionType extends InteractionType {
  /**
   * Name of the Interaction Type.
   */
  public readonly name: InteractionTypeName = 'select_account';

  /**
   * Returns the Path of the Authorization Endpoint.
   */
  private get authorizationEndpointUrl(): string {
    return this.provider.endpoints.find((endpoint) => endpoint.name === 'authorization')!.path;
  }

  /**
   * Instantiates a new Select Account Interaction Type.
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
   * Handles the Context Flow of the Select Account Interaction.
   *
   * @param context Select Account Context Interaction Context.
   * @throws {IdentityProviderError} An error occurred when handling the Select Account Context Interaction.
   * @returns Select Account Context Interaction Response.
   */
  public async handleContext(
    context: SelectAccountContextInteractionContext,
  ): Promise<SelectAccountContextInteractionResponse> {
    this.logger.debug(`[${this.constructor.name}] Called handleContext()`, '678536a1-0c90-4d21-8cc5-6f72973c0ae3', {
      context,
    });

    const { grant } = context;

    const url = addParametersToUrl(new URL(this.authorizationEndpointUrl, this.settings.issuer.href), grant.parameters);

    const response: SelectAccountContextInteractionResponse = {
      skip: grant.interactions.includes('select_account'),
      logins_ids: grant.session.logins.map((login) => login.id),
      request_url: url.href,
      context: removeNullishValues<SelectAccountContextInteractionResponseContext>({
        display: grant.parameters.display as DisplayName,
        prompts: grant.parameters.prompt?.split(' ') as Prompt[],
        ui_locales: grant.parameters.ui_locales?.split(' ') as string[],
      }),
    };

    this.logger.debug(`[${this.constructor.name}] Called handleContext()`, 'cb170641-7ff1-445f-886e-9f99cb28233a', {
      context,
      response,
    });

    return response;
  }

  /**
   * Handles the Decision Flow of the Select Account Interaction.
   *
   * @param context Select Account Decision Interaction Context.
   * @throws {IdentityProviderError} An error occurred when handling the Select Account Decision Interaction.
   * @returns Select Account Decision Interaction Response.
   */
  public async handleDecision(
    context: SelectAccountDecisionInteractionContext,
  ): Promise<SelectAccountDecisionInteractionResponse> {
    this.logger.debug(`[${this.constructor.name}] Called handleDecision()`, '90988436-188f-4489-91ee-729d94b19ba6', {
      context,
    });

    const { grant, login } = context;
    const { session } = grant;

    if (!grant.interactions.includes('select_account')) {
      await this.dataAccess.atomic(async () => {
        session.activeLogin = login;
        await this.dataAccess.saveSession(session);

        grant.interactions.push('select_account');
        await this.dataAccess.saveGrant(grant);
      });
    }

    const url = addParametersToUrl(new URL(this.authorizationEndpointUrl, this.settings.issuer.href), grant.parameters);

    const response: SelectAccountDecisionInteractionResponse = { redirect_to: url.href };

    this.logger.debug(`[${this.constructor.name}] Completed handleDecision()`, '17f9ef38-81ef-4bb8-b6d4-188748fe4853', {
      context,
      response,
    });

    return response;
  }
}
