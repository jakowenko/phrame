import fs from 'fs';
import axios from 'axios';
import { Configuration, OpenAIApi } from 'openai';

import config from '../config';
import sleep from '../util/sleep.util';
import Log from '../util/logger.util';
import { emitter } from '../util/emitter.util';

const { log } = new Log('openai');

const jitter = () => Math.floor(Math.random() * (5 * 100 - 0 * 100) + 0 * 100) / (1 * 100);

const {
  OPENAI: { KEY, SUMMARY, IMAGE },
  SYSTEM: { STORAGE },
} = config();

const openai = new OpenAIApi(
  new Configuration({
    apiKey: KEY,
  })
);

class OpenAI {
  meta: { summary: { id: string; summary: string }; transcripts: string[] };
  attempt: number;
  images: [{ url: string; style: string }?];
  saved: [{ ai: string; filename: string; style: string }?];

  constructor(meta?: any) {
    this.meta = meta || null;
    this.attempt = 0;
    this.images = [];
    this.saved = [];
  }

  async summary() {
    try {
      this.attempt += 1;
      log.info(`summary attempt: ${this.attempt}`);
      const { transcripts } = this.meta;
      const {
        data: { choices },
      } = await openai.createChatCompletion({
        model: SUMMARY.MODEL,
        messages: [
          {
            role: 'system',
            content: SUMMARY.PROMPT,
          },
          {
            role: 'user',
            content: transcripts.join(' '),
          },
        ],
      });
      const summary = choices[0].message?.content.replace(/(\r\n|\n|\r)/gm, '');
      log.info(`summary: ${summary}`);
      return summary;
    } catch (error) {
      await this.handleError('summary', error, this.summary.bind(this));
    }
  }

  async random() {
    try {
      this.attempt += 1;
      log.info(`random summary attempt: ${this.attempt}`);
      const {
        data: { choices },
      } = await openai.createChatCompletion({
        model: SUMMARY.MODEL,
        messages: [
          {
            role: 'system',
            content: SUMMARY.RANDOM,
          },
        ],
      });
      const summary = choices[0].message?.content.replace(/(\r\n|\n|\r)/gm, '');
      log.info(`random summary: ${summary}`);
      return summary;
    } catch (error) {
      await this.handleError('random summary', error, this.summary.bind(this));
    }
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
      const {
        data: { data },
      } = await openai.createImage({
        prompt: `${summary}, ${style}`,
        n: IMAGE.N,
        size: IMAGE.SIZE,
      });
      data.forEach((image) => {
        if (image.url) this.images.push({ url: image.url, style });
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
        const { data } = await axios({
          method: 'GET',
          // @ts-ignore
          url: this.images[i].url,
          responseType: 'arraybuffer',
          timeout: 30000,
        });
        fs.writeFileSync(`${STORAGE.IMAGE.PATH}/${filename}`, data);
        // @ts-ignore
        this.saved.push({ ai: 'openai', filename, style: this.images[i].style });
      }
    } catch (error: any) {
      await this.handleError('download image', error, this.downloadImage.bind(this));
    }
  }

  async test() {
    try {
      await openai.listModels();
      return true;
    } catch (error) {
      log.error(error);
      return error;
    }
  }

  async handleError(type: string, error: any, callback: any, ...callbackArgs: any[]) {
    log.error(`${type}: ${error?.response?.data?.error?.message || error}`);
    if (this.attempt >= 3) {
      log.warn('retries exhausted');
      return;
    }
    await sleep(jitter() * this.attempt * 1);
    await callback(...callbackArgs);
  }
}

export default OpenAI;
