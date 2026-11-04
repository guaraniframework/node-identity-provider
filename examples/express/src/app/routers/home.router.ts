import { Router } from 'express';

import { HomeController } from '../controllers/home.controller';

const router: Router = Router();

router.route('/').get(async (req, res) => await HomeController.home(req, res));

export { router as homeRouter };
