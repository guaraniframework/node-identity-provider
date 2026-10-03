import { URL } from 'url';

import { Inject, Injectable } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { SelectAccountContextInteractionContext } from '../../context/interaction/context/select-account/select-account-context.interaction-context';
import { SelectAccountDecisionInteractionContext } from '../../context/interaction/decision/select-account/select-account-decision.interaction-context';
import { DataAccess } from '../../data-access/data-access';
import { DisplayName } from '../../displays/display-name.type';
import { Grant } from '../../entities/grant';
import { AccessDeniedError } from '../../errors/access-denied/access-denied.error';
import { Logger } from '../../logger/logger';
import { SelectAccountContextInteractionResponse } from '../../responses/interaction/context/select-account/select-account-context.interaction-response';
import { SelectAccountContextInteractionResponseContext } from '../../responses/interaction/context/select-account/select-account-context.interaction-response-context';
import { SelectAccountDecisionInteractionResponse } from '../../responses/interaction/decision/select-account/select-account-decision.interaction-response';
import { type Settings } from '../../settings/settings';
import { SETTINGS } from '../../settings/settings.token';
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
   * Instantiates a new Select Account Interaction Type.
   *
   * @param logger Logger of the Identity Provider.
   * @param dataAccess Data Access of the Identity Provider.
   * @param settings Settings of the Identity Provider.
   */
  public constructor(
    private readonly logger: Logger,
    private readonly dataAccess: DataAccess,
    @Inject(SETTINGS) private readonly settings: Settings,
  ) {
    super();
  }

  /**
   * Handles the Context Flow of the Select Account Interaction.
   *
   * @param context Select Account Context Interaction Context.
   * @returns Select Account Context Interaction Response.
   */
  public async handleContext(
    context: SelectAccountContextInteractionContext,
  ): Promise<SelectAccountContextInteractionResponse> {
    this.logger.debug(`[${this.constructor.name}] Called handleContext()`, '678536a1-0c90-4d21-8cc5-6f72973c0ae3', {
      context,
    });

    const { grant } = context;

    await this.checkGrant(grant);

    const url = addParametersToUrl(new URL('/oidc/authorization', this.settings.issuer.href), grant.parameters);

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

    await this.checkGrant(grant);

    if (!grant.interactions.includes('select_account')) {
      await this.dataAccess.atomic(async () => {
        session.activeLogin = login;
        await this.dataAccess.saveSession(session);

        grant.interactions.push('select_account');
        await this.dataAccess.saveGrant(grant);
      });
    }

    const url = addParametersToUrl(new URL('/oidc/authorization', this.settings.issuer.href), grant.parameters);

    const response: SelectAccountDecisionInteractionResponse = { redirect_to: url.href };

    this.logger.debug(`[${this.constructor.name}] Completed handleDecision()`, '17f9ef38-81ef-4bb8-b6d4-188748fe4853', {
      context,
      response,
    });

    return response;
  }

  /**
   * Checks the validity of the Grant.
   *
   * @param grant Grant to be checked.
   * @throws {AccessDeniedError} Expired Grant.
   */
  private async checkGrant(grant: Grant): Promise<void> {
    this.logger.debug(`[${this.constructor.name}] Called checkGrant()`, '0e994f0f-3595-4ebf-90ed-3e97cd33d9fb', {
      grant,
    });

    if (new Date() > grant.expiresAt) {
      await this.dataAccess.removeGrant(grant);

      const error = new AccessDeniedError('Expired Grant.');

      this.logger.error(
        `[${this.constructor.name}] Expired Grant`,
        '9e2854de-27fc-4136-bd6c-c64bdba3d72a',
        { grant },
        error,
      );

      throw error;
    }

    this.logger.debug(`[${this.constructor.name}] Completed checkGrant()`, '7277725d-f272-4672-8c2c-d8d80866c39c', {
      grant,
    });
  }
}
