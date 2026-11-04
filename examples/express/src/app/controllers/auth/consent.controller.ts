import axios, { AxiosError } from 'axios';
import { Request, Response } from 'express';
import { stringify as stringifyQs } from 'querystring';
import { URL } from 'url';

import { getContainer } from '@guarani/di';

import { CONTAINER } from '../../../../../../src/lib/constants';
import { DataAccess } from '../../../../../../src/lib/data-access/data-access';
import { DisplayName } from '../../../../../../src/lib/displays/display-name.type';
import { ConsentDecision } from '../../../../../../src/lib/requests/interaction/decision/consent/consent.decision';
import { ConsentDecisionInteractionRequest } from '../../../../../../src/lib/requests/interaction/decision/consent/consent.decision-interaction-request';
import { ConsentContextInteractionResponse } from '../../../../../../src/lib/responses/interaction/context/consent/consent.context-interaction-response';
import { ConsentDecisionInteractionResponse } from '../../../../../../src/lib/responses/interaction/decision/consent/consent.decision-interaction-response';
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
    const consentChallenge = request.query['consent_challenge'] as string;

    if (typeof consentChallenge !== 'string') {
      return response.render('auth/consent', {
        request,
        title: 'Consent',
        error: request.flash('error'),
        success: request.flash('success'),
      });
    }

    const client = (await this.dataAccess.findClientById(request.signedCookies['client_id']))!;

    const url = new URL('https://localhost:4000/oidc/interaction');
    url.search = stringifyQs({
      interaction_type: 'consent',
      client_id: client.id,
      consent_challenge: consentChallenge,
    });

    const { data } = await axios.get<ConsentContextInteractionResponse>(url.href);

    const { display } = data.context;

    if (display === 'popup') {
      response.cookie('display', 'popup');
    }

    if (data.skip) {
      return this.redirectOrClosePopup(response, data.request_url, display ?? null);
    }

    return response.render('auth/consent', {
      request,
      title: 'Consent',
      consent: data,
      consent_challenge: consentChallenge,
      scopes: data.requested_scopes,
      error: request.flash('error'),
      success: request.flash('success'),
    });
  }

  public async post(request: Request, response: Response): Promise<void> {
    const { consent_challenge: consentChallenge, grant_scope: grantScope, decision } = request.body;

    if (typeof consentChallenge !== 'string') {
      return response.redirect(303, '/');
    }

    const reqData: ConsentDecisionInteractionRequest = {
      interaction_type: 'consent',
      consent_challenge: consentChallenge,
      decision: decision as ConsentDecision,
    };

    switch (decision) {
      case 'accept':
        reqData['granted_scope'] = (grantScope as string[]).join(' ');
        break;

      case 'deny':
        reqData['error'] = 'consent_denied';
        reqData['error_description'] = 'The user denied the requested Scopes.';
        break;

      default:
        throw new Error('Invalid parameter "decision".');
    }

    const reqBody = stringifyQs(reqData);

    try {
      const client = (await this.dataAccess.findClientById(request.signedCookies['client_id']))!;

      const {
        data: { redirect_to: redirectTo },
      } = await axios.post<ConsentDecisionInteractionResponse>('https://localhost:4000/oidc/interaction', reqBody, {
        auth: { username: client.id, password: client.secrets[0]!.secret },
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });

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

  private redirectOrClosePopup(response: Response, url: string, display: DisplayName | null): void {
    if (display === 'popup') {
      response.clearCookie('display').send(popupTemplateFn(url));
      return;
    }

    return response.redirect(303, url);
  }
}

export const ConsentController = new Controller();
