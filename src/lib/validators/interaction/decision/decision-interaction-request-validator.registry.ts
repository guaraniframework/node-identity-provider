import { Constructor } from '@guarani/di';

import { InteractionTypeName } from '../../../interaction-types/interaction-type-name.type';
import { ConsentDecisionInteractionRequestValidator } from './consent/consent-decision.interaction-request.validator';
import { CreateDecisionInteractionRequestValidator } from './create/create-decision.interaction-request.validator';
import { LoginDecisionInteractionRequestValidator } from './login/login-decision.interaction-request.validator';
import { SelectAccountDecisionInteractionRequestValidator } from './select-account/select-account-decision.interaction-request.validator';
import { DecisionInteractionRequestValidator } from './decision.interaction-request.validator';

/**
 * Decision Interaction Request Validator Registry.
 */
export const decisionInteractionRequestValidatorRegistry: Record<
  InteractionTypeName,
  Constructor<DecisionInteractionRequestValidator>
> = {
  consent: ConsentDecisionInteractionRequestValidator,
  create: CreateDecisionInteractionRequestValidator,
  login: LoginDecisionInteractionRequestValidator,
  select_account: SelectAccountDecisionInteractionRequestValidator,
};
