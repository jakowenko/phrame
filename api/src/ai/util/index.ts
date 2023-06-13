import axios from 'axios';
import fs from 'fs';

import config from '../../config';

const {
  SYSTEM: { STORAGE },
} = config();

type DownloadImageFromURL = {
  ai: string;
  url?: string;
  style?: string;
};

type SaveImageFromBuffer = {
  ai: string;
  base64?: string;
  style?: string;
};

export const downloadImageFromURL = async ({ url, ai, style }: DownloadImageFromURL) => {
  const { data } = await axios({
    method: 'get',
    url: url,
    responseType: 'arraybuffer',
    timeout: 15000,
  });
  const filename = `${Date.now()}-${ai}-${style}.png`;
  fs.writeFileSync(`${STORAGE.IMAGE.PATH}/${filename}`, data);
  return { filename };
};

export const saveImageFromBuffer = async ({ base64, ai, style }: SaveImageFromBuffer) => {
  const filename = `${Date.now()}-${ai}-${style}.png`;
  if (base64) fs.writeFileSync(`${STORAGE.IMAGE.PATH}/${filename}`, Buffer.from(base64, 'base64'));
  return { filename };
};
