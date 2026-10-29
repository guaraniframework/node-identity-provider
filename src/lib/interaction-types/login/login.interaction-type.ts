import { URL } from 'url';

import { Injectable, LazyInject } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { LoginContextInteractionContext } from '../../context/interaction/context/login/login.context-interaction-context';
import { LoginDecisionInteractionContext } from '../../context/interaction/decision/login/login.decision-interaction-context';
import { LoginAcceptDecisionInteractionContext } from '../../context/interaction/decision/login/login-accept.decision-interaction-context';
import { LoginDenyDecisionInteractionContext } from '../../context/interaction/decision/login/login-deny.decision-interaction-context';
import { DataAccess } from '../../data-access/data-access';
import { DisplayName } from '../../displays/display-name.type';
import { Login } from '../../entities/login';
import { UnmetAuthenticationRequirementsError } from '../../errors/unmet-authentication-requirements/unmet-authentication-requirements.error';
import { IdentityProvider } from '../../http/providers/identity-provider';
import { Logger } from '../../loggers/logger';
import { LoginContextInteractionResponse } from '../../responses/interaction/context/login/login.context-interaction-response';
import { LoginContextInteractionResponseContext } from '../../responses/interaction/context/login/login.context-interaction-response-context';
import { LoginDecisionInteractionResponse } from '../../responses/interaction/decision/login/login.decision-interaction-response';
import { Settings } from '../../settings/settings';
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
   * Returns the Path of the Authorization Endpoint.
   */
  private get authorizationEndpointUrl(): string {
    return this.provider.endpoints.find((endpoint) => endpoint.name === 'authorization')!.path;
  }

  /**
   * Instantiates a new Login Interaction Type.
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
   * Handles the Context Flow of the Login Interaction.
   *
   * This method verifies if there is an Authenticated User registered at the Identity Provider.
   *
   * If no User is found, it informs the application to display the Login Screen and provides the necessary data.
   * Otherwise, it informs the application that it can safely skip this process and proceed with the Authorization.
   *
   * @param context Login Context Interaction Context.
   * @throws {IdentityProviderError} An error occurred when handling the Login Context Interaction.
   * @returns Login Context Interaction Response.
   */
  public async handleContext(context: LoginContextInteractionContext): Promise<LoginContextInteractionResponse> {
    this.logger.debug(`[${this.constructor.name}] Called handleContext()`, 'b1776075-3011-4a57-b2ef-5773b5d52777', {
      context,
    });

    const { grant } = context;

    const url = addParametersToUrl(new URL(this.authorizationEndpointUrl, this.settings.issuer.href), grant.parameters);

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
   * @throws {IdentityProviderError} An error occurred when handling the Login Decision Interaction.
   * @returns Login Decision Interaction Response.
   */
  public async handleDecision(context: LoginDecisionInteractionContext): Promise<LoginDecisionInteractionResponse> {
    this.logger.debug(`[${this.constructor.name}] Called handleDecision()`, '3db2fa6e-4a7e-4acb-9cff-32af3fe907c5', {
      context,
    });

    const { decision } = context;

    let response: LoginDecisionInteractionResponse;

    switch (decision) {
      case 'accept': {
        response = await this.acceptLogin(context as LoginAcceptDecisionInteractionContext);
        break;
      }

      case 'deny': {
        response = await this.denyLogin(context as LoginDenyDecisionInteractionContext);
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
   * Accepts the Authentication performed by the application and redirects the User-Agent to continue the Authorization Process.
   *
   * @param context Login Accept Decision Interaction Context.
   * @returns Login Decision Interaction Response.
   */
  private async acceptLogin(context: LoginAcceptDecisionInteractionContext): Promise<LoginDecisionInteractionResponse> {
    this.logger.debug(`[${this.constructor.name}] Called acceptLogin()`, 'e82aee0e-acc8-45d1-9516-97a1836f4bee', {
      context,
    });

    const { acr, amr, grant, user } = context;
    const { client, parameters, session } = grant;

    if (parameters.acr_values?.includes(acr) === false) {
      await this.dataAccess.removeGrant(grant);

      const error = new UnmetAuthenticationRequirementsError(
        `Could not authenticate using the Authentication Context Class Reference "${acr}".`,
      );

      this.logger.error(
        `[${this.constructor.name}] Could not authenticate using the Authentication Context Class Reference "${acr}"`,
        'f7e07a95-dee0-482b-a244-f3abfc917462',
        { context },
        error,
      );

      throw error;
    }

    // TODO: Check ACR values.
    if (!(session.activeLogin instanceof Login)) {
      await this.dataAccess.atomic(async () => {
        await this.dataAccess.createLogin(user, client, session, amr, acr);

        grant.interactions.push('login');
        await this.dataAccess.saveGrant(grant);
      });
    }

    const url = addParametersToUrl(new URL(this.authorizationEndpointUrl, this.settings.issuer.href), parameters);

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
   * @param context Login Deny Decision Interaction Context.
   * @returns Login Decision Interaction Response.
   */
  private async denyLogin(context: LoginDenyDecisionInteractionContext): Promise<LoginDecisionInteractionResponse> {
    this.logger.debug(`[${this.constructor.name}] Called denyLogin()`, 'e394560e-c8ae-45f9-99fc-35f88d55f2ff', {
      context,
    });

    await this.dataAccess.removeGrant(context.grant);

    const url = addParametersToUrl(this.settings.interactions.errorUrl, context.error.toJSON());

    const response: LoginDecisionInteractionResponse = { redirect_to: url.href };

    this.logger.debug(`[${this.constructor.name}] Completed denyLogin()`, 'c36a80f4-4bda-4d36-8882-722eab83635f', {
      context,
      response,
    });

    return response;
  }
}
