import { Router } from 'express';

import { authRouter } from './auth.router';
import { homeRouter } from './home.router';
import { oidcRouter } from './oidc.router';
import { profileRouter } from './profile.router';

const router: Router = Router();

router.use('/', homeRouter);
router.use('/auth', authRouter);
router.use('/oidc', oidcRouter);
router.use('/profile', profileRouter);

export { router };
