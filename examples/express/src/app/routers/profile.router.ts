import { Router } from 'express';

import { ProfileController } from '../controllers/profile.controller';
import { authenticated } from '../guards/authenticated.guard';

const router: Router = Router();

router.route('/').get(authenticated, async (req, res) => await ProfileController.index(req, res));

router
  .route('/edit')
  .get(authenticated, async (req, res) => await ProfileController.edit(req, res))
  .post(authenticated, async (req, res) => await ProfileController.editProfile(req, res));

export { router as profileRouter };
