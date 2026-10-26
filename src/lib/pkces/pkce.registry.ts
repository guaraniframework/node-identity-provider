import { Constructor } from '@guarani/di';

import { PlainPKCE } from './plain/plain.pkce';
import { S256PKCE } from './S256/S256.pkce';
import { PKCE } from './pkce';
import { PKCEName } from './pkce-name.type';

/**
 * Proof Key for Code Exchange Registry.
 */
export const PKCE_REGISTRY: Record<PKCEName, Constructor<PKCE>> = {
  plain: PlainPKCE,
  S256: S256PKCE,
};
