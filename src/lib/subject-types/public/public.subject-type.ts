import { Injectable } from '@guarani/di';

import { Client } from '../../entities/client';
import { User } from '../../entities/user';
import { Logger } from '../../logger/logger';
import { SubjectType } from '../subject-type';
import { SubjectTypeName } from '../subject-type-name.type';

/**
 * Implementation of the Public Subject Type.
 */
@Injectable()
export class PublicSubjectType extends SubjectType {
  /**
   * Name of the Subject Type.
   */
  public readonly name: SubjectTypeName = 'public';

  /**
   * Instantiates a new Public Subject Type.
   *
   * @param logger Logger of the Identity Provider.
   */
  public constructor(private readonly logger: Logger) {
    super();
  }

  /**
   * Calculates the Subject Identifier to be returned to the Client.
   *
   * @param user Authenticated User.
   * @param client Client of the Request.
   * @returns Subject Identifier.
   */
  public calculateSubjectIdentifier(user: User, client: Client): string {
    this.logger.debug(
      `[${this.constructor.name}] Called calculateSubjectIdentifier()`,
      '6641c638-d7c4-45fc-8faa-6b3f0af2d774',
      { user, client },
    );

    const subjectIdentifier = user.id;

    this.logger.debug(
      `[${this.constructor.name}] Completed calculateSubjectIdentifier()`,
      '36e716db-34a6-4928-a667-5e07d3d6298e',
      { user, client, subject_identifier: subjectIdentifier },
    );

    return subjectIdentifier;
  }

  /**
   * Retrieves the Local Subject Identifier based on the Subject Identifier provided by the Client.
   *
   * @param subjectIdentifier Subject Identifier provided by the Client.
   * @param client Client of the Request.
   * @returns Local Subject Identifier.
   */
  public retrieveSubjectIdentifier(subjectIdentifier: string, client: Client): string {
    this.logger.debug(
      `[${this.constructor.name}] Called retrieveSubjectIdentifier()`,
      'bf6356bf-4880-4df1-ae65-c9f85a2744b2',
      { subject_identifier: subjectIdentifier, client },
    );

    this.logger.debug(
      `[${this.constructor.name}] Completed retrieveSubjectIdentifier()`,
      '5f1f6369-37b5-43b7-8680-1af5ec717a4d',
      { subject_identifier: subjectIdentifier, client, local_subject_identifier: subjectIdentifier },
    );

    return subjectIdentifier;
  }
}
