import { CookieAccessInfo } from 'cookiejar';
import http, { OutgoingHttpHeaders } from 'http';
import qs from 'querystring';
import request, { Agent } from 'supertest';
import { URL } from 'url';

import { getContainer } from '@guarani/di';

import { CONTAINER } from '../../../src/lib/constants';
import { DataAccess } from '../../../src/lib/data-access/data-access';
import { SQLiteDataAccess } from '../../../src/lib/data-access/sqlite/sqlite.data-access';
import { Consent } from '../../../src/lib/entities/consent';
import { Grant } from '../../../src/lib/entities/grant';
import { Login } from '../../../src/lib/entities/login';
import { Scope } from '../../../src/lib/entities/scope';
import { Session } from '../../../src/lib/entities/session';
import { User } from '../../../src/lib/entities/user';
import { UserAddress } from '../../../src/lib/entities/user-address';
import { NodeIdentityProvider } from '../../../src/lib/http/providers/node/node.identity-provider';
import { HttpResponseStatus } from '../../../src/lib/http/response/http-response-status.enum';
import { InteractionTypeName } from '../../../src/lib/interaction-types/interaction-type-name.type';
import { TokenAuthorizationRequest } from '../../../src/lib/requests/authorization/token/token.authorization-request';
import { ConsentContextInteractionRequest } from '../../../src/lib/requests/interaction/context/consent/consent.context-interaction-request';
import { CreateContextInteractionRequest } from '../../../src/lib/requests/interaction/context/create/create.context-interaction-request';
import { ConsentAcceptDecisionInteractionRequest } from '../../../src/lib/requests/interaction/decision/consent/consent-accept.decision-interaction-request';
import { CreateDecisionInteractionRequest } from '../../../src/lib/requests/interaction/decision/create/create.decision-interaction-request';
import { TokenAuthorizationResponse } from '../../../src/lib/responses/authorization/token/token.authorization-response';
import { ConsentContextInteractionResponse } from '../../../src/lib/responses/interaction/context/consent/consent.context-interaction-response';
import { CreateContextInteractionResponse } from '../../../src/lib/responses/interaction/context/create/create.context-interaction-response';
import { ConsentDecisionInteractionResponse } from '../../../src/lib/responses/interaction/decision/consent/consent.decision-interaction-response';
import { CreateDecisionInteractionResponse } from '../../../src/lib/responses/interaction/decision/create/create.decision-interaction-response';
import { Settings } from '../../../src/lib/settings/settings';
import { addParametersToUrl } from '../../../src/lib/utils/add-parameters-to-url/add-parameters-to-url';
import { createTestProvider } from '../../__fixtures__/create-test-provider';

describe('Create Prompt Token Implicit Flow', () => {
  let provider: NodeIdentityProvider;
  let server: http.Server;
  let agent: Agent;

  let dataAccess: SQLiteDataAccess;
  let settings: Settings;

  const container = getContainer(CONTAINER);

  let authorizationRequestUrl: URL;

  let sessionId: string;
  let loginChallenge: string;
  let consentChallenge: string;

  let session: Session;
  let grant: Grant;
  let login: Login;
  let consent: Consent;

  const authorizationRequest: TokenAuthorizationRequest = {
    response_type: 'token',
    client_id: 'b1eeace9-2b0c-468e-a444-733befc3b35d',
    redirect_uri: 'https://client.example.com/oidc/callback',
    scope: 'foo bar baz qux',
    state: '0d45510f-5f1f-4652-be56-ca5641ffa9a9',
    prompt: 'create',
  };

  const authorizationRequestQuery = qs.stringify(authorizationRequest);

  beforeAll(async () => {
    provider = await createTestProvider();

    dataAccess = container.resolve(DataAccess) as SQLiteDataAccess;
    settings = container.resolve(Settings);

    server = http.createServer(provider.handle());
    agent = request.agent(server);
  });

  beforeEach(() => {
    authorizationRequestUrl = addParametersToUrl(
      new URL('/oidc/authorization', settings.issuer!),
      authorizationRequest,
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await dataAccess.down();
    container.clear();
  });

  it('GET /oidc/authorization (Create Session)', async () => {
    const authorizationResponse = await agent.get(`/oidc/authorization?${authorizationRequestQuery}`);
    const authorizationResponseLocationUrl = new URL(authorizationResponse.headers['location']!);

    expect(authorizationResponse.status).toBe(HttpResponseStatus.SeeOther);
    expect(authorizationResponseLocationUrl.href).toBe(authorizationRequestUrl.href);

    sessionId = agent.jar.getCookie(settings.sessionCookie, CookieAccessInfo.All)?.value!;
    expect(sessionId).toBeString();

    session = (await dataAccess.findSessionById(sessionId))!;

    expect(session).toBeInstanceOf(Session);

    expect(session.activeLogin).toBeNull();
    expect(session.logins).toBeEmpty();
    expect(session.grant).toBeNull();
  });

  it('GET /oidc/authorization (Redirect to Create Page)', async () => {
    const authorizationResponse = await agent.get(`/oidc/authorization?${authorizationRequestQuery}`);
    const authorizationResponseLocationUrl = new URL(authorizationResponse.headers['location']!);

    expect(authorizationResponse.status).toBe(HttpResponseStatus.SeeOther);
    expect(agent.jar.getCookie(settings.sessionCookie, CookieAccessInfo.All)?.value).toBe(sessionId);

    loginChallenge = authorizationResponseLocationUrl.searchParams.get('login_challenge')!;
    expect(loginChallenge).toBeString();

    session = (await dataAccess.findSessionById(sessionId))!;

    expect(session).toBeInstanceOf(Session);

    expect(session.activeLogin).toBeNull();
    expect(session.logins).toBeEmpty();

    expect(session.grant).toBeInstanceOf(Grant);
    expect(session.grant!.loginChallenge).toBe(loginChallenge);
    expect(session.grant!.interactions).toBeEmpty();

    grant = session.grant!;
  });

  it('GET /oidc/interaction (Get Create Interaction Type Context)', async () => {
    const interactionRequest: CreateContextInteractionRequest = {
      interaction_type: 'create',
      client_id: 'b1eeace9-2b0c-468e-a444-733befc3b35d',
      login_challenge: loginChallenge,
    };

    const interactionRequestQuery = qs.stringify(interactionRequest);
    const interactionResponse = await agent.get(`/oidc/interaction?${interactionRequestQuery}`);

    expect(interactionResponse.status).toBe(HttpResponseStatus.OK);
    expect(interactionResponse.body).toStrictEqual<CreateContextInteractionResponse>({
      skip: false,
      request_url: authorizationRequestUrl.href,
      context: { prompts: ['create'] },
    });

    session = (await dataAccess.findSessionById(sessionId))!;

    expect(session).toBeInstanceOf(Session);

    expect(session.activeLogin).toBeNull();
    expect(session.logins).toBeEmpty();

    expect(session.grant).toBeInstanceOf(Grant);
    expect(session.grant!.id).toBe(grant.id);
    expect(session.grant!.interactions).toBeEmpty();
  });

  it('POST /oidc/interaction (Create Decision)', async () => {
    const interactionRequest: CreateDecisionInteractionRequest = {
      interaction_type: 'create',
      login_challenge: loginChallenge,
      password: 'secretpassword',
      given_name: 'Antonio',
      family_name: 'Nunes',
      email: 'antonio.nunes@email.com',
      birthdate: '1992-05-17',
      phone_number: '+55 (11) 97531-8462',
      street_address: 'Rua do Catete, 153 - Catete',
    };

    const interactionRequestBody = qs.stringify(interactionRequest);

    const interactionResponse = await agent
      .post('/oidc/interaction')
      .auth('b1eeace9-2b0c-468e-a444-733befc3b35d', 'z9IyV0Pd6_-0XRJP5DN-UvFYeP56sbNX', { type: 'basic' })
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('Accept', 'application/json')
      .send(interactionRequestBody);

    expect(interactionResponse.status).toBe(HttpResponseStatus.OK);

    expect(interactionResponse.headers).toMatchObject<OutgoingHttpHeaders>({
      'cache-control': 'no-store',
      pragma: 'no-cache',
    });

    expect(interactionResponse.body).toStrictEqual<CreateDecisionInteractionResponse>({
      redirect_to: authorizationRequestUrl.href,
    });

    session = (await dataAccess.findSessionById(sessionId))!;

    expect(session).toBeInstanceOf(Session);

    expect(session.activeLogin).toBeInstanceOf(Login);
    expect(session.logins).toStrictEqual<Login[]>([session.activeLogin!]);

    expect(session.grant).toBeInstanceOf(Grant);
    expect(session.grant!.id).toBe(grant.id);
    expect(session.grant!.interactions).toStrictEqual<InteractionTypeName[]>(['create']);

    login = session.activeLogin!;

    expect(login.user).toStrictEqual<User>(
      expect.objectContaining<Partial<User>>({
        givenName: 'Antonio',
        familyName: 'Nunes',
        email: 'antonio.nunes@email.com',
        birthdate: '1992-05-17',
        phoneNumber: '+55 (11) 97531-8462',
        address: expect.objectContaining<Partial<UserAddress>>({ streetAddress: 'Rua do Catete, 153 - Catete' }),
      }),
    );
  });

  it('GET /oidc/authorization (Redirect to Consent Page)', async () => {
    const authorizationResponse = await agent.get(`/oidc/authorization?${authorizationRequestQuery}`);
    const authorizationResponseLocationUrl = new URL(authorizationResponse.headers['location']!);

    expect(authorizationResponse.status).toBe(HttpResponseStatus.SeeOther);
    expect(agent.jar.getCookie(settings.sessionCookie, CookieAccessInfo.All)?.value).toBe(sessionId);

    consentChallenge = authorizationResponseLocationUrl.searchParams.get('consent_challenge')!;
    expect(consentChallenge).toBeString();

    session = (await dataAccess.findSessionById(sessionId))!;

    expect(session).toBeInstanceOf(Session);

    expect(session.activeLogin).toBeInstanceOf(Login);
    expect(session.activeLogin!.id).toBe(login.id);

    expect(session.logins).toStrictEqual<Login[]>([session.activeLogin!]);

    expect(session.grant).toBeInstanceOf(Grant);
    expect(session.grant!.id).toBe(grant.id);
    expect(session.grant!.consentChallenge).toBe(consentChallenge);
    expect(session.grant!.interactions).toStrictEqual<InteractionTypeName[]>(['create']);
  });

  it('GET /oidc/interaction (Get Consent Interaction Type Context)', async () => {
    const interactionRequest: ConsentContextInteractionRequest = {
      interaction_type: 'consent',
      client_id: 'b1eeace9-2b0c-468e-a444-733befc3b35d',
      consent_challenge: consentChallenge,
    };

    const interactionRequestQuery = qs.stringify(interactionRequest);
    const interactionResponse = await agent.get(`/oidc/interaction?${interactionRequestQuery}`);

    expect(interactionResponse.status).toBe(HttpResponseStatus.OK);
    expect(interactionResponse.body).toStrictEqual<ConsentContextInteractionResponse>({
      skip: false,
      request_url: authorizationRequestUrl.href,
      requested_scopes: ['foo', 'bar', 'baz', 'qux'],
      subject_id: expect.toBeString(),
      context: { prompts: ['create'] },
    });

    session = (await dataAccess.findSessionById(sessionId))!;

    expect(session).toBeInstanceOf(Session);

    expect(session.activeLogin).toBeInstanceOf(Login);
    expect(session.activeLogin!.id).toBe(login.id);

    expect(session.logins).toStrictEqual<Login[]>([session.activeLogin!]);

    expect(session.grant).toBeInstanceOf(Grant);
    expect(session.grant!.id).toBe(grant.id);
    expect(session.grant!.consentChallenge).toBe(consentChallenge);
    expect(session.grant!.interactions).toStrictEqual<InteractionTypeName[]>(['create']);
  });

  it('POST /oidc/interaction (Consent Accept Decision)', async () => {
    const interactionRequest: ConsentAcceptDecisionInteractionRequest = {
      interaction_type: 'consent',
      consent_challenge: consentChallenge,
      decision: 'accept',
      granted_scope: 'foo bar baz qux',
    };

    const interactionRequestBody = qs.stringify(interactionRequest);
    const interactionResponse = await agent
      .post('/oidc/interaction')
      .auth('b1eeace9-2b0c-468e-a444-733befc3b35d', 'z9IyV0Pd6_-0XRJP5DN-UvFYeP56sbNX', { type: 'basic' })
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .set('Accept', 'application/json')
      .send(interactionRequestBody);

    expect(interactionResponse.status).toBe(HttpResponseStatus.OK);

    expect(interactionResponse.headers).toMatchObject<OutgoingHttpHeaders>({
      'cache-control': 'no-store',
      pragma: 'no-cache',
    });

    expect(interactionResponse.body).toStrictEqual<ConsentDecisionInteractionResponse>({
      redirect_to: authorizationRequestUrl.href,
    });

    session = (await dataAccess.findSessionById(sessionId))!;

    expect(session).toBeInstanceOf(Session);

    expect(session.activeLogin).toBeInstanceOf(Login);
    expect(session.activeLogin!.id).toBe(login.id);

    expect(session.logins).toStrictEqual<Login[]>([session.activeLogin!]);

    expect(session.grant).toBeInstanceOf(Grant);
    expect(session.grant!.id).toBe(grant.id);
    expect(session.grant!.interactions).toStrictEqual<InteractionTypeName[]>(['create', 'consent']);
    expect(session.grant!.consent).toBeInstanceOf(Consent);

    consent = session.grant!.consent!;
  });

  it('GET /oidc/authorization (Get Authorization Response)', async () => {
    const authorizationResponse = await agent.get(`/oidc/authorization?${authorizationRequestQuery}`);
    const authorizationResponseLocationUrl = new URL(authorizationResponse.headers['location']!);

    expect(authorizationResponse.status).toBe(HttpResponseStatus.SeeOther);
    expect(agent.jar.getCookie(settings.sessionCookie, CookieAccessInfo.All)?.value).toBe(sessionId);

    const authorizationResponseData = qs.parse(authorizationResponseLocationUrl.hash.substring(1));

    expect(authorizationResponseData).toStrictEqual<TokenAuthorizationResponse>(
      expect.objectContaining<TokenAuthorizationResponse>({
        access_token: expect.toBeString(),
        token_type: 'Bearer',
        expires_in: expect.toBeString(),
        scope: 'baz bar foo qux',
        state: '0d45510f-5f1f-4652-be56-ca5641ffa9a9',
      }),
    );

    session = (await dataAccess.findSessionById(sessionId))!;

    expect(session).toBeInstanceOf(Session);

    expect(session.activeLogin).toBeInstanceOf(Login);
    expect(session.activeLogin!.id).toBe(login.id);

    expect(session.logins).toStrictEqual<Login[]>([session.activeLogin!]);

    expect(session.grant).toBeNull();

    await expect(dataAccess.findConsentByClientAndUser(consent.client, consent.user)).resolves.toStrictEqual<Consent>(
      expect.objectContaining<Consent>({ ...consent, scopes: expect.arrayContaining<Scope>(consent.scopes) }),
    );

    const accessToken = (await dataAccess.findAccessTokenById(authorizationResponseData['access_token'] as string))!;

    expect(accessToken.scopes).toStrictEqual<string[]>(expect.arrayContaining(consent.scopes));
    expect(accessToken.client!.id).toBe('b1eeace9-2b0c-468e-a444-733befc3b35d');
    expect(accessToken.user!.id).toBe(consent.user.id);
    expect(accessToken.login!.id).toBe(login.id);
    expect(accessToken.login!.clients.map((client) => client.id)).toStrictEqual<string[]>([accessToken.client!.id]);
    expect(accessToken.login!.user.id).toBe(accessToken.user!.id);
  });
});
