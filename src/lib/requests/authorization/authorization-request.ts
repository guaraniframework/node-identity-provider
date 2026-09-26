import { DisplayName } from '../../displays/display-name.type';
import { ResponseModeName } from '../../response-modes/response-mode-name.type';
import { ResponseTypeName } from '../../response-types/response-type-name.type';

/**
 * Parameters of the Authorization Request.
 */
export interface AuthorizationRequest extends NodeJS.Dict<string> {
  /**
   * Response Type requested by the Client.
   */
  readonly response_type: ResponseTypeName;

  /**
   * Identifier of the Client.
   */
  readonly client_id: string;

  /**
   * Redirect URI provided by the Client.
   */
  readonly redirect_uri: string;

  /**
   * Scope requested by the Client.
   */
  readonly scope: string;

  /**
   * State of the Client Application prior to the Authorization Request.
   */
  readonly state?: string;

  /**
   * Response Mode requested by the Client.
   */
  readonly response_mode?: ResponseModeName;

  /**
   * Nonce provided by the Client to associate itself to a login and to prevent Replay Attacks.
   * This value is passed unmodified from the Authorization Request to the ID Token.
   */
  readonly nonce?: string;

  /**
   * Display requested by the Client.
   */
  readonly display?: DisplayName;

  /**
   * Space delimited list of Prompt values requested by the Client.
   */
  readonly prompt?: string;

  /**
   * Number of seconds since the User's last active authentication
   * in which the Identity Provider must actively re-authenticate the User.
   */
  readonly max_age?: string;

  /**
   * User's preferred languages and scripts for the User Interface.
   */
  readonly ui_locales?: string;

  /**
   * ID Token used as a hint about the User that the Client expects to be authenticated.
   */
  readonly id_token_hint?: string;

  /**
   * Hint about the Identifier that the User might use for authentication.
   */
  readonly login_hint?: string;

  /**
   * Space delimited list of Authentication Context Class References requested by the Client in order of preference.
   */
  readonly acr_values?: string;
}
