import fs from 'fs';
import express from 'express';
import multer from 'multer';

import config from '../config';
import Log from '../util/logger.util';

const router = express.Router();

const {
  SYSTEM: { STORAGE },
} = config();

router.post(
  '/audio',
  multer({ storage: multer.memoryStorage() }).single('file'),
  async (req, res) => {
    const { log } = new Log('audio');
    if (req?.file?.buffer && req?.file?.size) {
      const file = `${STORAGE.PATH}/audio/${Date.now()}.${req.file?.mimetype.split('/').pop()}`;
      fs.writeFileSync(file, req.file.buffer);
      log.info(`saved: ${file}`);
    }
    res.send('OK');
  }
);

export default router;
