import { getContainer } from '@guarani/di';

import { CONTAINER } from '../../constants';
import { DataAccess } from '../../data-access/data-access';
import { Client } from '../../entities/client';
import { Scope } from '../../entities/scope';
import { AccessDeniedError } from '../../errors/access-denied/access-denied.error';
import { InvalidScopeError } from '../../errors/invalid-scope/invalid-scope.error';
import { Logger } from '../../loggers/logger';
import { ScopeHandler } from './scope.handler';

jest.mock('../../loggers/logger');

const requestedSupportedScopes: string[][][] = [
  [[]],
  [['foo']],
  [['bar', 'baz']],
  [['foo', 'bar', 'baz']],
  [['foo', 'baz', 'bar']],
];

const requestedScopes: string[][][] = [[['foo']], [['foo', 'bar']]];

describe('Scope Handler', () => {
  let handler: ScopeHandler;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);
  const dataAccessMock = jest.mocked<DataAccess>(
    Object.assign<DataAccess, Partial<DataAccess>>(Reflect.construct(DataAccess, []), {
      getScopes: jest.fn(),
      getScopesByName: jest.fn(),
    }),
  );

  const supportedScopes: Scope[] = [
    Object.assign<Scope, Partial<Scope>>(new Scope(), { name: 'foo' }),
    Object.assign<Scope, Partial<Scope>>(new Scope(), { name: 'bar' }),
    Object.assign<Scope, Partial<Scope>>(new Scope(), { name: 'baz' }),
    Object.assign<Scope, Partial<Scope>>(new Scope(), { name: 'qux' }),
  ];

  const client: Client = Object.assign<Client, Partial<Client>>(new Client(), {
    id: 'client_id',
    scopes: [
      Object.assign<Scope, Partial<Scope>>(new Scope(), { name: 'foo' }),
      Object.assign<Scope, Partial<Scope>>(new Scope(), { name: 'bar' }),
    ],
  });

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(ScopeHandler).toSelf().asSingleton();

    handler = container.resolve(ScopeHandler);
  });

  afterEach(() => {
    container.clear();
    jest.resetAllMocks();
  });

  describe('checkRequestedScopes()', () => {
    it('should throw when requesting an unsupported Scope.', async () => {
      dataAccessMock.getScopes.mockResolvedValueOnce(supportedScopes);

      const error = new InvalidScopeError('Unsupported Scope "unknown".');

      await expect(handler.checkRequestedScopes(['foo', 'unknown', 'qux'])).rejects.toThrowWithMessage(
        InvalidScopeError,
        error.description,
      );

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ScopeHandler] Unsupported Scope "unknown"',
        '572f1f77-cf6d-463e-9c87-7a81bd69b851',
        { requested_scopes: ['foo', 'unknown', 'qux'] },
        error,
      );
    });

    it.each(requestedSupportedScopes)('should not throw when requesting supported Scopes.', async (scopes) => {
      dataAccessMock.getScopes.mockResolvedValueOnce(supportedScopes);
      await expect(handler.checkRequestedScopes(scopes)).resolves.not.toThrow();
    });
  });

  describe('getAllowedScopes()', () => {
    it('should return the default Scopes of the Client when a Scope is not requested.', async () => {
      const allowedScopes: Scope[] = [
        Object.assign<Scope, Partial<Scope>>(new Scope(), { name: 'foo' }),
        Object.assign<Scope, Partial<Scope>>(new Scope(), { name: 'bar' }),
      ];

      await expect(handler.getAllowedScopes(client, [])).resolves.toStrictEqual<Scope[]>(
        expect.arrayContaining(allowedScopes),
      );

      expect(loggerMock.debug).toHaveBeenLastCalledWith(
        '[ScopeHandler] Completed getAllowedScopes()',
        '0b453fad-5cfd-4003-aa6d-93bbd8a6f7f9',
        { client_id: client.id, requested_scopes: [], allowed_scopes: ['foo', 'bar'] },
      );
    });

    it("should throw when the Client requests a Scope it's not allowed to.", async () => {
      const error = new AccessDeniedError('The Client is not allowed to request the Scope "qux".');

      await expect(handler.getAllowedScopes(client, ['foo', 'qux'])).rejects.toThrowWithMessage(
        AccessDeniedError,
        error.description,
      );

      expect(loggerMock.error).toHaveBeenCalledExactlyOnceWith(
        '[ScopeHandler] The Client is not allowed to request the Scope "qux"',
        '345c0252-3622-460b-a940-9997c35fee38',
        { client_id: client.id, requested_scopes: ['foo', 'qux'] },
        error,
      );
    });

    it.each(requestedScopes)('should return the Scope requested by the Client.', async (scopes) => {
      const allowedScopes: Scope[] = scopes.map((scope) =>
        Object.assign<Scope, Partial<Scope>>(new Scope(), { name: scope }),
      );

      dataAccessMock.getScopesByName.mockResolvedValueOnce(
        supportedScopes.filter((scope) => scopes.includes(scope.name)),
      );

      await expect(handler.getAllowedScopes(client, scopes)).resolves.toStrictEqual<Scope[]>(
        expect.arrayContaining(allowedScopes),
      );

      expect(loggerMock.debug).toHaveBeenLastCalledWith(
        '[ScopeHandler] Completed getAllowedScopes()',
        '0ed273d8-04d3-40ac-b53b-5a8a00ba8034',
        { client_id: client.id, requested_scopes: scopes, allowed_scopes: scopes },
      );
    });
  });
});
