import { URL } from 'url';

import { Display } from '../../displays/display';
import { Client } from '../../entities/client';
import { Scope } from '../../entities/scope';
import { Session } from '../../entities/session';
import { AuthorizationRequest } from '../../requests/authorization/authorization-request';
import { ResponseMode } from '../../response-modes/response-mode';
import { ResponseType } from '../../response-types/response-type';
import { Prompt } from '../../types/promt.type';

/**
 * Parameters of the Authorization Context.
 */
export interface AuthorizationContext<TRequest extends AuthorizationRequest = AuthorizationRequest> {
  /**
   * Parameters of the Authorization Request.
   */
  readonly parameters: TRequest;

  /**
   * Response Type requested by the Client.
   */
  readonly responseType: ResponseType;

  /**
   * Client of the Authorization Request.
   */
  readonly client: Client;

  /**
   * Redirect URI provided by the Client.
   */
  readonly redirectUri: URL;

  /**
   * Scopes granted to the Client.
   */
  readonly scopes: Scope[];

  /**
   * State of the Client prior to the Authorization Request.
   */
  readonly state: string | null;

  /**
   * Response Mode used to generate the Authorization Response.
   */
  readonly responseMode: ResponseMode;

  /**
   * Nonce provided by the Client to associate itself to a login and to prevent Replay Attacks.
   * This value is passed unmodified from the Authorization Request to the ID Token.
   */
  readonly nonce: string | null;

  /**
   * Display used to present the interaction UIs to the End User.
   */
  readonly display: Display;

  /**
   * Prompts requested by the Client.
   */
  readonly prompts: Prompt[];

  /**
   * Number of seconds since the User's last active authentication
   * in which the Identity Provider must actively re-authenticate the User.
   */
  readonly maxAge: number | null;

  /**
   * User's preferred languages and scripts for the User Interface.
   */
  readonly uiLocales: string[];

  /**
   * ID Token used as a hint about the User that the Client expects to be authenticated.
   */
  readonly idTokenHint: string | null;

  /**
   * Hint about the Identifier that the User might use for authentication.
   */
  readonly loginHint: string | null;

  /**
   * Authentication Context Class References requested by the Client in order of preference.
   */
  readonly acrValues: string[];

  /**
   * Session containing the Logins and current active Login.
   */
  session: Session | null;
}
