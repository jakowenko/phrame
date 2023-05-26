import fs from 'fs';
import express from 'express';

import config from '../config';
import readLastLines from 'read-last-lines';

const router = express.Router();

const {
  SYSTEM: { STORAGE },
} = config();

const bytesToSize = (bytes: number) => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Bytes';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString(), 10);
  return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
};

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
