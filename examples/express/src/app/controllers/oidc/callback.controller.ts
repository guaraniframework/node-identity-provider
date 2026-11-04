import axios, { AxiosError } from 'axios';
import { Request, Response } from 'express';
import { stringify as stringifyQs } from 'querystring';
import { URL } from 'url';

import { getContainer } from '@guarani/di';

import { CONTAINER } from '../../../../../../src/lib/constants';
import { DataAccess } from '../../../../../../src/lib/data-access/data-access';
import { CodeAuthorizationResponse } from '../../../../../../src/lib/responses/authorization/code/code.authorization-response';
import { ErrorResponse } from '../../../../../../src/lib/responses/error/error-response';
import { AuthorizationCodeTokenResponse } from '../../../../../../src/lib/responses/token/authorization-code/authorization-code.token-response';
import { CustomDataAccess } from '../../custom.data-access';

class Controller {
  #container = getContainer(CONTAINER);

  #dataAccess!: CustomDataAccess;

  private get dataAccess(): CustomDataAccess {
    if (!(this.#dataAccess instanceof CustomDataAccess)) {
      this.#dataAccess = this.#container.resolve(DataAccess) as CustomDataAccess;
    }

    return this.#dataAccess;
  }

  public async callback(request: Request, response: Response): Promise<void> {
    const parameters = request.query as CodeAuthorizationResponse | ErrorResponse;

    if (typeof parameters.error !== 'undefined') {
      return this.redirectToErrorPage(response, parameters);
    }

    const client = (await this.dataAccess.findClientById(request.signedCookies['client_id']))!;

    const body = stringifyQs({
      grant_type: 'authorization_code',
      code: parameters.code as string,
      redirect_uri: 'https://localhost:4000/oidc/callback',
      code_verifier: 'tQZ78ORvyh21XgJFNyM4xVrpyFDutQMGWz03fVWO-1c',
    });

    try {
      const { data } = await axios.post<AuthorizationCodeTokenResponse>('/oidc/token', body, {
        auth: { username: client.id, password: client.secrets[0]!.secret },
        baseURL: 'https://localhost:4000',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      if (typeof data.id_token !== 'undefined') {
        response.cookie('id_token', data.id_token, { signed: true });
      }

      return response.redirect(303, '/profile');
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        return this.redirectToErrorPage(response, err.response?.data ?? {});
      }

      throw err;
    }
  }

  private redirectToErrorPage(response: Response, parameters: NodeJS.Dict<any>): void {
    const url = new URL('https://localhost:4000/oidc/error');
    url.search = stringifyQs(parameters);

    return response.redirect(303, url.href);
  }
}

export const CallbackController = new Controller();
