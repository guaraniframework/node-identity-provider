import { URL } from 'url';

import { Injectable, InjectAll, LazyInject } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { ConsentContextInteractionContext } from '../../context/interaction/context/consent/consent.context-interaction-context';
import { ConsentDecisionInteractionContext } from '../../context/interaction/decision/consent/consent.decision-interaction-context';
import { ConsentAcceptDecisionInteractionContext } from '../../context/interaction/decision/consent/consent-accept.decision-interaction-context';
import { ConsentDenyDecisionInteractionContext } from '../../context/interaction/decision/consent/consent-deny.decision-interaction-context';
import { DataAccess } from '../../data-access/data-access';
import { DisplayName } from '../../displays/display-name.type';
import { Consent } from '../../entities/consent';
import { IdentityProvider } from '../../http/providers/identity-provider';
import { Logger } from '../../loggers/logger';
import { ConsentContextInteractionResponse } from '../../responses/interaction/context/consent/consent.context-interaction-response';
import { ConsentContextInteractionResponseContext } from '../../responses/interaction/context/consent/consent.context-interaction-response-context';
import { ConsentDecisionInteractionResponse } from '../../responses/interaction/decision/consent/consent.decision-interaction-response';
import { Settings } from '../../settings/settings';
import { SubjectType } from '../../subject-types/subject-type';
import { Prompt } from '../../types/promt.type';
import { addParametersToUrl } from '../../utils/add-parameters-to-url/add-parameters-to-url';
import { InteractionType } from '../interaction-type';
import { InteractionTypeName } from '../interaction-type-name.type';

/**
 * Implementation of the Consent Interaction Type.
 *
 * This Interaction is used by the application to inform the Identity Provider
 * of the Scopes granted by the User of the current Authorization Process.
 *
 * The Context portion of the Interaction checks if there is a Consent based on the provided consent_challenge.
 * It then informs the application whether or not to force the Consent collection from the User.
 *
 * The Decision portion of the Interaction will deliberate on the decision to either accept or deny
 * the requested Scope based on the parameters provided by the application.
 *
 * If the Consent is accepted, the Identity Provider informs the User-Agent to redirect to the Authorization Endpoint
 * to continue the Authorization Process.
 *
 * If the Consent is denied, the Identity Provider informs the User-Agent to redirect to the Identity Provider's
 * Error Page to display the reason of the failure. It will also delete the Grant and Consent.
 */
@Injectable()
export class ConsentInteractionType extends InteractionType {
  /**
   * Name of the Interaction Type.
   */
  public readonly name: InteractionTypeName = 'consent';

  /**
   * Returns the Path of the Authorization Endpoint.
   */
  private get authorizationEndpointUrl(): string {
    return this.provider.endpoints.find((endpoint) => endpoint.name === 'authorization')!.path;
  }

  /**
   * Instantiates a new Consent Interaction Type.
   *
   * @param logger Logger of the Identity Provider.
   * @param dataAccess Data Access of the Identity Provider.
   * @param settings Settings of the Identity Provider.
   * @param subjectTypes Subject Types of the Identity Provider.
   * @param endpoints Endpoints of the Identity Provider.
   */
  public constructor(
    private readonly logger: Logger,
    private readonly dataAccess: DataAccess,
    private readonly settings: Settings,
    @LazyInject(() => IdentityProvider) private readonly provider: IdentityProvider,
    @InjectAll(SubjectType) private readonly subjectTypes: SubjectType[],
  ) {
    super();
  }

  /**
   * Handles the Context Flow of the Consent Interaction.
   *
   * This method verifies if there is a Consent registered at the Identity Provider.
   *
   * If no Consent is found, it informs the application to display the Consent Screen and provides the necessary data.
   * Otherwise, it informs the application that it can safely skip this process and proceed with the Authorization.
   *
   * @param context Consent Context Interaction Context.
   * @throws {IdentityProviderError} An error occurred when handling the Consent Context Interaction.
   * @returns Consent Context Interaction Response.
   */
  public async handleContext(context: ConsentContextInteractionContext): Promise<ConsentContextInteractionResponse> {
    this.logger.debug(`[${this.constructor.name}] Called handleContext()`, '97ebd06e-3e84-4bf7-8555-2ba8690b66fe', {
      context,
    });

    const {
      client,
      grant: { consent, parameters, session },
    } = context;

    const url = addParametersToUrl(new URL(this.authorizationEndpointUrl, this.settings.issuer.href), parameters);

    const subjectType = this.subjectTypes.find((subjectType) => subjectType.name === client.subjectType)!;

    const response: ConsentContextInteractionResponse = {
      skip: consent instanceof Consent,
      requested_scopes: parameters.scope.split(' '),
      subject_id: subjectType.calculateSubjectIdentifier(session.activeLogin!.user, client),
      request_url: url.href,
      client_id: client.id,
      context: removeNullishValues<ConsentContextInteractionResponseContext>({
        prompts: parameters.prompt?.split(' ') as Prompt[],
        display: parameters.display as DisplayName,
        ui_locales: parameters.ui_locales?.split(' ') as string[],
      }),
    };

    this.logger.debug(`[${this.constructor.name}] Completed handleContext()`, '87150b81-b32b-4543-9a5c-1dac43334101', {
      context,
      response,
    });

    return response;
  }

  /**
   * Handles the Decision Flow of the Consent Interaction.
   *
   * This method decides whether or not to grant the requested Scope to the Client based on the decision of the application.
   *
   * @param context Consent Decision Interaction Context.
   * @throws {IdentityProviderError} An error occurred when handling the Consent Decision Interaction.
   * @returns Consent Decision Interaction Response.
   */
  public async handleDecision(context: ConsentDecisionInteractionContext): Promise<ConsentDecisionInteractionResponse> {
    this.logger.debug(`[${this.constructor.name}] Called handleDecision()`, 'd6e31f67-127a-45d6-a00e-970888e43459', {
      context,
    });

    let response: ConsentDecisionInteractionResponse;

    switch (context.decision) {
      case 'accept': {
        response = await this.acceptConsent(context as ConsentAcceptDecisionInteractionContext);
        break;
      }

      case 'deny': {
        response = await this.denyConsent(context as ConsentDenyDecisionInteractionContext);
        break;
      }
    }

    this.logger.debug(`[${this.constructor.name}] Completed handleDecision()`, 'e3ca508f-46a7-4b28-b2cd-e28dad6a7265', {
      context,
      response,
    });

    return response;
  }

  /**
   * Accepts the Consent performed by the application and redirects the User-Agent to continue the Authorization Process.
   *
   * @param context Consent Accept Decision Interaction Context.
   * @returns Consent Decision Interaction Response.
   */
  private async acceptConsent(
    context: ConsentAcceptDecisionInteractionContext,
  ): Promise<ConsentDecisionInteractionResponse> {
    this.logger.debug(`[${this.constructor.name}] Called acceptConsent()`, '31b6c66c-5090-4dcb-b260-fcce8e9ebafb', {
      context,
    });

    let { grant, grantedScopes } = context;

    if (!(grant.consent instanceof Consent)) {
      const { client, session } = grant;

      if (
        grantedScopes.some((grantedScope) => grantedScope.name === 'offline_access') &&
        !grant.parameters.response_type.includes('code')
      ) {
        this.logger.debug(
          `[${this.constructor.name}] Removing Scope "offline_access" for Response Type "${grant.parameters.response_type}"`,
          '161dec91-0722-420d-917c-07235b9d7b32',
          { context },
        );

        grantedScopes = grantedScopes.filter((scope) => scope.name !== 'offline_access');
      }

      await this.dataAccess.atomic(async () => {
        if (!session.activeLogin!.clients.some((loginClient) => loginClient.id === client.id)) {
          session.activeLogin!.clients.push(client);
          await this.dataAccess.saveLogin(session.activeLogin!);
        }

        grant.consent = await this.dataAccess.createConsent(grantedScopes, client, session.activeLogin!.user);
        grant.interactions.push('consent');

        await this.dataAccess.saveGrant(grant);
      });
    }

    const url = addParametersToUrl(new URL(this.authorizationEndpointUrl, this.settings.issuer.href), grant.parameters);

    const response: ConsentDecisionInteractionResponse = { redirect_to: url.href };

    this.logger.debug(`[${this.constructor.name}] Completed acceptConsent()`, '4cc1b264-3400-4a87-b4ea-a413e48e9ec3', {
      context,
      response,
    });

    return response;
  }

  /**
   * Denies the consent performed by the application and redirects the User-Agent to display the Error details.
   *
   * @param context Consent Deny Decision Interaction Context.
   * @returns Consent Decision Interaction Response.
   */
  private async denyConsent(
    context: ConsentDenyDecisionInteractionContext,
  ): Promise<ConsentDecisionInteractionResponse> {
    this.logger.debug(`[${this.constructor.name}] Called denyConsent()`, '9ef9096d-c166-4773-ae5e-819e0fdc8faf', {
      context,
    });

    const { grant, error } = context;

    await this.dataAccess.removeGrant(grant);

    const url = addParametersToUrl(this.settings.interactions.errorUrl, error.toJSON());

    const response: ConsentDecisionInteractionResponse = { redirect_to: url.href };

    this.logger.debug(`[${this.constructor.name}] Completed denyConsent()`, 'a2c6d8c2-5e5f-42d0-9d29-ffa7f9e109df', {
      context,
      response,
    });

    return response;
  }
}
