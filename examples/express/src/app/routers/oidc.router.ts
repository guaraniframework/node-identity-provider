import { Router } from 'express';

import { CallbackController } from '../controllers/oidc/callback.controller';
import { ErrorController } from '../controllers/oidc/error.controller';

const router: Router = Router();

router.route('/callback').get(async (req, res) => await CallbackController.callback(req, res));
router.route('/error').get(async (req, res) => await ErrorController.error(req, res));

export { router as oidcRouter };
