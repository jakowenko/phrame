import fs from 'fs';
import axios from 'axios';

import config from '../config';
import sleep from '../util/sleep.util';
import Log from '../util/logger.util';
import { emitter } from '../util/emitter.util';

const { log } = new Log('stabilityai');

const jitter = () => Math.floor(Math.random() * (5 * 100 - 0 * 100) + 0 * 100) / (1 * 100);

const {
  STABILITYAI: { KEY, IMAGE },
  SYSTEM: { STORAGE },
} = config();

class StabilityAI {
  meta: { summary: { id: string; summary: string }; transcripts: string[] };
  attempt: number;
  images: [{ base64: Buffer; style: string }?];
  saved: [{ ai: string; filename: string; style: string }?];

  constructor(meta: any) {
    this.meta = meta || null;
    this.attempt = 0;
    this.images = [];
    this.saved = [];
  }

  async image() {
    try {
      const {
        summary: { id: summaryId },
      } = this.meta;
      for (let i = 0; i < IMAGE.STYLE.length; i++) {
        log.info(`processing: ${i + 1}/${IMAGE.STYLE.length} style(s)`);
        await this.generateImage(IMAGE.STYLE[i]);
        this.attempt = 0;
        await this.downloadImage();
        emitter.emit('image.ready', { summaryId, images: this.saved });
        await sleep(jitter());
      }
    } catch (error) {
      log.error(`image: ${error}`);
    }
  }

  async generateImage(style: string) {
    try {
      this.attempt += 1;
      this.images = [];
      log.info(`image attempt: ${this.attempt}`);
      const {
        summary: { summary },
      } = this.meta;
      const { data } = await axios({
        method: 'post',
        url: `https://api.stability.ai/v1/generation/${IMAGE.ENGINE_ID}/text-to-image`,
        timeout: IMAGE.TIMEOUT * 1000,
        headers: {
          Authorization: `Bearer ${KEY}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        data: JSON.stringify({
          width: IMAGE.WIDTH,
          height: IMAGE.HEIGHT,
          cfg_scale: IMAGE.CFG_SCALE,
          samples: IMAGE.SAMPLES,
          steps: IMAGE.STEPS,
          style_preset: style,
          text_prompts: [
            {
              text: `${summary}`,
            },
          ],
        }),
      });

      data.artifacts.forEach((artifact: { base64: Buffer }) => {
        this.images.push({ base64: artifact.base64, style });
      });
    } catch (error: any) {
      await this.handleError('image', error, this.generateImage.bind(this), style);
    }
  }

  async downloadImage() {
    try {
      if (!this.images.length) return;
      this.attempt += 1;
      this.saved = [];
      log.info(`download image attempt: ${this.attempt}`);

      for (let i = 0; i < this.images.length; i++) {
        log.info(`downloading ${i + 1}/${this.images.length}`);
        const filename = `${Date.now()}.png`;
        fs.writeFileSync(
          `${STORAGE.IMAGE.PATH}/${filename}`,
          // @ts-ignore
          Buffer.from(this.images[i].base64, 'base64')
        );
        // @ts-ignore
        this.saved.push({ ai: 'stabilityai', filename, style: this.images[i].style });
      }
    } catch (error: any) {
      await this.handleError('download image', error, this.downloadImage.bind(this));
    }
  }

  async test() {
    try {
      await axios({
        method: 'get',
        url: `https://api.stability.ai/v1/user/balance`,
        timeout: 5000,
        headers: {
          Authorization: `Bearer ${KEY}`,
        },
      });
      return true;
    } catch (error: any) {
      log.error(error);
      return error?.response?.data?.message || error.message;
    }
  }

  async handleError(type: string, error: any, callback: any, ...callbackArgs: any[]) {
    log.error(`${type}: ${error?.response?.data?.message || error}`);
    if (this.attempt >= 3) {
      log.warn('retries exhausted');
      return;
    }
    await sleep(jitter() * this.attempt * 1);
    await callback(...callbackArgs);
  }
}

export default StabilityAI;
