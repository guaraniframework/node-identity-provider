import { OutgoingHttpHeaders } from 'http';

import { Injectable, InjectAll } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { IntrospectionContext } from '../../context/introspection/introspection-context';
import { DataAccess } from '../../data-access/data-access';
import { AccessToken } from '../../entities/access-token';
import { Client } from '../../entities/client';
import { User } from '../../entities/user';
import { HttpRequest } from '../../http/request/http-request';
import { HttpRequestMethod } from '../../http/request/http-request-method.enum';
import { HttpResponse } from '../../http/response/http-response';
import { HttpRoute } from '../../http/route/http-route';
import { Logger } from '../../loggers/logger';
import { IntrospectionResponse } from '../../responses/introspection/introspection-response';
import { Settings } from '../../settings/settings';
import { SubjectType } from '../../subject-types/subject-type';
import { asIdentityProviderError } from '../../utils/as-identity-provider-error/as-identity-provider-error';
import { secureStringCompare } from '../../utils/secure-string-compare/secure-string-compare';
import { IntrospectionValidator } from '../../validators/introspection/introspection.validator';
import { Endpoint } from '../endpoint';
import { EndpointName } from '../endpoint-name.type';

/**
 * Implementation of the Introspection Endpoint.
 *
 * This endpoint is used by the Client to obtain information about a Token in its possession.
 *
 * If the Client succeeds to authenticate but provides a Token that was not issued to itself, is invalid,
 * does not exist within the Identity Provider, or is otherwise unknown or invalid, it will return
 * a standard response of the format `{"active": false}`.
 *
 * If every verification step passes, then the Identity Provider returns the information
 * associated to the Token back to the Client.
 */
@Injectable()
export class IntrospectionEndpoint extends Endpoint {
  /**
   * Name of the Endpoint.
   */
  public readonly name: EndpointName = 'introspection';

  /**
   * Path of the Endpoint.
   */
  public readonly path: string = '/oidc/introspection';

  /**
   * Http Routes of the Endpoint.
   */
  public readonly routes: HttpRoute[] = [{ method: HttpRequestMethod.POST, handler: this.handle }];

  /**
   * Default Http Headers to be included in the Response.
   */
  private readonly headers: OutgoingHttpHeaders = { 'cache-control': 'no-store', pragma: 'no-cache' };

  /**
   * Inactive Token Standard Response.
   */
  readonly #inactiveTokenResponse: IntrospectionResponse = { active: false };

  /**
   * Instantiates a new Introspection Endpoint.
   *
   * @param logger Logger of the Identity Provider.
   * @param dataAccess Data Access of the Identity Provider.
   * @param settings Settings of the Identity Provider.
   * @param validator Introspection Validator of the Identity Provider.
   * @param subjectTypes Subject Types of the Identity Provider.
   */
  public constructor(
    private readonly logger: Logger,
    private readonly dataAccess: DataAccess,
    private readonly settings: Settings,
    private readonly validator: IntrospectionValidator,
    @InjectAll(SubjectType) private readonly subjectTypes: SubjectType[],
  ) {
    super();

    if (typeof this.dataAccess.getTokenMetadata !== 'function') {
      const error = new TypeError('Missing implementation of required method "DataAccess.getTokenMetadata".');

      this.logger.fatal(
        `[${this.constructor.name}] Missing implementation of required method "DataAccess.getTokenMetadata"`,
        '3c2c9c6a-eb3f-46fa-ae94-21dfac86dfcb',
        null,
        error,
      );

      throw error;
    }
  }

  /**
   * Introspects the provided Token about its metadata and state within the Identity Provider.
   *
   * First it validates the Request of the Client by making sure the required parameter token is present,
   * and that the Client can authenticate within the Endpoint.
   *
   * It then tries to lookup the information about the Token from the application's storage.
   *
   * If the Client passes the authentication, the token is still valid, and the Client is the owner of the token,
   * this method will return the Token's metadata back to the Client.
   *
   * If it is determined that the Client should not have access to the Token's metadata, or if the Token
   * is not valid anymore, this method will return an Introspection Response in the format `{"active": false}`.
   *
   * This is done in order to prevent a Client from fishing any information that it should not have access to.
   *
   * @param request Http Request.
   * @returns Http Response.
   */
  public async handle(request: HttpRequest): Promise<HttpResponse> {
    this.logger.debug(`[${this.constructor.name}] Called handle()`, 'e674471f-e45b-4b41-9db1-cd15f13d0d78', {
      request,
    });

    try {
      const context = await this.validator.validate(request);

      const introspectionResponse = await this.introspectToken(context);

      const response = new HttpResponse().setHeaders(this.headers).json(introspectionResponse);

      this.logger.debug(`[${this.constructor.name}] Completed handle()`, 'a418faa5-5a9e-4261-b6db-53e137b561b8', {
        request,
        response,
      });

      return response;
    } catch (err: unknown) {
      const error = asIdentityProviderError(err);

      const response = new HttpResponse()
        .setStatus(error.status)
        .setHeaders(error.headers)
        .setHeaders(this.headers)
        .json(removeNullishValues(error.toJSON()));

      this.logger.error(
        `[${this.constructor.name}] Failed handle()`,
        '0c1b890d-5340-4ff8-aacd-edef4f9c3f34',
        { request, response },
        error,
      );

      return response;
    }
  }

  /**
   * Introspects the provided Token for its metadata
   *
   * @param context Introspection Context.
   * @returns Metadata of the Token.
   */
  private async introspectToken(context: IntrospectionContext): Promise<IntrospectionResponse> {
    this.logger.debug(`[${this.constructor.name}] Called introspectToken()`, 'd2ba96d9-a76d-4bf9-ac54-6850176461fc', {
      context,
    });

    const { client, token } = context;

    if (token === null) {
      this.logger.debug(
        `[${this.constructor.name}] Completed introspectToken()`,
        '55e4f242-4e31-44b3-91d2-3e9f15a7402e',
        { context },
      );

      return this.#inactiveTokenResponse;
    }

    if (!secureStringCompare(client.id, token.client!.id)) {
      this.logger.debug(
        `[${this.constructor.name}] Completed introspectToken()`,
        '7921bb34-766d-459b-8ea0-ae3a5693ed06',
        { context },
      );

      return this.#inactiveTokenResponse;
    }

    const now = new Date();

    if (now >= token.expiresAt) {
      this.logger.debug(
        `[${this.constructor.name}] Completed introspectToken()`,
        'e34865a7-a483-4d1c-9c17-2b7e720b26bc',
        { context, token },
      );

      return this.#inactiveTokenResponse;
    }

    if (now < token.validAfter) {
      this.logger.debug(
        `[${this.constructor.name}] Completed introspectToken()`,
        '5d67fc61-44f4-4330-9ce9-6e914bc4223b',
        { context, token },
      );

      return this.#inactiveTokenResponse;
    }

    if (token.revokedAt instanceof Date) {
      this.logger.debug(
        `[${this.constructor.name}] Completed introspectToken()`,
        '1503b260-3794-4a08-8d46-aff84c2c9a75',
        { context, token },
      );

      return this.#inactiveTokenResponse;
    }

    // eslint-disable-next-line camelcase
    const { active, aud, client_id, exp, iat, iss, jti, nbf, scope, sub, token_type, username, ...tokenMetadata } =
      await this.dataAccess.getTokenMetadata!(token);

    const introspectionResponse = removeNullishValues<IntrospectionResponse>({
      active: true,
      scope: token.scopes.map((scope) => scope.name).join(' '),
      client_id: token.client!.id,
      username: username!,
      token_type: token instanceof AccessToken ? token.type : undefined!,
      exp: Math.ceil(token.expiresAt.getTime() / 1000),
      iat: Math.ceil(token.createdAt.getTime() / 1000),
      nbf: Math.ceil(token.validAfter.getTime() / 1000),
      sub:
        token.user instanceof User
          ? this.getSubjectType(token.client!).calculateSubjectIdentifier(token.user, token.client!)
          : undefined!,
      aud: token.client!.id,
      iss: this.settings.issuer.href,
      jti: jti!,
      ...tokenMetadata,
    });

    this.logger.debug(
      `[${this.constructor.name}] Completed introspectToken()`,
      '68cd91cf-2cfb-494d-9b15-5a2c28ce8627',
      { context, token, introspection_response: introspectionResponse },
    );

    return introspectionResponse;
  }

  /**
   * Returns the Subject Type of the Client.
   *
   * @param client Client of the Request.
   * @returns Subject Type of the Client.
   */
  private getSubjectType(client: Client): SubjectType {
    this.logger.debug(`[${this.constructor.name}] Called getSubjectType()`, '92840352-76b7-4355-b678-40062d5d33ae', {
      client,
    });

    const subjectType = this.subjectTypes.find((subjectType) => subjectType.name === client.subjectType)!;

    this.logger.debug(`[${this.constructor.name}] Completed getSubjectType()`, '01fe1c0d-3edd-4490-9fe1-2fe5bd483c22', {
      client,
      subject_type: subjectType.name,
    });

    return subjectType;
  }
}
