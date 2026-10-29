import { Client } from '../entities/client';
import { User } from '../entities/user';
import { SubjectTypeName } from './subject-type-name.type';

/**
 * Base class of a Subject Type.
 */
export abstract class SubjectType {
  /**
   * Name of the Subject Type.
   */
  public abstract readonly name: SubjectTypeName;

  /**
   * Calculates the Subject Identifier to be returned to the Client.
   *
   * @param user Authenticated User.
   * @param client Client of the Request.
   * @returns Subject Identifier.
   */
  public abstract calculateSubjectIdentifier(user: User, client: Client): string;

  /**
   * Retrieves the Local Subject Identifier based on the Subject Identifier provided by the Client.
   *
   * @param subjectIdentifier Subject Identifier provided by the Client.
   * @param client Client of the Request.
   * @returns Local Subject Identifier.
   */
  public abstract retrieveSubjectIdentifier(subjectIdentifier: string, client: Client): string;
}
