import express from 'express';

import { NOT_FOUND } from '../constants/http-status';
import transcript from '../controllers/transcript.controller';
import summary from '../controllers/summary.controller';
import gallery from '../controllers/gallery.controller';
import image from '../controllers/image.controller';
import audio from '../controllers/audio.controller';
import storage from '../controllers/storage.controller';
import state from '../controllers/state.controller';
import logs from '../controllers/logs.controller';
import config from '../controllers/config.controller';
import prisma from '../util/prisma.util';

const router = express.Router();

router.use('/*', (req, res, next) => {
  req.prisma = prisma;
  next();
});
router.use('/transcript', transcript);
router.use('/summary', summary);
router.use('/gallery', gallery);
router.use('/image', image);
router.use('/audio', audio);
router.use('/storage', storage);
router.use('/state', state);
router.use('/logs', logs);
router.use('/config', config);
router.all('*', (req, res) =>
  res.status(NOT_FOUND).send({ error: `${req.method} ${req.originalUrl} not found` })
);

export default router;
