import { ErrorResponse } from './error-response';
import { ErrorResponseParameters } from './error-response.parameters';

describe('Error Response', () => {
  describe('constructor', () => {
    it('should instantiate an Error Response without an "error_uri".', () => {
      expect(
        new ErrorResponse({ error: 'custom_error', error_description: 'Custom Error Description.' }),
      ).toMatchObject<ErrorResponseParameters>({
        error: 'custom_error',
        error_description: 'Custom Error Description.',
        error_uri: expect.toBeNil(),
      });
    });

    it('should instantiate an Error Response with an "error_uri".', () => {
      expect(
        new ErrorResponse({
          error: 'custom_error',
          error_description: 'Custom Error Description.',
          error_uri: 'https://provider.example.com/oidc/docs/errors/custom_error',
        }),
      ).toMatchObject<ErrorResponseParameters>({
        error: 'custom_error',
        error_description: 'Custom Error Description.',
        error_uri: 'https://provider.example.com/oidc/docs/errors/custom_error',
      });
    });
  });
});
