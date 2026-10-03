import { Constructor } from '@guarani/di';

import { PlainPkce } from './plain/plain.pkce';
import { S256Pkce } from './S256/S256.pkce';
import { Pkce } from './pkce';
import { PkceName } from './pkce-name.type';

/**
 * Proof Key for Code Exchange Registry.
 */
export const pkceRegistry: Record<PkceName, Constructor<Pkce>> = {
  plain: PlainPkce,
  S256: S256Pkce,
};
