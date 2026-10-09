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
    jest.resetAllMocks();
  });

  describe('render()', () => {
    it('should render the Error View.', async () => {
      await expect(
        templateEngine.render('error', { error: 'custom_error', error_description: '"Custom Error Description."' }),
      ).resolves.toEqual(renderedErrorView);
    });
  });
});

const renderedErrorView = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>Authorization Error - Identity Provider</title>

    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/bootstrap/5.3.8/css/bootstrap.min.css" integrity="sha512-2bBQCjcnw658Lho4nlXJcc6WkV/UxpE/sAokbXPxQNGqmNdQrWqtw26Ns9kFF/yG792pKR1Sx8/Y1Lf1XN4GKA==" crossorigin="anonymous" referrerpolicy="no-referrer">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.13.2/font/bootstrap-icons.min.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/7.3.1/css/all.min.css" integrity="sha512-QeR2VH+lsBE5LSAe1Q5EnTBbe7XTBubt8dG93Y7gidSgdMCr8nVqKcfKAMyN96SV8KDbZVTDXChatu5G2KQGzg==" crossorigin="anonymous" referrerpolicy="no-referrer">
    <style>
      .link-widget,
      .link-widget:active,
      .link-widget:focus,
      .link-widget:hover {
        text-decoration: none;
        color: #fd940a;
      }

      .input-group-widget {
        height: 3rem;
        border-bottom: 1px solid #ffaa00;
      }

      .input-text-widget,
      .input-text-widget:active,
      .input-text-widget:focus {
        border: none;
        border-radius: 0;
        box-shadow: none;
        font-size: 14px;
      }

      .input-select-widget,
      .input-select-widget:active,
      .input-select-widget:focus,
      .input-select-widget:hover {
        border: none;
        box-shadow: none;
        font-size: 14px;
      }

      .btn-widget,
      .btn-widget:active,
      .btn-widget:focus,
      .btn-widget:hover {
        background-color: #fd940a;
        color: white;
        box-shadow: 0px 0px 5px 1px rgba(0, 0, 0, 25%);
      }
    </style>

    .error-widget {
      max-width: 30rem;
      min-height: 60vh;
      background-color: white;
      font-size: 14px;
      border-radius: 0.5rem;
      box-shadow: 0px 0px 10px 1px rgba(0, 0, 0, 25%);
    }
  </head>

  <body>
    <div class="container-fluid d-flex justify-content-center align-items-center min-vh-100">
      <div class="error-widget">
        <div class="d-flex flex-column justify-content-center align-items-center mt-4">
          <h4>Authorization Error</h4>
        </div>

        <div class="container-fluid px-5 mt-5">
          <div class="row">
            <div class="col-12 mt-3">
              <strong>Error Code:</strong>
              <span>custom_error</span>
            </div>
          </div>

          <div class="row">
            <div class="col-12 mt-3">
              <strong>Error Description:</strong>
              <span>&quot;Custom Error Description.&quot;</span>
            </div>
          </div>

          <div class="text-start my-5">
            <a href="/" class="link link-widget">
              <strong>Back to Home Page</strong>
            </a>
          </div>
        </div>
      </div>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/4.0.0/jquery.min.js" integrity="sha512-8LENNbXmzI/Gbj+OwXmqR6V4QaUAw0/porPzy1+dQoJqC0JPHedWoe0DDOTL2uHA5XXJyIsPtiMHH86pVlay6A==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js" integrity="sha384-FKyoEForCGlyvwx9Hj09JcYn3nv7wiPVlz7YYwJrWVcXK/BmnVDxM+D2scQbITxI" crossorigin="anonymous"></script>
    ${''}
  </body>
</html>
`.trim();
