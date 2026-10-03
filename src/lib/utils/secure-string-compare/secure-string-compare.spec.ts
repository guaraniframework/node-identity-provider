import crypto from 'crypto';

import { secureStringCompare } from './secure-string-compare';

describe('secureStringCompare()', () => {
  let timingSafeEqualSpy: jest.SpyInstance<
    boolean,
    [
      a: ArrayBufferLike | NodeJS.ArrayBufferView<ArrayBufferLike>,
      b: ArrayBufferLike | NodeJS.ArrayBufferView<ArrayBufferLike>,
    ],
    any
  >;

  beforeEach(() => {
    timingSafeEqualSpy = jest.spyOn(crypto, 'timingSafeEqual');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should return false if the strings have different length.', () => {
    expect(secureStringCompare('hello', 'goodbye')).toBeFalse();
    expect(timingSafeEqualSpy).not.toHaveBeenCalled();
  });

  it('should return false if the strings are different.', () => {
    expect(secureStringCompare('hello', 'olleh')).toBeFalse();

    expect(timingSafeEqualSpy).toHaveBeenCalledExactlyOnceWith(
      Buffer.from('hello', 'utf8'),
      Buffer.from('olleh', 'utf8'),
    );
  });

  it('should return true if the strings are equal.', () => {
    expect(secureStringCompare('hello', 'hello')).toBeTrue();

    expect(timingSafeEqualSpy).toHaveBeenCalledExactlyOnceWith(
      Buffer.from('hello', 'utf8'),
      Buffer.from('hello', 'utf8'),
    );
  });

  it('should return true if the strings are equal while passing a buffer encoding.', () => {
    expect(secureStringCompare('AQAB', 'AQAB', 'base64url')).toBeTrue();

    expect(timingSafeEqualSpy).toHaveBeenCalledExactlyOnceWith(
      Buffer.from('AQAB', 'base64url'),
      Buffer.from('AQAB', 'base64url'),
    );
  });
});
