import express from 'express';

import { OK } from '../constants/http-status';
import state from '../util/state.util';

const router = express.Router();

router.get('/', async (req, res) => {
  res.send(state.get());
});

router.patch('/', async (req, res) => {
  state.patch(req.body);
  res.send(OK);
});

export default router;
