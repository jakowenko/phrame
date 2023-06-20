import fs from 'fs';
import express from 'express';

import config from '../config';
import readLastLines from 'read-last-lines';
import { bytesToSize } from '../util/size.util';

const router = express.Router();

const {
  SYSTEM: { STORAGE },
} = config();

router.get('/', async (req, res) => {
  const { size } = fs.statSync(`${STORAGE.PATH}/messages.log`);
  const logs = await readLastLines.read(`${STORAGE.PATH}/messages.log`, 500);
  res.send({ size: bytesToSize(size), logs });
});

router.delete('/', async (req, res) => {
  fs.writeFileSync(`${STORAGE.PATH}/messages.log`, '');
  res.send();
});

export default router;
