import { Express } from 'express';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';

import { getContainer } from '@guarani/di';

import { CONTAINER } from '../../../src/lib/constants';
import { DataAccess } from '../../../src/lib/data-access/data-access';
import { User } from '../../../src/lib/entities/user';

export function usePassport(app: Express): void {
  const container = getContainer(CONTAINER);

  const dataAccess = container.resolve(DataAccess);

  passport.use(
    new LocalStrategy({ usernameField: 'email', passwordField: 'password' }, async (email, password, done) => {
      const user = await dataAccess.findUserByResourceOwnerCredentials!(email, password);

      if (user === null) {
        return done(null, false, { message: 'Invalid Credentials' });
      }

      return done(null, user);
    }),
  );

  passport.serializeUser<string>((user, done) => {
    return done(null, (<User>user).id);
  });

  passport.deserializeUser(async (id: string, done) => {
    const user = await dataAccess.findUserById(id);
    return done(null, user ?? false);
  });

  app.use(passport.initialize());
  app.use(passport.session());
}
