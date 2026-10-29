import { Constructor } from '@guarani/di';

import { PairwiseSubjectType } from './pairwise/pairwise.subject-type';
import { PublicSubjectType } from './public/public.subject-type';
import { SubjectType } from './subject-type';
import { SubjectTypeName } from './subject-type-name.type';

/**
 * Subject Type Registry of the Identity Provider.
 */
export const SUBJECT_TYPE_REGISTRY: Record<SubjectTypeName, Constructor<SubjectType>> = {
  pairwise: PairwiseSubjectType,
  public: PublicSubjectType,
};
