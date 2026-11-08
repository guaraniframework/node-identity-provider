import { CookieAccessInfo } from 'cookiejar';
import http from 'http';
import qs from 'querystring';
import request, { Agent } from 'supertest';
import { URL } from 'url';

import { getContainer } from '@guarani/di';

import { CONTAINER } from '../../../src/lib/constants';
import { DataAccess } from '../../../src/lib/data-access/data-access';
import { SQLiteDataAccess } from '../../../src/lib/data-access/sqlite/sqlite.data-access';
import { Consent } from '../../../src/lib/entities/consent';
import { Login } from '../../../src/lib/entities/login';
import { Scope } from '../../../src/lib/entities/scope';
import { Session } from '../../../src/lib/entities/session';
import { NodeIdentityProvider } from '../../../src/lib/http/providers/node/node.identity-provider';
import { HttpResponseStatus } from '../../../src/lib/http/response/http-response-status.enum';
import { NoneAuthorizationRequest } from '../../../src/lib/requests/authorization/none/none.authorization-request';
import { NoneAuthorizationResponse } from '../../../src/lib/responses/authorization/none/none.authorization-response';
import { Settings } from '../../../src/lib/settings/settings';
import { createTestProvider } from '../../__fixtures__/create-test-provider';

describe('None Prompt None Flow', () => {
  let provider: NodeIdentityProvider;
  let server: http.Server;
  let agent: Agent;

  let dataAccess: SQLiteDataAccess;
  let settings: Settings;

  const container = getContainer(CONTAINER);

  let session: Session;
  let login: Login;
  let consent: Consent;
  let scopes: Scope[];

  const authorizationRequest: NoneAuthorizationRequest = {
    response_type: 'none',
    client_id: 'b1eeace9-2b0c-468e-a444-733befc3b35d',
    redirect_uri: 'https://client.example.com/oidc/callback',
    scope: 'foo bar baz qux',
    state: '0d45510f-5f1f-4652-be56-ca5641ffa9a9',
    prompt: 'none',
  };

  const authorizationRequestQuery = qs.stringify(authorizationRequest);

  beforeAll(async () => {
    provider = await createTestProvider();

    dataAccess = container.resolve(DataAccess) as SQLiteDataAccess;
    settings = container.resolve(Settings);

    server = http.createServer(provider.handle());
    agent = request.agent(server);

    const user = (await dataAccess.findUserById('16907c32-687b-493c-85ba-f41f2c9d4daa'))!;
    const client = (await dataAccess.findClientById('b1eeace9-2b0c-468e-a444-733befc3b35d'))!;
    scopes = await dataAccess.getScopesByName(authorizationRequest.scope.split(' '));

    session = await dataAccess.createSession();
    login = await dataAccess.createLogin(user, client, session, [], null);
    consent = await dataAccess.createConsent(scopes, client, user);
  });

  afterAll(async () => {
    await dataAccess.down();
    container.clear();
  });

  it('GET /oidc/authorization (Get Authorization Response)', async () => {
    const authorizationResponse = await agent
      .get(`/oidc/authorization?${authorizationRequestQuery}`)
      .set('Cookie', [`${settings.sessionCookie}=${session.id}`]);

    const authorizationResponseLocationUrl = new URL(authorizationResponse.headers['location']!);

    expect(authorizationResponse.status).toBe(HttpResponseStatus.SeeOther);
    expect(agent.jar.getCookie(settings.sessionCookie, CookieAccessInfo.All)?.value).toBeUndefined();

    const authorizationResponseData = qs.parse(authorizationResponseLocationUrl.search.substring(1));

    expect(authorizationResponseData).toStrictEqual<NoneAuthorizationResponse>(
      expect.objectContaining<NoneAuthorizationResponse>({
        state: '0d45510f-5f1f-4652-be56-ca5641ffa9a9',
      }),
    );

    session = (await dataAccess.findSessionById(session.id))!;

    expect(session).toBeInstanceOf(Session);

    expect(session.activeLogin).toBeInstanceOf(Login);
    expect(session.activeLogin!.id).toBe(login.id);

    expect(session.logins).toStrictEqual<Login[]>([session.activeLogin!]);

    expect(session.grant).toBeNull();

    await expect(dataAccess.findConsentByClientAndUser(consent.client, consent.user)).resolves.toStrictEqual<Consent>(
      expect.objectContaining<Consent>({ ...consent, scopes: expect.arrayContaining<Scope>(scopes) }),
    );
  });
});
