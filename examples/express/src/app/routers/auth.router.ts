import { Router } from 'express';
import passport from 'passport';

import { AccountSelectionController } from '../controllers/auth/account-selection.controller';
import { ConsentController } from '../controllers/auth/consent.controller';
import { LoginController } from '../controllers/auth/login.controller';
import { RegistrationController } from '../controllers/auth/registration.controller';
import { authenticated } from '../guards/authenticated.guard';

const router: Router = Router();

router
  .route('/registration')
  .get(async (req, res) => await RegistrationController.get(req, res))
  .post(async (req, res) => await RegistrationController.post(req, res));

router
  .route('/account-selection')
  .get(authenticated, async (req, res) => await AccountSelectionController.get(req, res))
  .post(authenticated, async (req, res) => await AccountSelectionController.post(req, res));

router
  .route('/login')
  .get(async (req, res) => await LoginController.get(req, res))
  .post(
    passport.authenticate('local', { failureRedirect: '/auth/login', failureFlash: true }),
    async (req, res) => await LoginController.post(req, res),
  );

router
  .route('/consent')
  .get(authenticated, async (req, res) => await ConsentController.get(req, res))
  .post(authenticated, async (req, res) => await ConsentController.post(req, res));

export { router as authRouter };
