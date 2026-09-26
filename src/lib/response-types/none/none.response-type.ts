import { Injectable } from '@guarani/di';

import { NoneAuthorizationContext } from '../../context/authorization/none/none.authorization-context';
import { Logger } from '../../logger/logger';
import { ResponseModeName } from '../../response-modes/response-mode-name.type';
import { NoneAuthorizationResponse } from '../../responses/authorization/none/none.authorization-response';
import { ResponseType } from '../response-type';
import { ResponseTypeName } from '../response-type-name.type';

/**
 * Implementation of the None Response Type.
 *
 * In this Response Type the Client obtains consent from the User,
 * but no Authorization Code, Access Token, Access Token Type, or ID Token is returned.
 */
@Injectable()
export class NoneResponseType extends ResponseType {
  /**
   * Name of the Response Type.
   */
  public readonly name: ResponseTypeName = 'none';

  /**
   * Default Response Mode of the Response Type.
   */
  public readonly defaultResponseMode: ResponseModeName = 'query';

  /**
   * Instantiates a new None Response Type.
   *
   * @param logger Logger of the Identity Provider.
   */
  public constructor(private readonly logger: Logger) {
    super();
  }

  /**
   * Creates the Authorization Response with for an Authorization Grant
   * that will later be used by the Client on behalf of the User.
   *
   * @param context None Authorization Request Context.
   * @throws {InvalidRequestError} One of the provided parameters is invalid.
   * @returns None Authorization Response.
   */
  public async handle(context: NoneAuthorizationContext): Promise<NoneAuthorizationResponse> {
    this.logger.debug(`[${this.constructor.name}] Called handle()`, '6e0c6fa2-1794-4c2b-b4e8-d50b2695f314', {
      context,
    });

    const response: NoneAuthorizationResponse = {};

    this.logger.debug(`[${this.constructor.name}] Completed handle()`, '9decca51-ef78-4801-b29e-70b44490da13', {
      context,
      response,
    });

    return response;
  }
}
