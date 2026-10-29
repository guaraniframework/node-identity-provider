import { Constructor } from '@guarani/di';

import { InteractionTypeName } from '../../../interaction-types/interaction-type-name.type';
import { ConsentContextInteractionValidator } from './consent/consent.context-interaction.validator';
import { CreateContextInteractionValidator } from './create/create.context-interaction.validator';
import { LoginContextInteractionValidator } from './login/login.context-interaction.validator';
import { SelectAccountContextInteractionValidator } from './select-account/select-account.context-interaction.validator';
import { ContextInteractionValidator } from './context-interaction.validator';

/**
 * Context Interaction Validator Registry of the Identity Provider.
 */
export const CONTEXT_INTERACTION_VALIDATOR_REGISTRY: Record<
  InteractionTypeName,
  Constructor<ContextInteractionValidator>
> = {
  consent: ConsentContextInteractionValidator,
  create: CreateContextInteractionValidator,
  login: LoginContextInteractionValidator,
  select_account: SelectAccountContextInteractionValidator,
};
