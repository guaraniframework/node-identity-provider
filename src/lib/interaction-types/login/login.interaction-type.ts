import { URL } from 'url';

import { Inject, Injectable } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { LoginContextInteractionContext } from '../../context/interaction/context/login/login-context.interaction-context';
import { LoginDecisionInteractionContext } from '../../context/interaction/decision/login/login-decision.interaction-context';
import { LoginDecisionAcceptInteractionContext } from '../../context/interaction/decision/login/login-decision-accept.interaction-context';
import { LoginDecisionDenyInteractionContext } from '../../context/interaction/decision/login/login-decision-deny.interaction-context';
import { DataAccess } from '../../data-access/data-access';
import { DisplayName } from '../../displays/display-name.type';
import { Grant } from '../../entities/grant';
import { Login } from '../../entities/login';
import { AccessDeniedError } from '../../errors/access-denied/access-denied.error';
import { UnmetAuthenticationRequirementsError } from '../../errors/unmet-authentication-requirements/unmet-authentication-requirements.error';
import { Logger } from '../../logger/logger';
import { LoginContextInteractionResponse } from '../../responses/interaction/context/login/login-context.interaction-response';
import { LoginContextInteractionResponseContext } from '../../responses/interaction/context/login/login-context.interaction-response-context';
import { LoginDecisionInteractionResponse } from '../../responses/interaction/decision/login/login-decision.interaction-response';
import { type Settings } from '../../settings/settings';
import { SETTINGS } from '../../settings/settings.token';
import { Prompt } from '../../types/promt.type';
import { addParametersToUrl } from '../../utils/add-parameters-to-url/add-parameters-to-url';
import { InteractionType } from '../interaction-type';
import { InteractionTypeName } from '../interaction-type-name.type';

/**
 * Implementation of the Login Interaction Type.
 *
 * This Interaction is used by the application to inform the Identity Provider
 * of the Authentication of the User of the current Authorization Process.
 *
 * The Context portion of the Interaction checks if there is already an Authenticated User
 * based on the provided login_challenge. It then informs the application whether or not
 * to force the Authentication of a User.
 *
 * The Decision portion of the Interaction will deliberate on the decision to either accept or deny
 * the Authentication of an User based on the Parameters provided by the application.
 *
 * If the Authentication is denied, the Identity Provider informs the User-Agent to redirect
 * to the Identity Provider's error page to display the reason of the failure.
 * It will also delete the analyzed Grant.
 *
 * If the Authentication is accepted, the Identity Provider informs the User-Agent to redirect
 * to the Authorization Endpoint to continue the Authorization Process.
 */
@Injectable()
export class LoginInteractionType extends InteractionType {
  /**
   * Name of the Interaction Type.
   */
  public readonly name: InteractionTypeName = 'login';

  /**
   * Instantiates a new Login Interaction Type.
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
   * Handles the Context Flow of the Login Interaction.
   *
   * This method verifies if there is an Authenticated User registered at the Identity Provider.
   *
   * If no User is found, it informs the application to display the Login Screen and provides the necessary data.
   * Otherwise, it informs the application that it can safely skip this process and proceed with the Authorization.
   *
   * @param context Login Context Interaction Request Context.
   * @returns Login Context Interaction Response.
   */
  public async handleContext(context: LoginContextInteractionContext): Promise<LoginContextInteractionResponse> {
    this.logger.debug(`[${this.constructor.name}] Called handleContext()`, 'b1776075-3011-4a57-b2ef-5773b5d52777', {
      context,
    });

    const { grant } = context;

    await this.checkGrant(grant);

    const url = addParametersToUrl(new URL('/oidc/authorization', this.settings.issuer.href), grant.parameters);

    let skip =
      grant.session.activeLogin instanceof Login &&
      (grant.parameters.prompt?.includes('login') !== true || grant.interactions.includes('login'));

    let authExp: number | undefined;

    if (grant.session.activeLogin instanceof Login && 'max_age' in grant.parameters) {
      const authTime = grant.session.activeLogin.createdAt.getTime();
      const maxAge = Number.parseInt(grant.parameters.max_age, 10) * 1000;

      skip &&= Date.now() < authTime + maxAge;
      authExp = Math.floor((authTime + maxAge) / 1000);

      if (!skip) {
        await this.dataAccess.inactivateSessionActiveLogin(grant.session);
      }
    }

    const response: LoginContextInteractionResponse = {
      skip,
      request_url: url.href,
      client_id: grant.client.id,
      context: removeNullishValues<LoginContextInteractionResponseContext>({
        prompts: grant.parameters.prompt?.split(' ') as Prompt[],
        display: grant.parameters.display as DisplayName,
        auth_exp: authExp as number,
        login_hint: grant.parameters.login_hint as string,
        ui_locales: grant.parameters.ui_locales?.split(' ') as string[],
        acr_values: grant.parameters.acr_values?.split(' ') as string[],
      }),
    };

    this.logger.debug(`[${this.constructor.name}] Completed handleContext()`, '89554ee7-701f-4cc4-b9c4-cb197e03a030', {
      context,
      response,
    });

    return response;
  }

  /**
   * Handles the Decision Flow of the Login Interaction.
   *
   * This method decides whether or not to Authenticate the User based on the decision of the application.
   *
   * @param context Login Decision Interaction Context.
   * @returns Login Decision Interaction Response.
   */
  public async handleDecision(context: LoginDecisionInteractionContext): Promise<LoginDecisionInteractionResponse> {
    this.logger.debug(`[${this.constructor.name}] Called handleDecision()`, '3db2fa6e-4a7e-4acb-9cff-32af3fe907c5', {
      context,
    });

    const { decision, grant } = context;

    await this.checkGrant(grant);

    let response: LoginDecisionInteractionResponse;

    switch (decision) {
      case 'accept': {
        response = await this.acceptLogin(context as LoginDecisionAcceptInteractionContext);
        break;
      }

      case 'deny': {
        response = await this.denyLogin(context as LoginDecisionDenyInteractionContext);
        break;
      }
    }

    this.logger.debug(`[${this.constructor.name}] Completed handleDecision()`, '0980f8ca-571f-4d22-a36a-f16823284124', {
      decision,
      response,
    });

    return response;
  }

  /**
   * Accepts the Authentication performed by the application and redirects the User-Agent
   * to continue the Authorization Process.
   *
   * @param context Login Decision Accept Interaction Context.
   * @returns Login Decision Interaction Response.
   */
  private async acceptLogin(context: LoginDecisionAcceptInteractionContext): Promise<LoginDecisionInteractionResponse> {
    this.logger.debug(`[${this.constructor.name}] Called acceptLogin()`, 'e82aee0e-acc8-45d1-9516-97a1836f4bee', {
      context,
    });

    const { acr, amr, grant, user } = context;
    const { client, parameters, session } = grant;

    if (parameters.acr_values?.includes(acr) === false) {
      await this.dataAccess.removeGrant(grant);

      const error = new UnmetAuthenticationRequirementsError(
        `Could not authenticate using the Authentication Context Class Reference "${parameters.acr_values}".`,
      );

      this.logger.error(
        `[${this.constructor.name}] Could not authenticate using the Authentication Context Class Reference "${parameters.acr_values}"`,
        'f7e07a95-dee0-482b-a244-f3abfc917462',
        { context },
        error,
      );

      throw error;
    }

    // TODO: Check ACR values.
    if (!(session.activeLogin instanceof Login)) {
      await this.dataAccess.atomic(async () => {
        await this.dataAccess.login(user, client, session, amr, acr);

        grant.interactions.push('login');
        await this.dataAccess.saveGrant(grant);
      });
    }

    const url = addParametersToUrl(new URL('/oidc/authorization', this.settings.issuer.href), parameters);

    const response: LoginDecisionInteractionResponse = { redirect_to: url.href };

    this.logger.debug(`[${this.constructor.name}] Completed acceptLogin()`, '7b6a0498-40df-41ed-8e8c-333bec99327d', {
      context,
      response,
    });

    return response;
  }

  /**
   * Denies the Authentication performed by the application and redirects the User-Agent to display the Error details.
   *
   * @param context Login Decision Deny Interaction Context.
   * @returns Login Decision Interaction Response.
   */
  private async denyLogin(context: LoginDecisionDenyInteractionContext): Promise<LoginDecisionInteractionResponse> {
    this.logger.debug(`[${this.constructor.name}] Called denyLogin()`, 'e394560e-c8ae-45f9-99fc-35f88d55f2ff', {
      context,
    });

    await this.dataAccess.removeGrant(context.grant);

    const url = addParametersToUrl(new URL('/oidc/error', this.settings.issuer.href), context.error.toJSON());

    const response: LoginDecisionInteractionResponse = { redirect_to: url.href };

    this.logger.debug(`[${this.constructor.name}] Completed denyLogin()`, 'c36a80f4-4bda-4d36-8882-722eab83635f', {
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
    this.logger.debug(`[${this.constructor.name}] Called checkGrant()`, 'ab2ea947-74e8-43d6-a2e6-88cbe1809322', {
      grant,
    });

    if (new Date() > grant.expiresAt) {
      await this.dataAccess.removeGrant(grant);

      const error = new AccessDeniedError('Expired Grant.');

      this.logger.error(
        `[${this.constructor.name}] Expired Grant`,
        'ed3bbf76-b645-4aa2-b808-44948d72db9f',
        { grant },
        error,
      );

      throw error;
    }

    this.logger.debug(`[${this.constructor.name}] Completed checkGrant()`, '7e272a0b-7ad3-4ca3-a1f1-2db46df1caf6', {
      grant,
    });
  }
}
