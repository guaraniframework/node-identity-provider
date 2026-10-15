import path from 'path';

import { getContainer } from '@guarani/di';

import { Logger } from '../../logger/logger';
import { CONTAINER } from '../../metadata/tokens';
import { TemplateStringTemplateEngine } from './template-string.template-engine';

jest.mock('../../logger/logger');

describe('Template String Template Engine', () => {
  let templateEngine: TemplateStringTemplateEngine;
  const container = getContainer(CONTAINER);

  const loggerMock = jest.mocked(Logger.prototype);

  beforeEach(() => {
    container.bind(Logger).toValue(loggerMock);
    container.bind(TemplateStringTemplateEngine).toSelf().asSingleton();

    templateEngine = container.resolve(TemplateStringTemplateEngine);
  });

  afterEach(() => {
    container.clear();

    jest.resetModules();
    jest.resetAllMocks();
  });

  describe('constructor', () => {
    it('should warn about the usage of the Default Template String Template Engine.', () => {
      expect(loggerMock.warn).toHaveBeenCalledExactlyOnceWith(
        '[TemplateStringTemplateEngine] Using the default Template String Template Engine. This is only recommended for development environments.',
        '75ce8784-8965-423c-a6bd-3d7ceb02f62c',
        null,
      );
    });
  });

  describe('render()', () => {
    it('should return the requested Html View rendered with the provided data.', async () => {
      jest.doMock(path.join(__dirname, 'views', 'error.view'), () => ({
        default: jest.fn().mockImplementationOnce((data) => `<body>${data['foo']} - ${data['bar']}</body>`),
      }));

      await expect(templateEngine.render('error', { foo: 'foo', bar: 'bar' })).resolves.toEqual(
        '<body>foo - bar</body>',
      );
    });
  });
});
