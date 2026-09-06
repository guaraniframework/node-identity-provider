import 'jest-extended';

import { createDefaultPreset } from 'ts-jest';

export const testEnvironment = 'node';

export default {
  ...createDefaultPreset({
    tsconfig: 'tsconfig.spec.json',
  }),
  setupFilesAfterEnv: ['reflect-metadata', 'jest-extended/all'],
  coverageDirectory: 'coverage',
  transform: {
    '\\.(ts|tsx)$': '<rootDir>/fix-istanbul-decorator.js',
  },
};
