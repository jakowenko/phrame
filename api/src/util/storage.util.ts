import fs from 'fs';

import config from '../config';

const {
  SYSTEM: { STORAGE },
} = config();

export default {
  setup: () => {
    const folders = [STORAGE.IMAGE.PATH];
    folders.forEach((folder) => {
      if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
    });
  },
};
