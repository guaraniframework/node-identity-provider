import { getContainer } from '@guarani/di';

import { Client } from '../../entities/client';
import { AccessDeniedError } from '../../errors/access-denied/access-denied.error';
import { InvalidScopeError } from '../../errors/invalid-scope/invalid-scope.error';
import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { Settings } from '../../settings/settings';
import { SETTINGS } from '../../settings/settings.token';
import { ScopeHandler } from './scope.handler';

jest.mock('../../logger/logger');

const requestedSupportedScopes: string[][][] = [
  [[]],
  [['foo']],
  [['bar', 'baz']],
  [['foo', 'bar', 'baz']],
  [['foo', 'baz', 'bar']],
];

const requestedScopes: string[][][] = [[['foo']], [['foo', 'bar']]];

describe('Scope Handler', () => {
  let scopeHandler: ScopeHandler;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);
  const settingsMock: Partial<Settings> = { scopes: new Set(['foo', 'bar', 'baz', 'qux']) };

  const client: Client = Object.assign<Client, Partial<Client>>(Reflect.construct(Client, []), {
    id: 'client_id',
    scopes: ['foo', 'bar'],
  });

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind<Partial<Settings>>(SETTINGS).toValue(settingsMock);
    container.bind(ScopeHandler).toSelf().asSingleton();

    scopeHandler = container.resolve(ScopeHandler);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('checkRequestedScope()', () => {
    it('should throw when requesting an unsupported Scope.', () => {
      const error = new InvalidScopeError('Unsupported Scope "unknown".');
      expect(() => scopeHandler.checkRequestedScope(['foo', 'unknown', 'qux'])).toThrow(error);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ScopeHandler] Unsupported Scope "unknown"',
        '572f1f77-cf6d-463e-9c87-7a81bd69b851',
        { requested_scopes: ['foo', 'unknown', 'qux'], scopes: ['foo', 'bar', 'baz', 'qux'] },
        error,
      );
    });

    it.each(requestedSupportedScopes)('should not throw when requesting supported Scopes.', (scopes) => {
      expect(() => scopeHandler.checkRequestedScope(scopes)).not.toThrow();

      expect(loggerMock.debug).toHaveBeenLastCalledWith(
        '[ScopeHandler] Completed checkRequestedScope()',
        '0d2df679-0ceb-446c-89ff-177824013697',
        { requested_scopes: scopes },
      );
    });
  });

  describe('getAllowedScopes()', () => {
    it('should return the default Scopes of the Client when a Scope is not requested.', () => {
      expect(scopeHandler.getAllowedScopes(client, [])).toStrictEqual(['foo', 'bar']);

      expect(loggerMock.debug).toHaveBeenLastCalledWith(
        '[ScopeHandler] Completed getAllowedScopes()',
        '0b453fad-5cfd-4003-aa6d-93bbd8a6f7f9',
        { client, requested_scopes: [], allowed_scopes: ['foo', 'bar'] },
      );
    });

    it("should throw when the Client requests a Scope it's not allowed to.", () => {
      const error = new AccessDeniedError('The Client is not allowed to request the Scope "qux".');
      expect(() => scopeHandler.getAllowedScopes(client, ['foo', 'qux'])).toThrow(error);

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ScopeHandler] The Client is not allowed to request the Scope "qux"',
        '345c0252-3622-460b-a940-9997c35fee38',
        { client, requested_scopes: ['foo', 'qux'], client_scopes: ['foo', 'bar'] },
        error,
      );
    });

    it.each(requestedScopes)('should return the Scope requested by the Client.', (scopes) => {
      expect(() => scopeHandler.getAllowedScopes(client, scopes)).not.toThrow();

      expect(loggerMock.debug).toHaveBeenLastCalledWith(
        '[ScopeHandler] Completed getAllowedScopes()',
        '0ed273d8-04d3-40ac-b53b-5a8a00ba8034',
        { client, requested_scopes: scopes, allowed_scopes: scopes },
      );
    });
  });
});
