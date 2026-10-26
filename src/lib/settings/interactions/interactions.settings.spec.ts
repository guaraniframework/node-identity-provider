import { Buffer } from 'buffer';
import { URL } from 'url';

import { InteractionsSettings } from './interactions.settings';
import { InteractionsSettingsParameters } from './interactions.settings.parameters';

const invalidErrorUrls: any[] = [
  undefined,
  null,
  true,
  1,
  1.2,
  1n,
  Symbol('a'),
  Buffer,
  Buffer.alloc(1),
  () => {},
  {},
  [],
  '',
  'a',
];

const invalidRegistrationUrls: any[] = [
  undefined,
  null,
  true,
  1,
  1.2,
  1n,
  Symbol('a'),
  Buffer,
  Buffer.alloc(1),
  () => {},
  {},
  [],
  '',
  'a',
];

const invalidAccountSelectionUrls: any[] = [
  undefined,
  null,
  true,
  1,
  1.2,
  1n,
  Symbol('a'),
  Buffer,
  Buffer.alloc(1),
  () => {},
  {},
  [],
  '',
  'a',
];

const invalidLoginUrls: any[] = [
  undefined,
  null,
  true,
  1,
  1.2,
  1n,
  Symbol('a'),
  Buffer,
  Buffer.alloc(1),
  () => {},
  {},
  [],
  '',
  'a',
];

const invalidConsentUrls: any[] = [
  undefined,
  null,
  true,
  1,
  1.2,
  1n,
  Symbol('a'),
  Buffer,
  Buffer.alloc(1),
  () => {},
  {},
  [],
  '',
  'a',
];

describe('Interactions Settings', () => {
  describe('constructor', () => {
    let parameters: InteractionsSettingsParameters;

    beforeEach(() => {
      parameters = {
        errorUrl: 'https://provider.example.com/oidc/error',
        registrationUrl: 'https://provider.example.com/auth/registration',
        accountSelectionUrl: 'https://provider.example.com/auth/account-selection',
        loginUrl: 'https://provider.example.com/auth/login',
        consentUrl: 'https://provider.example.com/auth/consent',
      };
    });

    it.each(invalidErrorUrls)('should throw when the provided Error Page URL is invalid.', (errorUrl) => {
      expect(() => new InteractionsSettings({ ...parameters, errorUrl })).toThrowWithMessage(
        TypeError,
        'The provided Error Page URL is invalid.',
      );
    });

    it.each(invalidRegistrationUrls)(
      'should throw when the provided Registration Page URL is invalid.',
      (registrationUrl) => {
        expect(() => new InteractionsSettings({ ...parameters, registrationUrl })).toThrowWithMessage(
          TypeError,
          'The provided Registration Page URL is invalid.',
        );
      },
    );

    it.each(invalidAccountSelectionUrls)(
      'should throw when the provided Account Selection Page URL is invalid.',
      (accountSelectionUrl) => {
        expect(() => new InteractionsSettings({ ...parameters, accountSelectionUrl })).toThrowWithMessage(
          TypeError,
          'The provided Account Selection Page URL is invalid.',
        );
      },
    );

    it.each(invalidLoginUrls)('should throw when the provided Login Page URL is invalid.', (loginUrl) => {
      expect(() => new InteractionsSettings({ ...parameters, loginUrl })).toThrowWithMessage(
        TypeError,
        'The provided Login Page URL is invalid.',
      );
    });

    it.each(invalidConsentUrls)('should throw when the provided Consent Page URL is invalid.', (consentUrl) => {
      expect(() => new InteractionsSettings({ ...parameters, consentUrl })).toThrowWithMessage(
        TypeError,
        'The provided Consent Page URL is invalid.',
      );
    });

    it('should instantiate a new Interactions Settings.', () => {
      let interactionsSettings!: InteractionsSettings;

      expect(() => {
        interactionsSettings = new InteractionsSettings({
          errorUrl: 'https://provider.example.com/oidc/error',
          registrationUrl: 'https://provider.example.com/auth/registration',
          accountSelectionUrl: 'https://provider.example.com/auth/account-selection',
          loginUrl: 'https://provider.example.com/auth/login',
          consentUrl: 'https://provider.example.com/auth/consent',
        });
      }).not.toThrow();

      expect(interactionsSettings).toBeInstanceOf(InteractionsSettings);

      expect(interactionsSettings).toStrictEqual<Partial<InteractionsSettings>>(
        expect.objectContaining<Partial<InteractionsSettings>>({
          errorUrl: new URL('https://provider.example.com/oidc/error'),
          registrationUrl: new URL('https://provider.example.com/auth/registration'),
          accountSelectionUrl: new URL('https://provider.example.com/auth/account-selection'),
          loginUrl: new URL('https://provider.example.com/auth/login'),
          consentUrl: new URL('https://provider.example.com/auth/consent'),
        }),
      );
    });
  });
});
