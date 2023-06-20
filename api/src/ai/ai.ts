import { Logger } from 'winston';
import _ from 'lodash';
import sharp from 'sharp';

import Log from '../util/logger.util';
import sleep from '../util/sleep.util';
import { emitter } from '../util/emitter.util';
import { downloadImageFromURL, saveImageFromBuffer } from './util';
import config from '../config';

const {
  SYSTEM: { STORAGE },
} = config();

export type Random = { prompt?: string; context?: string };
export type LogError = { type: string; error: any };
type GenerateImage = { url: string } | { base64: string };

class AI {
  name: string;
  meta: { summary: { id: string; summary: string }; transcripts: string[] };
  saved: { ai: string; filename: string; style: string }[];
  styles: string[];
  style: string;
  log: Logger;

  constructor(name: string, meta: any) {
    this.name = name;
    this.meta = meta || null;
    this.saved = [];
    this.styles = [];
    this.style = '';
    this.log = new Log(this.name).log;
  }

  sleep = sleep;
  jitter = (min: number = 1, max: number = 5): number => {
    const random = Math.random() * (max - min) + min;
    return Math.round(random * 100) / 100;
  };

  createAttemptHandler(type: string, func: any) {
    let attempt = 1;

    const handler = async (...args: any[]): Promise<any> => {
      try {
        this.log.info(`${type} attempt: ${attempt}`);
        const result = await func(...args);
        attempt = 1;
        return result;
      } catch (error) {
        this.logError({ type, error });
        attempt++;
        if (attempt > 3) {
          this.log.warn(`${type} retries exhausted`);
          return;
        }
        await this.sleep(this.jitter() * attempt);
        return handler(...args);
      }
    };

    return handler;
  }

  async summary(): Promise<string | void> {
    const summary = await this.createAttemptHandler('summary', this.generateSummary.bind(this))();
    if (!summary) {
      this.log.error('no summary returned');
      return;
    }
    this.log.info(`summary: ${summary}`);
    return summary;
  }

  async generateSummary(): Promise<string | void> {
    throw new Error('method not implemented');
  }

  async random({ prompt, context }: Random): Promise<string | void> {
    const random = await this.createAttemptHandler(
      'random summary',
      this.generateRandom.bind(this)
    )({ prompt, context });
    if (!random) {
      this.log.error('no random summary returned');
      return;
    }
    this.log.info(`random summary: ${random}`);
    return random;
  }

  async generateRandom(data: Random): Promise<string | void> {
    throw new Error('method not implemented');
  }

  async image() {
    try {
      for (let i = 0; i < this.styles.length; i++) {
        this.log.info(`processing: ${i + 1}/${this.styles.length} style(s)`);
        this.style = this.styles[i] || 'no style';
        await this.createAttemptHandler('image', this.generateImage.bind(this))();
        await this.sleep(this.jitter());
      }
    } catch (error) {
      this.log.error(`image: ${error}`);
    }
  }

  async generateImage(): Promise<GenerateImage[] | undefined | void> {
    throw new Error('This method is not implemented.');
  }

  async downloadImage(images: GenerateImage[]) {
    if (!images.length) return;
    this.saved = [];

    for (let i = 0; i < images.length; i++) {
      await this.createAttemptHandler(`downloading ${i + 1}/${images.length}`, async () => {
        const image = images[i];
        const { filename } =
          'url' in image
            ? await downloadImageFromURL({
                ai: this.name,
                url: image.url,
                style: this.style,
              })
            : 'base64' in image
            ? await saveImageFromBuffer({
                ai: this.name,
                base64: image.base64,
                style: this.style,
              })
            : { filename: false };
        if (typeof filename === 'string') {
          if (_.get(config.lowercase(), `${this.name}.image.trim`)) {
            let buffer = await sharp(`${STORAGE.IMAGE.PATH}/${filename}`)
              .trim()
              .rotate(180)
              .toBuffer();
            buffer = await sharp(buffer).trim().rotate(180).toBuffer();
            await sharp(buffer).toFile(`${STORAGE.IMAGE.PATH}/${filename}`);
          }
          this.saved.push({ ai: this.name, filename, style: this.style });
        }
      })();
    }

    emitter.emit('image.ready', { summaryId: this.meta.summary.id, images: this.saved });
  }

  async test(): Promise<boolean | unknown> {
    return new Error('method not implemented');
  }

  logError({ type, error }: LogError): any {
    throw new Error('method not implemented');
  }
}

export default AI;
