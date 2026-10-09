/* istanbul ignore file */
import { sanitizeHtml } from '../../../utils/sanitize-html/sanitize-html';

export default function _baseView(
  title: string,
  content: string,
  customCss: string | null,
  customJs: string | null,
): string {
  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <title>${sanitizeHtml(title)} - Identity Provider</title>

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

    ${customCss ?? ''}
  </head>

  <body>
    ${content}

    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/4.0.0/jquery.min.js" integrity="sha512-8LENNbXmzI/Gbj+OwXmqR6V4QaUAw0/porPzy1+dQoJqC0JPHedWoe0DDOTL2uHA5XXJyIsPtiMHH86pVlay6A==" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.8/dist/js/bootstrap.bundle.min.js" integrity="sha384-FKyoEForCGlyvwx9Hj09JcYn3nv7wiPVlz7YYwJrWVcXK/BmnVDxM+D2scQbITxI" crossorigin="anonymous"></script>
    ${customJs ?? ''}
  </body>
</html>
  `.trim();
}
