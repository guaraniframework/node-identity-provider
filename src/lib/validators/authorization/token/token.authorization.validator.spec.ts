import { getContainer } from '@guarani/di';

import { CONTAINER } from '../../../constants';
import { DataAccess } from '../../../data-access/data-access';
import { Display } from '../../../displays/display';
import { ScopeHandler } from '../../../handlers/scope/scope.handler';
import { Logger } from '../../../loggers/logger';
import { ResponseMode } from '../../../response-modes/response-mode';
import { ResponseModeName } from '../../../response-modes/response-mode-name.type';
import { ResponseType } from '../../../response-types/response-type';
import { ResponseTypeName } from '../../../response-types/response-type-name.type';
import { Settings } from '../../../settings/settings';
import { AuthorizationValidator } from '../authorization.validator';
import { TokenAuthorizationValidator } from './token.authorization.validator';

jest.mock('../../../data-access/data-access');
jest.mock('../../../displays/display');
jest.mock('../../../handlers/scope/scope.handler');
jest.mock('../../../loggers/logger');
jest.mock('../../../response-modes/response-mode');
jest.mock('../../../response-types/response-type');

describe('Token Authorization Validator', () => {
  let validator: TokenAuthorizationValidator;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);
  const dataAccessMock = jest.mocked(DataAccess.prototype);
  const scopeHandlerMock = jest.mocked(ScopeHandler.prototype);
  const settingsMock = jest.mocked(Settings.prototype);
  const responseTypeMock = jest.mocked(ResponseType.prototype);
  const responseModeMock = jest.mocked(ResponseMode.prototype);
  const displayMock = jest.mocked(Display.prototype);

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind(ScopeHandler).toValue(scopeHandlerMock);
    container.bind(Settings).toValue(settingsMock);
    container.bind(ResponseType).toValue(responseTypeMock);
    container.bind(ResponseMode).toValue(responseModeMock);
    container.bind(Display).toValue(displayMock);
    container.bind(TokenAuthorizationValidator).toSelf().asSingleton();

    validator = container.resolve(TokenAuthorizationValidator);
  });

  afterEach(() => {
    container.clear();
  });

  describe('name', () => {
    it('should have "token" as its value.', () => {
      expect(validator.name).toBe<ResponseTypeName>('token');
    });
  });

  describe('forbiddenResponseModes', () => {
    it('should have ["query"] as its value.', () => {
      expect(validator['forbiddenResponseModes']).toStrictEqual<ResponseModeName[]>(['query']);
    });
  });

  describe('constructor', () => {
    it('should be an instance of the Authorization Validator.', () => {
      expect(Object.getPrototypeOf(TokenAuthorizationValidator)).toBe(AuthorizationValidator);
    });
  });
});
