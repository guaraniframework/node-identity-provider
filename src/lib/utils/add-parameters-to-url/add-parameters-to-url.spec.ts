import { URL } from 'url';

import { addParametersToUrl } from './add-parameters-to-url';

const plainUrls: any[] = [
  'https://client.example.com/oidc/callback',
  new URL('https://client.example.com/oidc/callback'),
];

const queryUrls: any[] = [
  'https://client.example.com/oidc/callback?tenant=tenant',
  new URL('https://client.example.com/oidc/callback?tenant=tenant'),
];

const hashUrls: any[] = [
  'https://client.example.com/oidc/callback#tenant=tenant',
  new URL('https://client.example.com/oidc/callback#tenant=tenant'),
];

describe('addParametersToUrl()', () => {
  const parameters: NodeJS.Dict<unknown> = {
    var1: 'string',
    var2: 123,
    var3: true,
    var4: null,
    var5: undefined,
  };

  it.each(plainUrls)('should add the Parameters to the Query of the URL by default.', (url) => {
    expect(addParametersToUrl(url, parameters).href).toEqual(
      'https://client.example.com/oidc/callback?var1=string&var2=123&var3=true',
    );
  });

  it.each(queryUrls)(
    'should add the Parameters to the Query of the URL by default while preserving previous Parameters.',
    (url) => {
      expect(addParametersToUrl(url, parameters).href).toEqual(
        'https://client.example.com/oidc/callback?tenant=tenant&var1=string&var2=123&var3=true',
      );
    },
  );

  it.each(plainUrls)('should add the Parameters to the Query of the URL.', (url) => {
    expect(addParametersToUrl(url, parameters, 'search').href).toEqual(
      'https://client.example.com/oidc/callback?var1=string&var2=123&var3=true',
    );
  });

  it.each(queryUrls)(
    'should add the Parameters to the Query of the URL while preserving previous Parameters.',
    (url) => {
      expect(addParametersToUrl(url, parameters, 'search').href).toEqual(
        'https://client.example.com/oidc/callback?tenant=tenant&var1=string&var2=123&var3=true',
      );
    },
  );

  it.each(plainUrls)('should add the Parameters to the Hash of the URL.', (url) => {
    expect(addParametersToUrl(url, parameters, 'hash').href).toEqual(
      'https://client.example.com/oidc/callback#var1=string&var2=123&var3=true',
    );
  });

  it.each(hashUrls)('should add the Parameters to the Hash of the URL while preserving previous Parameters.', (url) => {
    expect(addParametersToUrl(url, parameters, 'hash').href).toEqual(
      'https://client.example.com/oidc/callback#tenant=tenant&var1=string&var2=123&var3=true',
    );
  });
});
