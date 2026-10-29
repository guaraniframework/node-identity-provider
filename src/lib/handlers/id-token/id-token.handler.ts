import { Buffer } from 'buffer';
import { createHash } from 'crypto';

import { Injectable, InjectAll } from '@guarani/di';
import {
  DigitalSignatureAlgorithm,
  InvalidJsonWebKeyError,
  JsonWebEncryptionHeaderParameters,
  JsonWebKey,
  JsonWebSignatureHeaderParameters,
  jwe,
  jwt,
} from '@guarani/jose';
import { isNonEmptyString, removeNullishValues } from '@guarani/primitives';

import { IdTokenClaims } from '../../claims/id-token/id-token.claims';
import { IdTokenClaimsParameters } from '../../claims/id-token/id-token.claims.parameters';
import { DataAccess } from '../../data-access/data-access';
import { Client } from '../../entities/client';
import { Consent } from '../../entities/consent';
import { Login } from '../../entities/login';
import { User } from '../../entities/user';
import { Logger } from '../../loggers/logger';
import { Settings } from '../../settings/settings';
import { SubjectType } from '../../subject-types/subject-type';
import { GenerateIdTokenOptions } from './generate-id-token.options';

/**
 * Handler used to aggregate the operations of the OpenID Connect ID Token.
 */
@Injectable()
export class IdTokenHandler {
  /**
   * Instantiates a new ID Token Handler.
   *
   * @param logger Logger of the Authorization Server.
   * @param dataAccess Data Access of the Identity Provider.
   * @param settings Settings of the Identity Provider.
   * @param subjectTypes Subject Types of the Identity Provider.
   * @throws {TypeError} Missing required implementations.
   */
  public constructor(
    private readonly logger: Logger,
    private readonly dataAccess: DataAccess,
    private readonly settings: Settings,
    @InjectAll(SubjectType) private readonly subjectTypes: SubjectType[],
  ) {
    if (this.settings.idTokenSignatureAlgorithms.length === 0) {
      const error = new TypeError('The Identity Provider does not support ID Tokens.');

      this.logger.fatal(
        `[${this.constructor.name}] The Identity Provider does not support ID Tokens`,
        '03852086-d930-494c-88e6-d00fd8897106',
        null,
        error,
      );

      throw error;
    }

    if (typeof this.dataAccess.findJsonWebKeyByKeyId !== 'function') {
      const error = new TypeError('Missing implementation of required method "DataAccess.findJsonWebKeyByKeyId".');

      this.logger.fatal(
        `[${this.constructor.name}] Missing implementation of required method "DataAccess.findJsonWebKeyByKeyId"`,
        '564cbe7e-60c5-437c-b753-4aedfa47bad6',
        null,
        error,
      );

      throw error;
    }

    if (typeof this.dataAccess.getSignJsonWebKey !== 'function') {
      const error = new TypeError('Missing implementation of required method "DataAccess.getSignJsonWebKey".');

      this.logger.fatal(
        `[${this.constructor.name}] Missing implementation of required method "DataAccess.getSignJsonWebKey"`,
        '5974af1a-368e-4d08-a523-2205d3403574',
        null,
        error,
      );

      throw error;
    }

    if (typeof this.dataAccess.getUserinfo !== 'function') {
      const error = new TypeError('Missing implementation of required method "DataAccess.getUserinfo".');

      this.logger.fatal(
        `[${this.constructor.name}] Missing implementation of required method "DataAccess.getUserinfo"`,
        'a481ec2b-907e-429c-9564-c80314d1905a',
        null,
        error,
      );

      throw error;
    }

    if (this.settings.idTokenKeyWrapAlgorithms.length !== 0) {
      if (typeof this.dataAccess.getClientWrapJsonWebKey !== 'function') {
        const error = new TypeError('Missing implementation of required method "DataAccess.getClientWrapJsonWebKey".');

        this.logger.fatal(
          `[${this.constructor.name}] Missing implementation of required method "DataAccess.getClientWrapJsonWebKey"`,
          '942b0f49-6892-47fc-966c-1522afbd1d2d',
          null,
          error,
        );

        throw error;
      }

      if (typeof this.dataAccess.getUnwrapJsonWebKey !== 'function') {
        const error = new TypeError('Missing implementation of required method "DataAccess.getUnwrapJsonWebKey".');

        this.logger.fatal(
          `[${this.constructor.name}] Missing implementation of required method "DataAccess.getUnwrapJsonWebKey"`,
          'b82866ad-9981-47ae-a2fa-ebeb1a13b9bf',
          null,
          error,
        );

        throw error;
      }
    }
  }

  /**
   * Generates an ID Token to be used by the Client for authentication purposes.
   *
   * @param login Login containing the currently Authenticated User.
   * @param consent Consent granted by the Authenticated User.
   * @param options ID Token Generation Options.
   * @returns Generated ID Token.
   */
  // NOTE: this shouldn't throw because the client must register with support for all used algorithms
  public async generateIdToken(login: Login, consent: Consent, options: GenerateIdTokenOptions = {}): Promise<string> {
    this.logger.debug(`[${this.constructor.name}] Called generateIdToken()`, 'f8f8da4c-a20d-44ee-a97d-b7093f248a88', {
      login,
      consent,
      options,
    });

    const { client, scopes, user } = consent;

    const signKey = await this.dataAccess.getSignJsonWebKey!();
    const userinfo = await this.dataAccess.getUserinfo!(user, scopes);
    const claims = Object.assign(this.createIdTokenClaims(user, client, login, options), userinfo);

    const jwsHeader = removeNullishValues<JsonWebSignatureHeaderParameters>({
      alg: client.idTokenSignedResponseAlgorithm!,
      kid: signKey.parameters.kid!,
      typ: 'JWT',
    });

    const signedJwt = await jwt.signed.serialize(new IdTokenClaims(claims), jwsHeader, { jsonWebKey: signKey });

    if (client.idTokenEncryptedResponseKeyWrap === null) {
      this.logger.debug(
        `[${this.constructor.name}] Completed generateIdToken()`,
        '53ba02db-3809-4533-bf0a-fe531afa23f7',
        { login, consent, options, id_token: signedJwt },
      );

      return signedJwt;
    }

    const keyWrapKey = await this.dataAccess.getClientWrapJsonWebKey!(client);

    const jweHeader = removeNullishValues<JsonWebEncryptionHeaderParameters>({
      alg: client.idTokenEncryptedResponseKeyWrap,
      enc: client.idTokenEncryptedResponseContentEncryption!,
      cty: 'JWT',
      kid: keyWrapKey.parameters.kid!,
    });

    const encryptedJwt = await jwe.compact.serialize(Buffer.from(signedJwt, 'ascii'), jweHeader, {
      jsonWebKey: keyWrapKey,
    });

    this.logger.debug(
      `[${this.constructor.name}] Completed generateIdToken()`,
      '1c40d3b1-a7a6-4351-a331-00e85cf43041',
      { login, consent, options, id_token: encryptedJwt },
    );

    return encryptedJwt;
  }

  /**
   * Checks the provided ID Token and verifies that the currently Authenticated User matches the User
   * represented by the ID Token provided by the Client.
   *
   * @param idToken ID Token provided by the Client as a hint to the expected Authenticated User.
   * @param client Client of the Request.
   * @param login Login containing the currently Authenticated User.
   * @returns Whether or not the Authenticated User matches the User represented by the ID Token.
   */
  public async checkIdTokenHint(idToken: string, client: Client, login: Login): Promise<boolean> {
    this.logger.debug(`[${this.constructor.name}] Called checkIdTokenHint()`, '492bfa48-4c2e-473d-9e74-8ec6982195d8', {
      id_token: idToken,
      client_id: client.id,
      login_id: login.id,
    });

    let result: boolean;

    try {
      const signedIdToken = await this.decryptIdToken(idToken, client);

      const { header } = await jwt.signed.decode(signedIdToken, {
        ignoreExpired: true,
        validationOptions: {
          iss: { essential: true, value: this.settings.issuer.href },
          sub: {
            essential: true,
            value: this.getSubjectType(client).calculateSubjectIdentifier(login.user, client),
          },
          aud: { essential: true, values: [client.id, [client.id]] },
        },
      });

      const jsonWebKey = await this.dataAccess.findJsonWebKeyByKeyId!(header.parameters.kid!);

      if (!(jsonWebKey instanceof JsonWebKey)) {
        throw new InvalidJsonWebKeyError(`Could not find the JSON Web Key "${header.parameters.kid!}".`);
      }

      await jwt.signed.deserialize(signedIdToken, {
        jsonWebKey,
        expectedDigitalSignatureAlgorithms: this.settings.idTokenSignatureAlgorithms,
      });

      result = true;

      this.logger.debug(
        `[${this.constructor.name}] Completed checkIdTokenHint()`,
        '492bfa48-4c2e-473d-9e74-8ec6982195d8',
        { id_token: idToken, client_id: client.id, login_id: login.id, result },
      );
    } catch (error: unknown) {
      result = false;

      this.logger.debug(
        `[${this.constructor.name}] Completed checkIdTokenHint()`,
        '38262405-94c5-4c0b-88cc-b73ade6f3aed',
        { id_token: idToken, client_id: client.id, login_id: login.id, result, error },
      );
    }

    return result;
  }

  /**
   * Returns the Subject Type of the Client.
   *
   * @param client Client of the Request.
   * @returns Subject Type of the Client.
   */
  private getSubjectType(client: Client): SubjectType {
    this.logger.debug(`[${this.constructor.name}] Called getSubjectType()`, 'e3ae5bc6-2180-4683-9056-743a868aacab', {
      client_id: client.id,
    });

    const subjectType = this.subjectTypes.find((subjectType) => subjectType.name === client.subjectType)!;

    this.logger.debug(`[${this.constructor.name}] Completed getSubjectType()`, '9c9b27e8-e5fd-4255-8c62-b1b4996ca34e', {
      client_id: client.id,
      subject_type: subjectType.name,
    });

    return subjectType;
  }

  /**
   * Creates an ID Token Claims object based on the provided arguments.
   *
   * @param user Authenticated User.
   * @param client Client of the Request.
   * @param login Login containing the current Authentication.
   * @param options ID Token Generation Options.
   * @returns ID Token Claims.
   */
  private createIdTokenClaims(
    user: User,
    client: Client,
    login: Login,
    options: GenerateIdTokenOptions,
  ): IdTokenClaimsParameters {
    this.logger.debug(
      `[${this.constructor.name}] Called createIdTokenClaims()`,
      '31e113ec-eaf5-44fe-96d0-45010396afb7',
      { user_id: user.id, client_id: client.id, login_id: login.id, options },
    );

    const now = Math.ceil(Date.now() / 1000);

    const idTokenClaims: IdTokenClaimsParameters = {
      iss: this.settings.issuer.href,
      sub: this.getSubjectType(client).calculateSubjectIdentifier(user, client),
      aud: [client.id],
      exp: now + 86400,
      iat: now,
      azp: client.id,
    };

    if ('nonce' in options) {
      idTokenClaims.nonce = options.nonce;
    }

    if ('maxAge' in options) {
      idTokenClaims.auth_time = Math.ceil(login.createdAt.getTime() / 1000);
    }

    if (login.amr.length !== 0) {
      idTokenClaims.amr = login.amr;
    }

    if (isNonEmptyString(login.acr)) {
      idTokenClaims.acr = login.acr;
    }

    if ('accessToken' in options) {
      idTokenClaims.at_hash = this.getLeftHash(options.accessToken.id, client.idTokenSignedResponseAlgorithm!);
    }

    if ('authorizationCode' in options) {
      idTokenClaims.c_hash = this.getLeftHash(options.authorizationCode.id, client.idTokenSignedResponseAlgorithm!);
    }

    this.logger.debug(
      `[${this.constructor.name}] Completed createIdTokenClaims()`,
      'fe8adb9b-19ef-4603-b1b0-28b28c8d0f28',
      { user_id: user.id, client_id: client.id, login_id: login.id, options, id_token_claims: idTokenClaims },
    );

    return idTokenClaims;
  }

  /**
   * Creates a left hash of the provided Identifier.
   *
   * A left hash is created by hashing the provided Identifier with a SHA-2 algorithm based on the provided
   * JSON Web Signature Algorithm (i.e. the algorithm RS256 uses SHA-256), then Base64Url encoding the left-most
   * portion of the hash.
   *
   * @param token Identifier used to create the left hash.
   * @param alg JSON Web Signature Algorithm used to create the ID Token.
   * @returns Base64Url encoded left hash of the provided Identifier.
   */
  private getLeftHash(token: string, alg: DigitalSignatureAlgorithm): string {
    this.logger.debug(`[${this.constructor.name}] Called getLeftHash()`, '180356e0-2325-4956-9b76-57c5af4ec8df', {
      token,
      alg,
    });

    const hashAlgorithm = `sha${alg.substring(2)}`;
    const hash = createHash(hashAlgorithm).update(token, 'ascii').digest();
    const leftHash = hash.subarray(0, hash.length / 2).toString('base64url');

    this.logger.debug(`[${this.constructor.name}] Completed getLeftHash()`, '6c55f3c5-d02d-43fd-8c03-9894467e0568', {
      token,
      alg,
      left_hash: leftHash,
    });

    return leftHash;
  }

  /**
   * Decrypts the provided Nested ID Token.
   *
   * @param idToken Nested ID Token.
   * @param client Client of the Request.
   * @returns Decrypted ID Token.
   */
  private async decryptIdToken(idToken: string, client: Client): Promise<string> {
    this.logger.debug(`[${this.constructor.name}] Called decryptIdToken()`, '5456fa44-ba0d-4d12-a0b6-032ec1167fa4', {
      id_token: idToken,
      client_id: client.id,
    });

    if (idToken.split('.').length === 3) {
      this.logger.debug(
        `[${this.constructor.name}] Completed decryptIdToken()`,
        '31256083-3c6a-4f00-b6b3-ea16318ba5cb',
        { id_token: idToken, client_id: client.id, decrypted_id_token: idToken },
      );

      return idToken;
    }

    const jsonWebKey = await this.dataAccess.getUnwrapJsonWebKey!();

    const { plaintext } = await jwe.compact.deserialize(idToken, {
      expectedContentEncryptionAlgorithms: this.settings.idTokenContentEncryptionAlgorithms,
      expectedKeyManagementAlgorithms: this.settings.idTokenKeyWrapAlgorithms,
      jsonWebKey,
    });

    const decryptedIdToken = plaintext.toString('ascii');

    this.logger.debug(`[${this.constructor.name}] Completed decryptIdToken()`, '78721235-68b8-4bab-8562-65708dce3eb0', {
      id_token: idToken,
      client_id: client.id,
      decrypted_id_token: decryptedIdToken,
    });

    return decryptedIdToken;
  }
}
