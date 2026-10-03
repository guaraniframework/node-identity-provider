import { Buffer } from 'buffer';
import { timingSafeEqual } from 'crypto';

/**
 * Compares two sensitive strings by preventing timing attacks.
 *
 * @param string1 String to be compared.
 * @param string2 String to be compared.
 * @param encoding Optional Buffer Encoding
 * @default encoding "utf-8"
 * @returns Whether or not both strings are equal.
 */
export function secureStringCompare(
  string1: string,
  string2: string,
  encoding: NodeJS.BufferEncoding = 'utf8',
): boolean {
  return (
    string1.length === string2.length && timingSafeEqual(Buffer.from(string1, encoding), Buffer.from(string2, encoding))
  );
}
