import { Injectable } from '@guarani/di';

import { DataAccess } from '../../data-access/data-access';
import { Login } from '../../entities/login';
import { Session } from '../../entities/session';
import { Logger } from '../../logger/logger';

/**
 * Handler used to aggregate the Authentication operations of the Identity Provider.
 */
@Injectable()
export class AuthenticationHandler {
  /**
   * Instantiates a new Auth Handler.
   *
   * @param logger Logger of the Identity Provider.
   * @param dataAccess Data Access of the Identity Provider.
   */
  public constructor(
    private readonly logger: Logger,
    private readonly dataAccess: DataAccess,
  ) {}

  /**
   * Logs out the Authenticated User represented by the provided Login.
   *
   * @param login Login to be destroyed.
   * @param session Session of the User-Agent.
   */
  // TODO: Remove everything related to the User.
  public async logout(login: Login, session: Session): Promise<void> {
    this.logger.debug(`[${this.constructor.name}] Called logout()`, '5bfc412f-848a-4bd3-87eb-fc874b125360', {
      login,
      session,
    });

    if (session.activeLogin !== null && session.activeLogin.id === login.id) {
      this.logger.debug(
        `[${this.constructor.name}] Invalidating Active Login`,
        'a29d75e3-606e-4643-b5d3-26f4a0314e64',
        { login, session },
      );

      session.activeLogin = null;
    }

    session.logins = session.logins.filter((savedLogin) => savedLogin.id !== login.id);

    await this.dataAccess.logout(login, session);

    this.logger.debug(`[${this.constructor.name}] Completed logout()`, '5c75c258-f712-466a-8456-e9b83a1a7dff', {
      login,
      session,
    });
  }

  /**
   * Inactivates the Active Login from the User-Agent's Session.
   * This does not remove the actual Login from the storage, only makes it inactive on the Session.
   *
   * @param session Session of the User-Agent.
   */
  public async inactivateSessionActiveLogin(session: Session): Promise<void> {
    this.logger.debug(
      `[${this.constructor.name}] Called inactivateSessionActiveLogin()`,
      '480caa4a-ad64-4f1a-93f1-53fccf0f96ad',
      { session },
    );

    session.activeLogin = null;
    await this.dataAccess.inactivateSessionActiveLogin(session);

    this.logger.debug(
      `[${this.constructor.name}] Completed inactivateSessionActiveLogin()`,
      'c6708b75-14a2-431f-b639-87b3f4d0c118',
      { session },
    );
  }
}
