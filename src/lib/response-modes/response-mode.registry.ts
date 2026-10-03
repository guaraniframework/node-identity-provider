import { Constructor } from '@guarani/di';

import { FormPostResponseMode } from './form-post/form-post.response-mode';
import { FragmentResponseMode } from './fragment/fragment.response-mode';
import { QueryResponseMode } from './query/query.response-mode';
import { ResponseMode } from './response-mode';
import { ResponseModeName } from './response-mode-name.type';

/**
 * Response Mode Registry.
 */
export const responseModeRegistry: Record<ResponseModeName, Constructor<ResponseMode>> = {
  form_post: FormPostResponseMode,
  fragment: FragmentResponseMode,
  query: QueryResponseMode,
};
