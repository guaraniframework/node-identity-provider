import axios, { AxiosError } from 'axios';
import { Request, Response } from 'express';
import qs from 'querystring';
import { URL } from 'url';

import { getContainer } from '@guarani/di';
import { isNonEmptyString } from '@guarani/primitives';

import { CONTAINER } from '../../../../../../src/lib/constants';
import { DataAccess } from '../../../../../../src/lib/data-access/data-access';
import { DisplayName } from '../../../../../../src/lib/displays/display-name.type';
import { InvalidRequestError } from '../../../../../../src/lib/errors/invalid-request/invalid-request.error';
import { SelectAccountDecisionInteractionRequest } from '../../../../../../src/lib/requests/interaction/decision/select-account/select-account.decision-interaction-request';
import { SelectAccountContextInteractionResponse } from '../../../../../../src/lib/responses/interaction/context/select-account/select-account.context-interaction-response';
import { SelectAccountDecisionInteractionResponse } from '../../../../../../src/lib/responses/interaction/decision/select-account/select-account.decision-interaction-response';
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
    const loginChallenge = request.query['login_challenge'] as string;

    if (!isNonEmptyString(loginChallenge)) {
      const error = new InvalidRequestError('Invalid parameter "login_challenge".');
      response.json(error.toJSON());
      return;
    }

    const client = (await this.dataAccess.findClientById(request.signedCookies['client_id']))!;

    const sessionId = request.signedCookies['guarani:session'];

    const url = new URL('https://localhost:4000/oidc/interaction');
    url.search = qs.stringify({
      interaction_type: 'select_account',
      client_id: client.id,
      login_challenge: loginChallenge,
      session_id: sessionId,
    });

    try {
      const { data } = await axios.get<SelectAccountContextInteractionResponse>(url.href);
      const logins = await this.dataAccess.findLoginsByIds(data.logins_ids);

      const { display } = data.context;

      if (display === 'popup') {
        response.cookie('display', 'popup');
      }

      return response.render('auth/account-selection', {
        request,
        title: 'Select Account',
        login_challenge: loginChallenge,
        logins,
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
    const { login_challenge: loginChallenge, login_id: loginId } = request.body;

    const requestParameters: SelectAccountDecisionInteractionRequest = {
      interaction_type: 'select_account',
      login_challenge: loginChallenge as string,
      login_id: loginId as string,
    };

    const requestBody = qs.stringify(requestParameters);

    try {
      const client = (await this.dataAccess.findClientById(request.signedCookies['client_id']))!;

      const {
        data: { redirect_to: redirectTo },
      } = await axios.post<SelectAccountDecisionInteractionResponse>(
        'https://localhost:4000/oidc/interaction',
        requestBody,
        {
          auth: { username: client.id, password: client.secrets[0]!.secret },
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        },
      );

      const display = request.cookies['display'] as DisplayName;

      return this.redirectOrClosePopup(response, redirectTo, display);
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        response.json(err.response?.data);
        return;
      }

      throw err;
    }
  }

  private redirectOrClosePopup(response: Response, url: string, display: DisplayName): void {
    if (display === 'popup') {
      response.clearCookie('display').send(popupTemplateFn(url));
      return;
    }

    return response.redirect(303, url);
  }
}

export const AccountSelectionController = new Controller();
