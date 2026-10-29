import { Buffer } from 'buffer';

import { Constructor, getContainer } from '@guarani/di';

import { CONTAINER } from '../../../constants';
import { Display } from '../../../displays/display';
import { DisplayName } from '../../../displays/display-name.type';
import { PopupDisplay } from '../../../displays/popup/popup.display';
import { AuthorizationEndpoint } from '../../../endpoints/authorization/authorization.endpoint';
import { Endpoint } from '../../../endpoints/endpoint';
import { PKCE } from '../../../pkces/pkce';
import { PKCEName } from '../../../pkces/pkce-name.type';
import { S256PKCE } from '../../../pkces/S256/S256.pkce';
import { FormPostResponseMode } from '../../../response-modes/form-post/form-post.response-mode';
import { QueryResponseMode } from '../../../response-modes/query/query.response-mode';
import { ResponseMode } from '../../../response-modes/response-mode';
import { ResponseModeName } from '../../../response-modes/response-mode-name.type';
import { CodeResponseType } from '../../../response-types/code/code.response-type';
import { ResponseType } from '../../../response-types/response-type';
import { ResponseTypeName } from '../../../response-types/response-type-name.type';
import { AuthorizationValidator } from '../../../validators/authorization/authorization.validator';
import { CodeAuthorizationValidator } from '../../../validators/authorization/code/code.authorization.validator';
import { AuthorizationEndpointOptions } from './authorization-endpoint.options';

const invalidDisplays: any[] = [
  undefined,
  null,
  true,
  1,
  1.2,
  1n,
  'a',
  Symbol('a'),
  Buffer,
  Buffer.alloc(1),
  () => 1,
  {},
  [undefined],
  [null],
  [true],
  [1],
  [1.2],
  [1n],
  [Symbol('a')],
  [Buffer],
  [Buffer.alloc(1)],
  [() => 1],
  [{}],
  [[]],
  [''],
  ['a'],
];

const invalidPKCEs: any[] = [
  undefined,
  null,
  true,
  1,
  1.2,
  1n,
  'a',
  Symbol('a'),
  Buffer,
  Buffer.alloc(1),
  () => 1,
  {},
  [undefined],
  [null],
  [true],
  [1],
  [1.2],
  [1n],
  [Symbol('a')],
  [Buffer],
  [Buffer.alloc(1)],
  [() => 1],
  [{}],
  [[]],
  [''],
  ['a'],
];

const invalidResponseModes: any[] = [
  undefined,
  null,
  true,
  1,
  1.2,
  1n,
  'a',
  Symbol('a'),
  Buffer,
  Buffer.alloc(1),
  () => 1,
  {},
  [undefined],
  [null],
  [true],
  [1],
  [1.2],
  [1n],
  [Symbol('a')],
  [Buffer],
  [Buffer.alloc(1)],
  [() => 1],
  [{}],
  [[]],
  [''],
  ['a'],
];

const invalidResponseTypes: any[] = [
  undefined,
  null,
  true,
  1,
  1.2,
  1n,
  'a',
  Symbol('a'),
  Buffer,
  Buffer.alloc(1),
  () => 1,
  {},
  [undefined],
  [null],
  [true],
  [1],
  [1.2],
  [1n],
  [Symbol('a')],
  [Buffer],
  [Buffer.alloc(1)],
  [() => 1],
  [{}],
  [[]],
  [''],
  ['a'],
];

describe('Authorization Endpoint Options', () => {
  let options: AuthorizationEndpointOptions;
  const container = getContainer(CONTAINER);

  beforeEach(() => {
    options = new AuthorizationEndpointOptions(container);
  });

  afterEach(() => {
    container.clear();
  });

  describe('useDisplays()', () => {
    it.each(invalidDisplays)('should throw when the provided Displays is invalid.', (displays) => {
      expect(() => options.useDisplays(displays)).toThrowWithMessage(TypeError, 'The provided Displays is invalid.');
    });

    it('should register the default Displays in the Identity Provider Factory.', () => {
      expect(() => options.useDisplays([])).not.toThrow();

      expect(options['displays']).toStrictEqual<DisplayName[]>(['page']);
    });

    it('should register the provided Displays in the Identity Provider Factory.', () => {
      expect(() => options.useDisplays(['popup'])).not.toThrow();

      expect(options['displays']).toStrictEqual<DisplayName[]>(['popup']);
    });
  });

  describe('usePKCEs()', () => {
    it.each(invalidPKCEs)('should throw when the provided PKCEs is invalid.', (pkces) => {
      expect(() => options.usePKCEs(pkces)).toThrowWithMessage(TypeError, 'The provided PKCEs is invalid.');
    });

    it('should register the default PKCEs in the Identity Provider Factory.', () => {
      expect(() => options.usePKCEs([])).not.toThrow();

      expect(options['pkces']).toStrictEqual<PKCEName[]>(['S256']);
    });

    it('should register the provided PKCEs in the Identity Provider Factory.', () => {
      expect(() => options.usePKCEs(['plain'])).not.toThrow();

      expect(options['pkces']).toStrictEqual<PKCEName[]>(['plain']);
    });
  });

  describe('useResponseModes()', () => {
    it.each(invalidResponseModes)('should throw when the provided Response Modes is invalid.', (responseModes) => {
      expect(() => options.useResponseModes(responseModes)).toThrowWithMessage(
        TypeError,
        'The provided Response Modes is invalid.',
      );
    });

    it('should register the default Response Modes in the Identity Provider Factory.', () => {
      expect(() => options.useResponseModes([])).not.toThrow();

      expect(options['responseModes']).toStrictEqual<ResponseModeName[]>(['query']);
    });

    it('should register the provided Response Modes in the Identity Provider Factory.', () => {
      expect(() => options.useResponseModes(['form_post', 'fragment'])).not.toThrow();

      expect(options['responseModes']).toStrictEqual<ResponseModeName[]>(['form_post', 'fragment']);
    });
  });

  describe('useResponseTypes()', () => {
    it.each(invalidResponseTypes)('should throw when the provided Response Types is invalid.', (responseTypes) => {
      expect(() => options.useResponseTypes(responseTypes)).toThrowWithMessage(
        TypeError,
        'The provided Response Types is invalid.',
      );
    });

    it('should register the default Response Types in the Identity Provider Factory.', () => {
      expect(() => options.useResponseTypes([])).not.toThrow();

      expect(options['responseTypes']).toStrictEqual<ResponseTypeName[]>(['code']);
    });

    it('should register the provided Response Types in the Identity Provider Factory.', () => {
      expect(() => options.useResponseTypes(['token'])).not.toThrow();

      expect(options['responseTypes']).toStrictEqual<ResponseTypeName[]>(['token']);
    });
  });

  describe('build()', () => {
    it('should throw when not registering a required Response Type.', () => {
      options.useResponseTypes(['token']);

      expect(() => options.build()).toThrowWithMessage(TypeError, 'Missing required Response Type "code".');
    });

    it('should register the actors of the Authorization Endpoint in the Identity Provider Factory.', () => {
      options
        .useDisplays(['popup'])
        .usePKCEs(['S256'])
        .useResponseModes(['form_post', 'query'])
        .useResponseTypes(['code']);

      expect(() => options.build()).not.toThrow();

      expect(container.isRegistered(Endpoint)).toBeTrue();
      expect(container.isRegistered(Display)).toBeTrue();
      expect(container.isRegistered(PKCE)).toBeTrue();
      expect(container.isRegistered(ResponseMode)).toBeTrue();
      expect(container.isRegistered(ResponseType)).toBeTrue();
      expect(container.isRegistered(AuthorizationValidator)).toBeTrue();

      expect(container.get(Endpoint)).toBe(AuthorizationEndpoint);

      expect(
        container['registry'].getAll(Display).map((binding: any) => binding['provider']['useClass']),
      ).toStrictEqual<Constructor<Display>[]>(expect.arrayContaining([PopupDisplay]));

      expect(container['registry'].getAll(PKCE).map((binding: any) => binding['provider']['useClass'])).toStrictEqual<
        Constructor<PKCE>[]
      >(expect.arrayContaining([S256PKCE]));

      expect(
        container['registry'].getAll(ResponseMode).map((binding: any) => binding['provider']['useClass']),
      ).toStrictEqual<Constructor<ResponseMode>[]>([FormPostResponseMode, QueryResponseMode]);

      expect(
        container['registry'].getAll(ResponseType).map((binding: any) => binding['provider']['useClass']),
      ).toStrictEqual<Constructor<ResponseType>[]>([CodeResponseType]);

      expect(
        container['registry'].getAll(AuthorizationValidator).map((binding: any) => binding['provider']['useClass']),
      ).toStrictEqual<Constructor<AuthorizationValidator>[]>([CodeAuthorizationValidator]);
    });
  });
});
