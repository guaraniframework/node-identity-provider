import axios, { AxiosError } from 'axios';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Request, Response } from 'express';
import qs from 'querystring';
import { URL } from 'url';

import { getContainer } from '@guarani/di';

import { CONTAINER } from '../../../../../../src/lib/constants';
import { DataAccess } from '../../../../../../src/lib/data-access/data-access';
import { DisplayName } from '../../../../../../src/lib/displays/display-name.type';
import { InvalidRequestError } from '../../../../../../src/lib/errors/invalid-request/invalid-request.error';
import { CodeAuthorizationRequest } from '../../../../../../src/lib/requests/authorization/code/code.authorization-request';
import { CreateDecisionInteractionRequest } from '../../../../../../src/lib/requests/interaction/decision/create/create.decision-interaction-request';
import { CreateContextInteractionResponse } from '../../../../../../src/lib/responses/interaction/context/create/create.context-interaction-response';
import { CreateDecisionInteractionResponse } from '../../../../../../src/lib/responses/interaction/decision/create/create.decision-interaction-response';
import { Settings } from '../../../../../../src/lib/settings/settings';
import { CustomDataAccess } from '../../custom.data-access';
import { UserRegistrationDto } from '../../dto/user-registration.dto';

const popupTemplateFn = (redirectUri: string): string => `
<script type="text/javascript">
  window.opener.callback('${redirectUri}');
  window.close();
</script>
`;

class Controller {
  #container = getContainer(CONTAINER);

  #dataAccess!: CustomDataAccess;
  #settings!: Settings;

  private get dataAccess(): CustomDataAccess {
    if (!(this.#dataAccess instanceof CustomDataAccess)) {
      this.#dataAccess = this.#container.resolve(DataAccess) as CustomDataAccess;
    }

    return this.#dataAccess;
  }

  private get settings(): Settings {
    if (!(this.#settings instanceof Settings)) {
      this.#settings = this.#container.resolve(Settings);
    }

    return this.#settings;
  }

  public async get(request: Request, response: Response): Promise<void> {
    try {
      const client = (await this.dataAccess.findClientById(request.signedCookies['client_id']))!;

      const loginChallenge = request.query['login_challenge'] as string;

      if (typeof loginChallenge !== 'string') {
        const parameters: CodeAuthorizationRequest = {
          response_type: 'code',
          client_id: client.id,
          redirect_uri: 'https://localhost:4000/oidc/callback',
          scope: 'openid profile email phone address',
          state: '2d0454dd-4679-4ca5-a96e-f4d601550639',
          code_challenge: 'kRaf6IMJlerQjcqlFczEUYUcVsdwMpYonctl1yXYiiI',
          code_challenge_method: 'S256',
          prompt: 'create',
          nonce: 'nonce',
        };

        const url = new URL('https://localhost:4000/oidc/authorization');
        url.search = qs.stringify(parameters);

        return response.redirect(303, url.href);
      }

      const url = new URL('https://localhost:4000/oidc/interaction');
      url.search = qs.stringify({ interaction_type: 'create', client_id: client.id, login_challenge: loginChallenge });

      const { data } = await axios.get<CreateContextInteractionResponse>(url.href);

      if (data.context.display === 'popup') {
        response.cookie('display', 'popup');
      }

      if (data.skip) {
        return this.redirectOrClosePopup(response, data.request_url, data.context.display ?? null);
      }

      return response.render('auth/registration', {
        request,
        title: 'Registration',
        login_challenge: loginChallenge,
        errors: request.flash('errors'),
      });
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        response.json(err.response?.data);
        return;
      }

      throw err;
    }
  }

  public async post(request: Request, response: Response): Promise<void> {
    const { login_challenge: loginChallenge } = request.body;

    const userRegistrationDto = plainToInstance(UserRegistrationDto, request.body);

    const errors = await validate(userRegistrationDto);

    if (errors.length > 0) {
      request.flash('errors', errors.map((error) => Object.values(error.constraints ?? {})).flat());
      return response.redirect(303, `/auth/registration?login_challenge=${loginChallenge}`);
    }

    const requestParameters: CreateDecisionInteractionRequest = {
      interaction_type: 'create',
      login_challenge: loginChallenge as string,
      ...userRegistrationDto,
    };

    const requestBody = qs.stringify(requestParameters);

    try {
      const client = (await this.dataAccess.findClientById(request.signedCookies['client_id']))!;

      const {
        data: { redirect_to: redirectTo },
      } = await axios.post<CreateDecisionInteractionResponse>('https://localhost:4000/oidc/interaction', requestBody, {
        auth: { username: client.id, password: client.secrets[0]!.secret },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

      const sessionId = request.signedCookies[this.settings.sessionCookie!];
      const session = await this.dataAccess.findSessionById(sessionId);

      if (session === null) {
        throw new InvalidRequestError('User not authenticated.');
      }

      request.login(session.activeLogin!.user, { session: true }, () => {
        const display = request.cookies['display'] as DisplayName;
        return this.redirectOrClosePopup(response, redirectTo, display);
      });
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

export const RegistrationController = new Controller();
