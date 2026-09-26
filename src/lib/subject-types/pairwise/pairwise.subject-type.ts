import { createCipheriv, createDecipheriv } from 'crypto';

import { Inject, Injectable } from '@guarani/di';

import { Client } from '../../entities/client';
import { User } from '../../entities/user';
import { Logger } from '../../logger/logger';
import { type Settings } from '../../settings/settings';
import { SETTINGS } from '../../settings/settings.token';
import { SubjectType } from '../subject-type';
import { SubjectTypeName } from '../subject-type-name.type';

/**
 * Implementation of the Pairwise Subject Type.
 */
@Injectable()
export class PairwiseSubjectType extends SubjectType {
  /**
   * Name of the Subject Type.
   */
  public readonly name: SubjectTypeName = 'pairwise';

  /**
   * Instantiates a new Pairwise Subject Type.
   *
   * @param logger Logger of the Identity Provider.
   * @param settings Settings of the Identity Provider.
   */
  public constructor(
    private readonly logger: Logger,
    @Inject(SETTINGS) private readonly settings: Settings,
  ) {
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
      '0f4c68d1-b202-40fd-9ee1-3c44e1cfba30',
      { user, client },
    );

    const sectorIdentifier = client.sectorIdentifierUri!.hostname;

    const secretKey = Buffer.from(this.settings.secretKey, 'utf8').subarray(0, 16);
    const plaintext = Buffer.from(`${sectorIdentifier}${user.id}`, 'utf8');

    const cipher = createCipheriv('aes-128-cbc', secretKey, Buffer.alloc(16, 0x00));
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);

    const subjectIdentifier = ciphertext.toString('base64url');

    this.logger.debug(
      `[${this.constructor.name}] Completed calculateSubjectIdentifier()`,
      'a0889250-265a-4504-a8f8-9dff59c219fa',
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
      '5fa7e625-2928-4911-8d40-288181f7a6c9',
      { subject_identifier: subjectIdentifier, client },
    );

    const sectorIdentifier = client.sectorIdentifierUri!.hostname;

    const secretKey = Buffer.from(this.settings.secretKey, 'utf8').subarray(0, 16);
    const ciphertext = Buffer.from(subjectIdentifier, 'base64url');

    const decipher = createDecipheriv('aes-128-cbc', secretKey, Buffer.alloc(16, 0x00));
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);

    const localSubjectIdentifier = plaintext.toString('utf8').replace(sectorIdentifier, '');

    this.logger.debug(
      `[${this.constructor.name}] Completed retrieveSubjectIdentifier()`,
      'ea2ac149-3316-421b-b962-e9813c19e596',
      { subject_identifier: subjectIdentifier, client, local_subject_identifier: localSubjectIdentifier },
    );

    return localSubjectIdentifier;
  }
}
