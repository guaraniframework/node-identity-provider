import { Buffer } from 'buffer';
import { createHash } from 'crypto';

import { Inject, Injectable, InjectAll } from '@guarani/di';
import {
  DigitalSignatureAlgorithm,
  InvalidJsonWebKeyError,
  JsonWebEncryptionHeaderParameters,
  JsonWebKey,
  JsonWebSignatureHeaderParameters,
  jwe,
  jwt,
} from '@guarani/jose';
import { isNonEmptyString } from '@guarani/primitives';

import { IdTokenClaims } from '../../claims/id-token/id-token.claims';
import { IdTokenClaimsParameters } from '../../claims/id-token/id-token.claims.parameters';
import { DataAccess } from '../../data-access/data-access';
import { Client } from '../../entities/client';
import { Consent } from '../../entities/consent';
import { Login } from '../../entities/login';
import { User } from '../../entities/user';
import { Logger } from '../../logger/logger';
import { type Settings } from '../../settings/settings';
import { SETTINGS } from '../../settings/settings.token';
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
   * @param subjectTypes Subject Types registered at the Identity Provider.
   * @throws {TypeError} Missing required implementations.
   */
  public constructor(
    private readonly logger: Logger,
    private readonly dataAccess: DataAccess,
    @Inject(SETTINGS) private readonly settings: Settings,
    @InjectAll(SubjectType) private readonly subjectTypes: SubjectType[],
  ) {
    if (Array.isArray(this.settings.idTokenKeyWrapAlgorithms)) {
      if (typeof this.dataAccess.getClientWrapJsonWebKey !== 'function') {
        const error = new TypeError('Missing implementation of required method "DataAccess.getClientWrapJsonWebKey".');

        this.logger.critical(
          `[${this.constructor.name}] Missing implementation of required method "DataAccess.getClientWrapJsonWebKey"`,
          '942b0f49-6892-47fc-966c-1522afbd1d2d',
          null,
          error,
        );

        throw error;
      }

      if (typeof this.dataAccess.getUnwrapJsonWebKey !== 'function') {
        const error = new TypeError('Missing implementation of required method "DataAccess.getUnwrapJsonWebKey".');

        this.logger.critical(
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

    const now = Math.ceil(Date.now() / 1000);

    const { client, scopes, user } = consent;

    const signKey = await this.dataAccess.getSignJsonWebKey();
    const userinfo = await this.dataAccess.getUserinfo(user, scopes);
    const claims = Object.assign(this.createIdTokenClaims(user, client, login, now, options), userinfo);

    const jwsHeader: JsonWebSignatureHeaderParameters = {
      alg: client.idTokenSignedResponseAlgorithm,
      kid: signKey.parameters.kid as string,
      typ: 'JWT',
    };

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

    const jweHeader: JsonWebEncryptionHeaderParameters = {
      alg: client.idTokenEncryptedResponseKeyWrap,
      enc: client.idTokenEncryptedResponseContentEncryption!,
      cty: 'JWT',
      kid: keyWrapKey.parameters.kid as string,
    };

    const encryptedJwt = await jwe.compact.serialize(Buffer.from(signedJwt, 'ascii'), jweHeader, {
      jsonWebKey: keyWrapKey,
    });

    this.logger.debug(
      `[${this.constructor.name}] Generated Encrypted ID Token`,
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
      client,
      login,
    });

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

      const jsonWebKey = await this.dataAccess.findJsonWebKey(header.parameters.kid!);

      if (!(jsonWebKey instanceof JsonWebKey)) {
        throw new InvalidJsonWebKeyError(`Could not find the JSON Web Key "${header.parameters.kid!}".`);
      }

      await jwt.signed.deserialize(signedIdToken, {
        jsonWebKey,
        expectedDigitalSignatureAlgorithms: Array.from(this.settings.idTokenSignatureAlgorithms!),
      });

      this.logger.debug(
        `[${this.constructor.name}] Completed checkIdTokenHint()`,
        '492bfa48-4c2e-473d-9e74-8ec6982195d8',
        { id_token: idToken, client, login, result: true },
      );

      return true;
    } catch (error: unknown) {
      this.logger.debug(
        `[${this.constructor.name}] Completed checkIdTokenHint()`,
        '38262405-94c5-4c0b-88cc-b73ade6f3aed',
        { id_token: idToken, client, login, result: false, error },
      );

      return false;
    }
  }

  /**
   * Returns the Subject Type of the Client.
   *
   * @param client Client of the Request.
   * @returns Subject Type of the Client.
   */
  private getSubjectType(client: Client): SubjectType {
    return this.subjectTypes.find((subjectType) => subjectType.name === client.subjectType)!;
  }

  /**
   * Creates an ID Token Claims object based on the provided arguments.
   *
   * @param user Authenticated User.
   * @param client Client of the Request.
   * @param login Login containing the current Authentication.
   * @param now UNIX epoch value of the current moment,
   * @param options ID Token Generation Options.
   * @returns ID Token Claims.
   */
  private createIdTokenClaims(
    user: User,
    client: Client,
    login: Login,
    now: number,
    options: GenerateIdTokenOptions,
  ): IdTokenClaimsParameters {
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

    if (Array.isArray(login.amr)) {
      idTokenClaims.amr = login.amr;
    }

    if (isNonEmptyString(login.acr)) {
      idTokenClaims.acr = login.acr;
    }

    if ('accessToken' in options) {
      idTokenClaims.at_hash = this.getLeftHash(options.accessToken.id, client.idTokenSignedResponseAlgorithm);
    }

    if ('authorizationCode' in options) {
      idTokenClaims.c_hash = this.getLeftHash(options.authorizationCode.id, client.idTokenSignedResponseAlgorithm);
    }

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
    const hashAlgorithm = `sha${alg.substring(2)}`;
    const hash = createHash(hashAlgorithm).update(token, 'ascii').digest();
    const halfHash = hash.subarray(0, hash.length / 2);

    return halfHash.toString('base64url');
  }

  /**
   * Decrypts the provided Nested ID Token.
   *
   * @param idToken Nested ID Token.
   * @param client Client of the Request.
   * @returns Decrypted ID Token.
   */
  private async decryptIdToken(idToken: string, client: Client): Promise<string> {
    if (idToken.split('.').length === 3) {
      return idToken;
    }

    const jsonWebKey = await this.dataAccess.getUnwrapJsonWebKey!();

    const { plaintext } = await jwe.compact.deserialize(idToken, {
      expectedContentEncryptionAlgorithms: [client.idTokenEncryptedResponseContentEncryption!],
      expectedKeyManagementAlgorithms: [client.idTokenEncryptedResponseKeyWrap!],
      jsonWebKey,
    });

    return plaintext.toString('ascii');
  }
}
