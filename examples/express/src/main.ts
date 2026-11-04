import 'reflect-metadata';

import flash from 'connect-flash';
import { RedisStore } from 'connect-redis';
import { createIoredisAdapter } from 'connect-redis-ioredis';
import cookieParser from 'cookie-parser';
import express, { static as expressStatic, urlencoded } from 'express';
import session from 'express-session';
import fs from 'fs';
import https from 'https';
import { Valkey } from 'iovalkey';
import nunjucks from 'nunjucks';
import path from 'path';

import { getContainer } from '@guarani/di';

import { CONTAINER } from '../../../src/lib/constants';
import { DataAccess } from '../../../src/lib/data-access/data-access';
import { SQLiteDataAccess } from '../../../src/lib/data-access/sqlite/sqlite.data-access';
import { Settings } from '../../../src/lib/settings/settings';
import { router } from './app/routers/router';
import { getProviderRouter } from './get-provider-router';
import { usePassport } from './use-passport';

async function main(): Promise<void> {
  const app = express();

  const valkey = new Valkey(process.env['REDIS_URL']!);

  // @ts-expect-error
  const ioValkeyAdapter = createIoredisAdapter(valkey);

  const providerRouter = await getProviderRouter();

  const container = getContainer(CONTAINER);

  const settings = container.resolve(Settings);
  const dataAccess = container.resolve(DataAccess) as SQLiteDataAccess;

  await dataAccess.up();
  await dataAccess.seed();

  app.use(cookieParser(settings.secretKey));
  app.use(
    session({
      secret: settings.secretKey,
      name: 'guarani',
      resave: false,
      saveUninitialized: false,
      store: new RedisStore({ client: ioValkeyAdapter, prefix: 'guarani:' }),
    }),
  );

  app.use(flash());
  app.use('/static', expressStatic(path.join(__dirname, 'assets')));

  nunjucks.configure(path.join(__dirname, 'views'), { autoescape: true, express: app });
  app.set('view engine', 'njk');

  app.use(providerRouter);
  app.use(urlencoded({ extended: false }));

  usePassport(app);

  app.use(router);

  const httpsOptions: https.ServerOptions = {
    cert: fs.readFileSync(path.join(__dirname, '..', 'server.cert')),
    key: fs.readFileSync(path.join(__dirname, '..', 'server.key')),
  };

  const server = https.createServer(httpsOptions, app);

  server.listen(4000, '0.0.0.0', () => {
    console.log('Identity Provider running on https://localhost:4000');
  });
}

main();
