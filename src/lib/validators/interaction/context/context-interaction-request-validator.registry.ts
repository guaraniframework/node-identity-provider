import { Constructor } from '@guarani/di';

import { InteractionTypeName } from '../../../interaction-types/interaction-type-name.type';
import { ConsentContextInteractionRequestValidator } from './consent/consent-context.interaction-request.validator';
import { CreateContextInteractionRequestValidator } from './create/create-context.interaction-request.validator';
import { LoginContextInteractionRequestValidator } from './login/login-context.interaction-request.validator';
import { SelectAccountContextInteractionRequestValidator } from './select-account/select-account-context.interaction-request.validator';
import { ContextInteractionRequestValidator } from './context.interaction-request.validator';

/**
 * Context Interaction Request Validator Registry.
 */
export const contextInteractionRequestValidatorRegistry: Record<
  InteractionTypeName,
  Constructor<ContextInteractionRequestValidator>
> = {
  consent: ConsentContextInteractionRequestValidator,
  create: CreateContextInteractionRequestValidator,
  login: LoginContextInteractionRequestValidator,
  select_account: SelectAccountContextInteractionRequestValidator,
};
