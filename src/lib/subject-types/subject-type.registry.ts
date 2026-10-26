import { Constructor } from '@guarani/di';

import { PairwiseSubjectType } from './pairwise/pairwise.subject-type';
import { PublicSubjectType } from './public/public.subject-type';
import { SubjectType } from './subject-type';
import { SubjectTypeName } from './subject-type-name.type';

/**
 * Subject Type Registry.
 */
export const subjectTypeRegistry: Record<SubjectTypeName, Constructor<SubjectType>> = {
  pairwise: PairwiseSubjectType,
  public: PublicSubjectType,
};
