import express from 'express';

import config from '../config';
import { BAD_REQUEST } from '../constants/http-status';
import { emitter } from '../util/emitter.util';

const router = express.Router();

router.post('/', async (req, res) => {
  const { summary } = req.body;
  emitter.emit('summary.create', summary);
  res.send('OK');
});

router.get('/random', async (req, res) => {
  if (!config.ai().some((obj) => obj.ai === 'openai'))
    return res.status(BAD_REQUEST).send({ error: 'Open AI not configured' });

  const openai = (await import('../ai/openai')).default;
  const summary = await new openai().random({ context: req.query?.summary?.toString() });
  res.send(summary);
});

export default router;
