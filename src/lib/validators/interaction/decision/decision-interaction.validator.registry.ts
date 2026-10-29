import { Constructor } from '@guarani/di';

import { InteractionTypeName } from '../../../interaction-types/interaction-type-name.type';
import { ConsentDecisionInteractionValidator } from './consent/consent.decision-interaction.validator';
import { CreateDecisionInteractionValidator } from './create/create.decision-interaction.validator';
import { LoginDecisionInteractionValidator } from './login/login.decision-interaction.validator';
import { SelectAccountDecisionInteractionValidator } from './select-account/select-account.decision-interaction.validator';
import { DecisionInteractionValidator } from './decision-interaction.validator';

/**
 * Decision Interaction Validator Registry of the Identity Provider.
 */
export const DECISION_INTERACTION_VALIDATOR_REGISTRY: Record<
  InteractionTypeName,
  Constructor<DecisionInteractionValidator>
> = {
  consent: ConsentDecisionInteractionValidator,
  create: CreateDecisionInteractionValidator,
  login: LoginDecisionInteractionValidator,
  select_account: SelectAccountDecisionInteractionValidator,
};
