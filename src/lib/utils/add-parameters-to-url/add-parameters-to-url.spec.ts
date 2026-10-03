import { URL } from 'url';

import { addParametersToUrl } from './add-parameters-to-url';

describe('addParametersToUrl()', () => {
  const parameters: NodeJS.Dict<unknown> = {
    var1: 'string',
    var2: 123,
    var3: true,
    var4: null,
    var5: undefined,
  };

  it('should add the Parameters to the Query of the URL by default.', () => {
    const url = new URL('https://client.example.com/oidc/callback');

    expect(addParametersToUrl(url, parameters).href).toEqual(
      'https://client.example.com/oidc/callback?var1=string&var2=123&var3=true',
    );
  });

  it('should add the Parameters to the Query of the URL by default while preserving previous Parameters.', () => {
    const url = new URL('https://client.example.com/oidc/callback?tenant=tenant');

    expect(addParametersToUrl(url, parameters).href).toEqual(
      'https://client.example.com/oidc/callback?tenant=tenant&var1=string&var2=123&var3=true',
    );
  });

  it('should add the Parameters to the Query of the URL.', () => {
    const url = new URL('https://client.example.com/oidc/callback');

    expect(addParametersToUrl(url, parameters, 'search').href).toEqual(
      'https://client.example.com/oidc/callback?var1=string&var2=123&var3=true',
    );
  });

  it('should add the Parameters to the Query of the URL while preserving previous Parameters.', () => {
    const url = new URL('https://client.example.com/oidc/callback?tenant=tenant');

    expect(addParametersToUrl(url, parameters, 'search').href).toEqual(
      'https://client.example.com/oidc/callback?tenant=tenant&var1=string&var2=123&var3=true',
    );
  });

  it('should add the Parameters to the Fragment of the URL.', () => {
    const url = new URL('https://client.example.com/oidc/callback');

    expect(addParametersToUrl(url, parameters, 'hash').href).toEqual(
      'https://client.example.com/oidc/callback#var1=string&var2=123&var3=true',
    );
  });

  it('should add the Parameters to the Fragment of the URL while preserving previous Parameters.', () => {
    const url = new URL('https://client.example.com/oidc/callback#tenant=tenant');

    expect(addParametersToUrl(url, parameters, 'hash').href).toEqual(
      'https://client.example.com/oidc/callback#tenant=tenant&var1=string&var2=123&var3=true',
    );
  });
});
