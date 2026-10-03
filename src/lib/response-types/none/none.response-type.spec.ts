import { getContainer } from '@guarani/di';

import { NoneAuthorizationContext } from '../../context/authorization/none/none.authorization-context';
import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/container.token';
import { ResponseModeName } from '../../response-modes/response-mode-name.type';
import { NoneAuthorizationResponse } from '../../responses/authorization/none/none.authorization-response';
import { ResponseTypeName } from '../response-type-name.type';
import { NoneResponseType } from './none.response-type';

jest.mock('../../logger/logger');

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
      expect(responseType.name).toEqual<ResponseTypeName>('none');
    });
  });

  describe('defaultResponseMode', () => {
    it('should have "query" as its value.', () => {
      expect(responseType.defaultResponseMode).toEqual<ResponseModeName>('query');
    });
  });

  describe('handle()', () => {
    it('should return a None Authorization Response.', async () => {
      const context = {} as NoneAuthorizationContext;
      await expect(responseType.handle(context)).resolves.toStrictEqual<NoneAuthorizationResponse>({});
    });
  });
});
