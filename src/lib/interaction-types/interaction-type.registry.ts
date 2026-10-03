import { Constructor } from '@guarani/di';

import { ConsentInteractionType } from './consent/consent.interaction-type';
import { CreateInteractionType } from './create/create.interaction-type';
import { LoginInteractionType } from './login/login.interaction-type';
import { SelectAccountInteractionType } from './select-account/select-account.interaction-type';
import { InteractionType } from './interaction-type';
import { InteractionTypeName } from './interaction-type-name.type';

/**
 * Interaction Type Registry.
 */
export const interactionTypeRegistry: Record<InteractionTypeName, Constructor<InteractionType>> = {
  consent: ConsentInteractionType,
  create: CreateInteractionType,
  login: LoginInteractionType,
  select_account: SelectAccountInteractionType,
};
