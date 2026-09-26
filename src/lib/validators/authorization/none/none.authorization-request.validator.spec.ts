import { getContainer } from '@guarani/di';

import { DataAccess } from '../../../data-access/data-access';
import { Display } from '../../../displays/display';
import { ScopeHandler } from '../../../handlers/scope/scope.handler';
import { Logger } from '../../../logger/logger';
import { CONTAINER } from '../../../metadata/container.token';
import { ResponseMode } from '../../../response-modes/response-mode';
import { ResponseType } from '../../../response-types/response-type';
import { ResponseTypeName } from '../../../response-types/response-type-name.type';
import { Settings } from '../../../settings/settings';
import { SETTINGS } from '../../../settings/settings.token';
import { AuthorizationRequestValidator } from '../authorization-request.validator';
import { NoneAuthorizationRequestValidator } from './none.authorization-request.validator';

jest.mock('../../../data-access/data-access');
jest.mock('../../../displays/display');
jest.mock('../../../handlers/scope/scope.handler');
jest.mock('../../../logger/logger');
jest.mock('../../../response-modes/response-mode');
jest.mock('../../../response-types/response-type');

describe('None Authorization Request Validator', () => {
  let validator: NoneAuthorizationRequestValidator;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);
  const scopeHandlerMock = jest.mocked(ScopeHandler.prototype);
  const dataAccessMock = jest.mocked(DataAccess.prototype);

  const settings: Partial<Settings> = {};

  const responseTypeMocks = [jest.mocked(ResponseType.prototype)];
  const responseModeMocks = [jest.mocked(ResponseMode.prototype)];
  const displayMocks = [jest.mocked(Display.prototype)];

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(ScopeHandler).toValue(scopeHandlerMock);
    container.bind(DataAccess).toValue(dataAccessMock);
    container.bind<Partial<Settings>>(SETTINGS).toValue(settings);
    responseTypeMocks.forEach((responseTypeMock) => container.bind(ResponseType).toValue(responseTypeMock));
    responseModeMocks.forEach((responseModeMock) => container.bind(ResponseMode).toValue(responseModeMock));
    displayMocks.forEach((displayMock) => container.bind(Display).toValue(displayMock));
    container.bind(NoneAuthorizationRequestValidator).toSelf().asSingleton();

    validator = container.resolve(NoneAuthorizationRequestValidator);
  });

  afterEach(() => {
    container.clear();
  });

  describe('name', () => {
    it('should have "none" as its value.', () => {
      expect(validator.name).toEqual<ResponseTypeName>('none');
    });
  });

  describe('constructor', () => {
    it('should instantiate a new None Authorization Request Validator.', () => {
      expect(Object.getPrototypeOf(NoneAuthorizationRequestValidator)).toBe(AuthorizationRequestValidator);
      expect(() => container.resolve(NoneAuthorizationRequestValidator)).not.toThrow();
    });
  });
});
