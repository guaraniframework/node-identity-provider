import { Request, Response } from 'express';

import { ErrorResponse } from '../../../../../../src/lib/responses/error/error-response';

class Controller {
  public async error(request: Request, response: Response): Promise<void> {
    const parameters = request.query as ErrorResponse;

    if (parameters.error === 'login_required') {
      request.logout(() => null);
    }

    return response.render('oidc/error', { request, title: 'OAuth 2.0 Error', parameters });
  }
}

export const ErrorController = new Controller();
