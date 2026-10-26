import { getContainer } from '@guarani/di';

import { CONTAINER } from '../../constants';
import { NoneAuthorizationContext } from '../../context/authorization/none/none.authorization-context';
import { Logger } from '../../loggers/logger';
import { ResponseModeName } from '../../response-modes/response-mode-name.type';
import { ResponseTypeName } from '../response-type-name.type';
import { NoneResponseType } from './none.response-type';

jest.mock('../../loggers/logger');

describe('None Response Type', () => {
  let responseType: NoneResponseType;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(NoneResponseType).toSelf().asSingleton();

    responseType = container.resolve(NoneResponseType);
  });

  afterEach(() => {
    container.clear();
  });

  describe('name', () => {
    it('should have "none" as its value.', () => {
      expect(responseType.name).toBe<ResponseTypeName>('none');
    });
  });

  describe('defaultResponseMode', () => {
    it('should have "query" as its value.', () => {
      expect(responseType.defaultResponseMode).toBe<ResponseModeName>('query');
    });
  });

  describe('handle()', () => {
    const context = {} as NoneAuthorizationContext;

    it('should return a None Authorization Response.', async () => {
      await expect(responseType.handle(context)).resolves.toBeEmptyObject();
    });
  });
});
