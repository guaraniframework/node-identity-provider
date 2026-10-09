/* istanbul ignore file */
import { ErrorResponse } from '../../../responses/error/error-response';
import { sanitizeHtml } from '../../../utils/sanitize-html/sanitize-html';
import _baseView from './_base.view';

const customCss = `
    .error-widget {
      max-width: 30rem;
      min-height: 60vh;
      background-color: white;
      font-size: 14px;
      border-radius: 0.5rem;
      box-shadow: 0px 0px 10px 1px rgba(0, 0, 0, 25%);
    }
`.trim();

export default function errorView(data: ErrorResponse): string {
  const content = `
    <div class="container-fluid d-flex justify-content-center align-items-center min-vh-100">
      <div class="error-widget">
        <div class="d-flex flex-column justify-content-center align-items-center mt-4">
          <h4>Authorization Error</h4>
        </div>

        <div class="container-fluid px-5 mt-5">
          <div class="row">
            <div class="col-12 mt-3">
              <strong>Error Code:</strong>
              <span>${sanitizeHtml(data.error)}</span>
            </div>
          </div>

          <div class="row">
            <div class="col-12 mt-3">
              <strong>Error Description:</strong>
              <span>${sanitizeHtml(data.error_description)}</span>
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
  `.trim();

  return _baseView('Authorization Error', content, customCss, null);
}
