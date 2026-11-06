import { OutgoingHttpHeaders } from 'node:http2';

import { Injectable } from '@guarani/di';
import { removeNullishValues } from '@guarani/primitives';

import { RevocationContext } from '../../context/revocation/revocation-context';
import { DataAccess } from '../../data-access/data-access';
import { AccessToken } from '../../entities/access-token';
import { RefreshToken } from '../../entities/refresh-token';
import { HttpRequest } from '../../http/request/http-request';
import { HttpRequestMethod } from '../../http/request/http-request-method.enum';
import { HttpResponse } from '../../http/response/http-response';
import { HttpRoute } from '../../http/route/http-route';
import { Logger } from '../../loggers/logger';
import { asIdentityProviderError } from '../../utils/as-identity-provider-error/as-identity-provider-error';
import { secureStringCompare } from '../../utils/secure-string-compare/secure-string-compare';
import { RevocationValidator } from '../../validators/revocation/revocation.validator';
import { Endpoint } from '../endpoint';
import { EndpointName } from '../endpoint-name.type';

/**
 * Implementation of the Revocation Endpoint.
 *
 * This endpoint is used by the Client to revoke a Token in its possession.
 *
 * If the Client succeeds to authenticate but provides a Token that was not issued to itself, the Identity Provider
 * does not revoke the Token, since the Client is not authorized to operate it.
 *
 * If the Token is already invalid, does not exist within the Identity Provider or is otherwise unknown or invalid,
 * it is already considered revoked and, therefore, no further operation occurs.
 */
@Injectable()
export class RevocationEndpoint extends Endpoint {
  /**
   * Name of the Endpoint.
   */
  public readonly name: EndpointName = 'revocation';

  /**
   * Path of the Endpoint.
   */
  public readonly path: string = '/oidc/revocation';

  /**
   * Http Routes of the Endpoint.
   */
  public readonly routes: HttpRoute[] = [{ method: HttpRequestMethod.POST, handler: this.handle }];

  /**
   * Default Http Headers to be included in the Response.
   */
  private readonly headers: OutgoingHttpHeaders = { 'cache-control': 'no-store', pragma: 'no-cache' };

  /**
   * Instantiates a new Revocation Endpoint.
   *
   * @param logger Logger of the Identity Provider.
   * @param dataAccess Data Access of the Identity Provider.
   * @param validator Revocation Validator of the Identity Provider.
   */
  public constructor(
    private readonly logger: Logger,
    private readonly dataAccess: DataAccess,
    private readonly validator: RevocationValidator,
  ) {
    super();
  }

  /**
   * Revokes a previously issued Token.
   *
   * First it validates the Revocation Request of the Client by making sure the required parameter token is present,
   * and that the Client can authenticate within the Revocation Endpoint.
   *
   * It then tries to revoke the provided Token from the application's storage.
   *
   * Unless the Client presents an unsupported Token Type Hint, fails to authenticate or does not present a Token,
   * this endpoint will always return a success response.
   *
   * This is done in order to prevent a Client from fishing any information that it should not have access to.
   *
   * @param request Http Request.
   * @returns Http Response.
   */
  public async handle(request: HttpRequest): Promise<HttpResponse> {
    this.logger.debug(`[${this.constructor.name}] Called handle()`, 'a8c9a314-35ec-45e1-bf9d-395aa2aad646', {
      request,
    });

    try {
      const context = await this.validator.validate(request);

      await this.revokeToken(context);

      const response = new HttpResponse().setHeaders(this.headers);

      this.logger.debug(`[${this.constructor.name}] Completed handle()`, '377e09ea-3cf6-483d-b772-e79514f12f39', {
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
        '26e4aabf-0b3f-413e-9ae5-2fba2f3db6bc',
        { request, response },
        error,
      );

      return response;
    }
  }

  /**
   * Revokes the provided Token from the application's storage.
   *
   * @param context Revocation Context.
   */
  private async revokeToken(context: RevocationContext): Promise<void> {
    this.logger.debug(`[${this.constructor.name}] Called revokeToken()`, '75153491-d19b-4f81-8064-8ec354d87f66', {
      context,
    });

    const { client, token } = context;

    if (token === null) {
      this.logger.debug(`[${this.constructor.name}] Completed revokeToken()`, '392b2f22-97c9-42f1-a330-5e89cd8ed73a', {
        context,
      });

      return;
    }

    if (!secureStringCompare(client.id, token.client!.id)) {
      this.logger.debug(`[${this.constructor.name}] Completed revokeToken()`, 'a293bae3-5702-45f8-b5f4-7ef636dc910e', {
        context,
      });

      return;
    }

    switch (true) {
      case token instanceof AccessToken:
        await this.dataAccess.revokeAccessToken(token);

        this.logger.debug(
          `[${this.constructor.name}] Completed revokeToken()`,
          '78f45220-e889-4106-b848-32f016329a4a',
          { context },
        );

        break;

      case token instanceof RefreshToken:
        await this.dataAccess.revokeRefreshToken!(token);

        this.logger.debug(
          `[${this.constructor.name}] Completed revokeToken()`,
          '5e2977f3-5ed9-4c46-9956-34d9c4771c8d',
          { context },
        );

        break;
    }
  }
}
