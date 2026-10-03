import { AccessToken } from '../../entities/access-token';
import { TokenResponse } from '../../responses/token/token-response';
import { createTokenResponse } from './create-token-response';

describe('createTokenResponse()', () => {
  it('should return a Token Response based on the data of the provided Access Token.', () => {
    expect(
      createTokenResponse(
        Object.assign<AccessToken, Partial<AccessToken>>(Reflect.construct(AccessToken, []), {
          id: 'access_token',
          scopes: ['foo', 'bar'],
          expiresAt: new Date(Date.now() + 3600000),
        }),
      ),
    ).toStrictEqual<TokenResponse>({
      access_token: 'access_token',
      token_type: 'Bearer',
      expires_in: 3600,
      scope: 'foo bar',
    });
  });
});
