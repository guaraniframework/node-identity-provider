import axios, { AxiosError } from 'axios';
import { Request, Response } from 'express';
import qs from 'querystring';
import { URL } from 'url';

import { getContainer } from '@guarani/di';

import { CONTAINER } from '../../../../../../src/lib/constants';
import { DataAccess } from '../../../../../../src/lib/data-access/data-access';
import { DisplayName } from '../../../../../../src/lib/displays/display-name.type';
import { User } from '../../../../../../src/lib/entities/user';
import { CodeAuthorizationRequest } from '../../../../../../src/lib/requests/authorization/code/code.authorization-request';
import { LoginAcceptDecisionInteractionRequest } from '../../../../../../src/lib/requests/interaction/decision/login/login-accept.decision-interaction-request';
import { LoginContextInteractionResponse } from '../../../../../../src/lib/responses/interaction/context/login/login.context-interaction-response';
import { LoginDecisionInteractionResponse } from '../../../../../../src/lib/responses/interaction/decision/login/login.decision-interaction-response';
import { CustomDataAccess } from '../../custom.data-access';

const popupTemplateFn = (redirectUri: string): string => `
<script type="text/javascript">
  window.opener.callback('${redirectUri}');
  window.close();
</script>
`;

class Controller {
  #container = getContainer(CONTAINER);

  #dataAccess!: CustomDataAccess;

  private get dataAccess(): CustomDataAccess {
    if (!(this.#dataAccess instanceof CustomDataAccess)) {
      this.#dataAccess = this.#container.resolve(DataAccess) as CustomDataAccess;
    }

    return this.#dataAccess;
  }

  public async get(request: Request, response: Response): Promise<void> {
    try {
      const client = (await this.dataAccess.findClientById(request.signedCookies['client_id']))!;

      const loginChallenge = request.query['login_challenge'] as string;

      // TODO: Add check to select an account or login when previous login exist.
      if (typeof loginChallenge !== 'string') {
        const parameters: CodeAuthorizationRequest = {
          response_type: 'code',
          client_id: client.id,
          redirect_uri: 'https://localhost:4000/oidc/callback',
          scope: 'openid profile email phone address',
          state: '2d0454dd-4679-4ca5-a96e-f4d601550639',
          code_challenge: 'kRaf6IMJlerQjcqlFczEUYUcVsdwMpYonctl1yXYiiI',
          code_challenge_method: 'S256',
          nonce: '70a624dc-9322-482a-aedf-2b5ea905bc40',
          prompt: 'login',
        };

        const url = new URL('https://localhost:4000/oidc/authorization');
        url.search = qs.stringify(parameters);

        return response.redirect(303, url.href);
      }

      const url = new URL('https://localhost:4000/oidc/interaction');
      url.search = qs.stringify({ interaction_type: 'login', client_id: client.id, login_challenge: loginChallenge });

      const { data } = await axios.get<LoginContextInteractionResponse>(url.href);

      const { display, auth_exp: authExp, prompts, login_hint: loginHint } = data.context;

      if (display === 'popup') {
        response.cookie('display', 'popup');
      }

      if (data.skip) {
        return this.redirectOrClosePopup(response, data.request_url, display ?? null);
      }

      if (
        request.isAuthenticated() &&
        prompts?.includes('login') !== true && // no prompt login
        (typeof authExp === 'undefined' || new Date() <= new Date(authExp * 1000)) // no max_age or not expired yet.
      ) {
        return await this.doLogin(request, response, loginChallenge, request.user as User, display);
      }

      return response.render('auth/login', {
        request,
        title: 'Login',
        login_challenge: loginChallenge,
        login_hint: loginHint,
        error: request.flash('error'),
        success: request.flash('success'),
      });
    } catch (err: any) {
      if (err instanceof AxiosError) {
        response.json(err.response?.data);
        return;
      }

      throw err;
    }
  }

  public async post(request: Request, response: Response): Promise<void> {
    const { login_challenge: loginChallenge } = request.body;

    if (typeof loginChallenge !== 'string') {
      return response.redirect(303, '/');
    }

    return await this.doLogin(request, response, loginChallenge, request.user as User);
  }

  private async doLogin(
    request: Request,
    response: Response,
    loginChallenge: string,
    user: User,
    display?: DisplayName,
  ): Promise<void> {
    const reqParameters: LoginAcceptDecisionInteractionRequest = {
      interaction_type: 'login',
      login_challenge: loginChallenge,
      decision: 'accept',
      subject_id: user.id,
      amr: 'pwd',
      acr: 'urn:guarani:acr:1fa',
    };

    const reqBody = qs.stringify(reqParameters);

    try {
      const client = (await this.dataAccess.findClientById(request.signedCookies['client_id']))!;

      const {
        data: { redirect_to: redirectTo },
      } = await axios.post<LoginDecisionInteractionResponse>('https://localhost:4000/oidc/interaction', reqBody, {
        auth: { username: client.id, password: client.secrets[0]!.secret },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      display ??= request.cookies['display'] as DisplayName;

      return this.redirectOrClosePopup(response, redirectTo, display);
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        response.json(err.response?.data);
        return;
      }

      throw err;
    }
  }

  private redirectOrClosePopup(response: Response, url: string, display: DisplayName | null): void {
    if (display === 'popup') {
      response.clearCookie('display').send(popupTemplateFn(url));
      return;
    }

    return response.redirect(303, url);
  }
}

export const LoginController = new Controller();
