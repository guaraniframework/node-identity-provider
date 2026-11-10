import { URL } from 'url';

import { Injectable, InjectAll, LazyInject, Optional } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { ClientAuthentication } from '../../client-authentication/client-authentication';
import {
  INTERACTION_CLIENT_AUTHENTICATION,
  INTROSPECTION_CLIENT_AUTHENTICATION,
  REVOCATION_CLIENT_AUTHENTICATION,
  TOKEN_CLIENT_AUTHENTICATION,
} from '../../constants';
import { DataAccess } from '../../data-access/data-access';
import { Display } from '../../displays/display';
import { GrantType } from '../../grant-types/grant-type';
import { IdentityProvider } from '../../http/providers/identity-provider';
import { HttpRequest } from '../../http/request/http-request';
import { HttpRequestMethod } from '../../http/request/http-request-method.enum';
import { HttpResponse } from '../../http/response/http-response';
import { HttpRoute } from '../../http/route/http-route';
import { InteractionType } from '../../interaction-types/interaction-type';
import { Logger } from '../../loggers/logger';
import { PKCE } from '../../pkces/pkce';
import { ResponseMode } from '../../response-modes/response-mode';
import { ResponseType } from '../../response-types/response-type';
import { DiscoveryResponse } from '../../responses/discovery/discovery-response';
import { Settings } from '../../settings/settings';
import { SubjectType } from '../../subject-types/subject-type';
import { Endpoint } from '../endpoint';
import { EndpointName } from '../endpoint-name.type';

/**
 * Implementation of the Discovery Endpoint.
 *
 * This endpoint is used to provide the Metadata of the Identity Provider to the Client.
 */
@Injectable()
export class DiscoveryEndpoint extends Endpoint {
  /**
   * Name of the Endpoint.
   */
  public readonly name: EndpointName = 'discovery';

  /**
   * Path of the Endpoint.
   */
  public readonly path: string = '/.well-known/openid-configuration';

  /**
   * Http Routes of the Endpoint.
   */
  public readonly routes: HttpRoute[] = [{ method: HttpRequestMethod.GET, handler: this.handle }];

  /**
   * Instantiates a new Discovery Endpoint.
   *
   * @param logger Logger of the Identity Provider.
   * @param dataAccess Data Access of the Identity Provider.
   * @param settings Settings of the Identity Provider.
   * @param provider Identity Provider.
   * @param responseTypes Response Types of the Identity Provider.
   * @param responseModes Response Modes of the Identity Provider.
   * @param interactionTypes Interaction Types of the Identity Provider.
   * @param grantTypes Grant Types of the Identity Provider.
   * @param subjectTypes Subject Types of the Identity Provider.
   * @param tokenEndpointMethods Token Endpoint Client Authentication Methods of the Identity Provider.
   * @param interactionEndpointMethods Interaction Endpoint Client Authentication Methods of the Identity Provider.
   * @param displays Displays of the Identity Provider.
   * @param pkces PKCEs of the Identity Provider.
   * @param revocationEndpointMethods Revocation Endpoint Client Authentication Methods of the Identity Provider.
   * @param introspectionEndpointMethods Introspection Endpoint Client Authentication Methods of the Identity Provider.
   */
  public constructor(
    private readonly logger: Logger,
    private readonly dataAccess: DataAccess,
    private readonly settings: Settings,
    @LazyInject(() => IdentityProvider) private readonly provider: IdentityProvider,
    @InjectAll(ResponseType) private readonly responseTypes: ResponseType[],
    @InjectAll(ResponseMode) private readonly responseModes: ResponseMode[],
    @InjectAll(InteractionType) private readonly interactionTypes: InteractionType[],
    @InjectAll(GrantType) private readonly grantTypes: GrantType[],
    @InjectAll(SubjectType) private readonly subjectTypes: SubjectType[],
    @InjectAll(TOKEN_CLIENT_AUTHENTICATION) private readonly tokenEndpointMethods: ClientAuthentication[],
    @InjectAll(INTERACTION_CLIENT_AUTHENTICATION) private readonly interactionEndpointMethods: ClientAuthentication[],
    @InjectAll(Display) private readonly displays: Display[],
    @InjectAll(PKCE) private readonly pkces: PKCE[],
    @Optional()
    @InjectAll(REVOCATION_CLIENT_AUTHENTICATION)
    private readonly revocationEndpointMethods?: ClientAuthentication[],
    @Optional()
    @InjectAll(INTROSPECTION_CLIENT_AUTHENTICATION)
    private readonly introspectionEndpointMethods?: ClientAuthentication[],
  ) {
    super();
  }

  /**
   * Creates a Http JSON Discovery Response.
   *
   * @param request Http Request.
   * @returns Http Response.
   */
  public async handle(request: HttpRequest): Promise<HttpResponse> {
    this.logger.debug(`[${this.constructor.name}] Called handle()`, '2ee12df9-558e-4f06-87da-653ad3fe546c', {
      request,
    });

    const idTokenSignatureAlgorithms =
      this.settings.idTokenSignatureAlgorithms.length !== 0 ? this.settings.idTokenSignatureAlgorithms : undefined;

    const idTokenKeyWrapAlgorithms =
      this.settings.idTokenKeyWrapAlgorithms.length !== 0 ? this.settings.idTokenKeyWrapAlgorithms : undefined;

    const idTokenContentEncryptionAlgorithms =
      this.settings.idTokenContentEncryptionAlgorithms.length !== 0
        ? this.settings.idTokenContentEncryptionAlgorithms
        : undefined;

    const clientAuthenticationSigningAlgorithms =
      this.settings.clientAuthenticationSigningAlgorithms.length !== 0
        ? this.settings.clientAuthenticationSigningAlgorithms
        : undefined;

    const clientAuthenticationEncryptionKeyWrapAlgorithms =
      this.settings.clientAuthenticationEncryptionKeyWrapAlgorithms.length !== 0
        ? this.settings.clientAuthenticationEncryptionKeyWrapAlgorithms
        : undefined;

    const clientAuthenticationEncryptionContentEncryptionAlgorithms =
      this.settings.clientAuthenticationEncryptionContentEncryptionAlgorithms.length !== 0
        ? this.settings.clientAuthenticationEncryptionContentEncryptionAlgorithms
        : undefined;

    const jwtBearerGrantSigningAlgorithms =
      this.settings.jwtBearerGrantSigningAlgorithms.length !== 0
        ? this.settings.jwtBearerGrantSigningAlgorithms
        : undefined;

    const jwtBearerGrantEncryptionKeyWrapAlgorithms =
      this.settings.jwtBearerGrantEncryptionKeyWrapAlgorithms.length !== 0
        ? this.settings.jwtBearerGrantEncryptionKeyWrapAlgorithms
        : undefined;

    const jwtBearerGrantEncryptionContentEncryptionAlgorithms =
      this.settings.jwtBearerGrantEncryptionContentEncryptionAlgorithms.length !== 0
        ? this.settings.jwtBearerGrantEncryptionContentEncryptionAlgorithms
        : undefined;

    const discoveryResponse = removeNullishValues<DiscoveryResponse>({
      issuer: this.settings.issuer.href,
      authorization_endpoint: this.getEndpointPath('authorization')!,
      interaction_endpoint: this.getEndpointPath('interaction')!,
      token_endpoint: this.getEndpointPath('token')!,
      revocation_endpoint: this.getEndpointPath('revocation')!,
      scopes_supported: (await this.dataAccess.getScopes()).map((scope) => scope.name),
      response_types_supported: this.responseTypes.map((responseType) => responseType.name),
      response_modes_supported: this.responseModes.map((responseMode) => responseMode.name),
      interaction_types_supported: this.interactionTypes.map((interactionType) => interactionType.name),
      grant_types_supported: this.grantTypes.map((grantType) => grantType.name),
      acr_values_supported: this.settings.acrValues.length !== 0 ? this.settings.acrValues : undefined!,
      subject_types_supported: this.subjectTypes.map((subjectType) => subjectType.name),
      id_token_signing_alg_values_supported: idTokenSignatureAlgorithms!,
      id_token_encryption_alg_values_supported: idTokenKeyWrapAlgorithms!,
      id_token_encryption_enc_values_supported: idTokenContentEncryptionAlgorithms!,
      token_endpoint_auth_methods_supported: this.tokenEndpointMethods.map((method) => method.name),
      token_endpoint_auth_signing_alg_values_supported: clientAuthenticationSigningAlgorithms!,
      token_endpoint_auth_encryption_alg_values_supported: clientAuthenticationEncryptionKeyWrapAlgorithms!,
      token_endpoint_auth_encryption_enc_values_supported: clientAuthenticationEncryptionContentEncryptionAlgorithms!,
      jwt_bearer_grant_signing_alg_values_supported: jwtBearerGrantSigningAlgorithms!,
      jwt_bearer_grant_encryption_alg_values_supported: jwtBearerGrantEncryptionKeyWrapAlgorithms!,
      jwt_bearer_grant_encryption_enc_values_supported: jwtBearerGrantEncryptionContentEncryptionAlgorithms!,
      prompt_values_supported: ['consent', 'create', 'login', 'none', 'select_account'],
      display_values_supported: this.displays.map((display) => display.name),
      ui_locales_supported: this.settings.uiLocales.length !== 0 ? this.settings.uiLocales : undefined!,
      code_challenge_methods_supported: this.pkces.map((pkce) => pkce.name),
      authorization_response_iss_parameter_supported: this.settings.enableAuthorizationResponseIssuerIdentifier,
      interaction_endpoint_auth_methods_supported: this.interactionEndpointMethods.map((method) => method.name),
      interaction_endpoint_auth_signing_alg_values_supported: clientAuthenticationSigningAlgorithms!,
      interaction_endpoint_auth_encryption_alg_values_supported: clientAuthenticationEncryptionKeyWrapAlgorithms!,
      interaction_endpoint_auth_encryption_enc_values_supported:
        clientAuthenticationEncryptionContentEncryptionAlgorithms!,
      revocation_endpoint_auth_methods_supported: this.revocationEndpointMethods?.map((method) => method.name)!,
      revocation_endpoint_auth_signing_alg_values_supported: Array.isArray(this.revocationEndpointMethods)
        ? clientAuthenticationSigningAlgorithms!
        : undefined!,
      revocation_endpoint_auth_encryption_alg_values_supported: Array.isArray(this.revocationEndpointMethods)
        ? clientAuthenticationEncryptionKeyWrapAlgorithms!
        : undefined!,
      revocation_endpoint_auth_encryption_enc_values_supported: Array.isArray(this.revocationEndpointMethods)
        ? clientAuthenticationEncryptionContentEncryptionAlgorithms!
        : undefined!,
      introspection_endpoint_auth_methods_supported: this.introspectionEndpointMethods?.map((method) => method.name)!,
      introspection_endpoint_auth_signing_alg_values_supported: Array.isArray(this.introspectionEndpointMethods)
        ? clientAuthenticationSigningAlgorithms!
        : undefined!,
      introspection_endpoint_auth_encryption_alg_values_supported: Array.isArray(this.introspectionEndpointMethods)
        ? clientAuthenticationEncryptionKeyWrapAlgorithms!
        : undefined!,
      introspection_endpoint_auth_encryption_enc_values_supported: Array.isArray(this.introspectionEndpointMethods)
        ? clientAuthenticationEncryptionContentEncryptionAlgorithms!
        : undefined!,
    });

    const response = new HttpResponse().json(discoveryResponse);

    this.logger.debug(`[${this.constructor.name}] Completed handle()`, 'a5bccca4-d94d-4b9d-af02-8ccf271a208c', {
      request,
      response,
    });

    return response;
  }

  /**
   * Returns the Full URL of the requested Endpoint.
   *
   * @param name Name of the Endpoint.
   * @returns Full URL of the Endpoint.
   */
  private getEndpointPath(name: EndpointName): string | undefined {
    this.logger.debug(`[${this.constructor.name}] Called getEndpointPath()`, 'e5236b52-ae84-44c2-bf5f-935e6ecfcbec', {
      name,
    });

    const endpoint = this.provider.endpoints.find((endpoint) => endpoint.name === name);

    if (!(endpoint instanceof Endpoint)) {
      this.logger.debug(
        `[${this.constructor.name}] Completed getEndpointPath()`,
        '513bc0ce-eb3b-4132-9771-16fe995c4eae',
        { name },
      );

      return;
    }

    const path = new URL(endpoint.path, this.settings.issuer).href;

    this.logger.debug(
      `[${this.constructor.name}] Completed getEndpointPath()`,
      '0db5137b-537c-450e-8f8c-c9e415d724ca',
      { name, path },
    );

    return path;
  }
}
