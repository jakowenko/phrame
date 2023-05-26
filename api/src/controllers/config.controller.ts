import fs from 'fs';
import express from 'express';
import yaml from 'js-yaml';

import ai from '../ai';
import config from '../config';
import validate from '../schemas';
import { BAD_REQUEST } from '../constants/http-status';

const router = express.Router();

const {
  SYSTEM: { STORAGE },
} = config();

router.get('/', async (req, res) => {
  const { format } = req.query;
  let output = {};
  if (format === 'yaml') output = fs.readFileSync(`${STORAGE.CONFIG.PATH}/config.yml`, 'utf8');
  else if (format === 'yaml-with-defaults') output = yaml.dump(config());
  else output = config.lowercase();
  const errors = validate(true);
  res.send({ config: output, errors });
});

router.patch('/', async (req, res) => {
  try {
    const { code } = req.body;
    yaml.load(code);
    fs.writeFileSync(`${STORAGE.CONFIG.PATH}/config.yml`, code);
    res.send();
  } catch (error: any) {
    if (error.name === 'YAMLException')
      return res.status(BAD_REQUEST).send({ error: error.message });
    res.send(error);
  }
});

router.get('/service/status', async (req, res) => {
  const configuredAIs = config.ai();
  const promises: any[] = [];
  configuredAIs.forEach((configuredAI) => {
    promises.push(ai.test(configuredAI.ai));
  });
  const data = (await Promise.all(promises)).map((result, i) => ({
    ...configuredAIs[i],
    status: result,
  }));
  res.send(data);
});

export default router;
