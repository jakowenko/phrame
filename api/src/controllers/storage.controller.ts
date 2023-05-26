import fs from 'fs';
import express from 'express';
import sharp from 'sharp';

import { BAD_REQUEST } from '../constants/http-status';
import config from '../config';

const router = express.Router();

const {
  SYSTEM: { STORAGE },
} = config();

router.get('/image/:filename', async (req, res) => {
  const isThumb = req.query.thumb === '';
  const { filename } = req.params;
  const source = `${STORAGE.IMAGE.PATH}/${filename}`;

  if (!fs.existsSync(source)) {
    return res.status(BAD_REQUEST).send(`${source} does not exist`);
  }

  const buffer = isThumb
    ? await sharp(source, { failOnError: false })
        .jpeg({ quality: 80 })
        .resize(350)
        .withMetadata()
        .toBuffer()
    : fs.readFileSync(source);
  res.set('Content-Type', 'image/png');
  res.end(buffer);
});

export default router;
