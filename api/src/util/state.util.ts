import fs from 'fs';
import _ from 'lodash';

import is from '../util/is.util';
import config from '../config';

const {
  SYSTEM: { STORAGE },
} = config();

let STATE: { [name: string]: any } = {
  processing: false,
  cron: true,
  image: {
    index: 0,
    summary: true,
    cycle: true,
  },
  microphone: {
    enabled: null,
  },
};

if (fs.existsSync(`${STORAGE.PATH}/state.json`)) {
  let tempState = fs.readFileSync(`${STORAGE.PATH}/state.json`, 'utf-8');
  if (is.json(tempState)) {
    STATE = JSON.parse(tempState);
    STATE.processing = false;
  }
}

export default {
  get: () => STATE,
  patch: (obj: { [name: string]: any }) => {
    STATE = _.mergeWith(STATE, obj);
    fs.writeFileSync(`${STORAGE.PATH}/state.json`, JSON.stringify(STATE));
  },
};
