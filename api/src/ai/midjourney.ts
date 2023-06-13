import { Midjourney, MJMessage, MJInfo } from 'midjourney';

import AI, { LogError } from './ai';
import config from '../config';

const {
  MIDJOURNEY: { TOKEN, SERVER_ID, CHANNEL_ID, HUGGING_FACE_TOKEN, IMAGE },
} = config();

const getRandom = (min: number, max: number): number => {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

const connection: {
  status: boolean;
  timeout: NodeJS.Timeout | null;
} = { status: false, timeout: null };

export default class extends AI {
  client: Midjourney;
  waitTimeMinutes: number;

  constructor(meta?: any) {
    super('midjourney', meta);
    this.waitTimeMinutes = 5;
    this.styles = IMAGE.STYLE;
    this.client = new Midjourney({
      ServerId: SERVER_ID,
      ChannelId: CHANNEL_ID,
      SalaiToken: TOKEN,
      HuggingFaceToken: HUGGING_FACE_TOKEN,
      Debug: false,
      Ws: true,
    });
  }

  async upscale(image: MJMessage, index: 1 | 2 | 3 | 4) {
    if (!image.id || !image.hash) return;
    await this.sleep(this.jitter());
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('upscale timeout')), this.waitTimeMinutes * 60000)
    );
    const promise = this.client.Upscale({
      index,
      msgId: image.id,
      hash: image.hash,
      flags: image.flags,
      loading: (uri: string, progress: string) => {
        this.log.info(`upscale progress ${progress}`);
      },
    });
    const upscale = (await Promise.race([promise, timeout])) as MJMessage;
    if (upscale?.uri) {
      await this.downloadImage([{ url: upscale.uri }]);
    } else throw new Error('no image returned');
  }

  async connect() {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('client timeout')), 10000)
    );
    const promise = this.client.Connect();
    await Promise.race([promise, timeout]);
  }

  async info() {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('info timeout')), 10000)
    );
    const promise = this.client.Info();
    return Promise.race([promise, timeout]) as typeof promise;
  }

  async imagine() {
    const timeout = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('imagine timeout')), this.waitTimeMinutes * 60000)
    );
    const promise = this.client.Imagine(
      `${this.meta.summary.summary}, ${this.style} ${IMAGE.PARAMETERS}`,
      (uri: string, progress: string) => {
        this.log.info(`imagine: ${progress}`);
      }
    );
    const image = (await Promise.race([promise, timeout])) as MJMessage;
    if (!image) throw new Error('no image returned');
    return image;
  }

  async generateImage() {
    await this.connect();
    this.waitTimeMinutes = (await this.info())?.jobMode.toLowerCase() === 'relaxed' ? 10 : 5;
    const image = await this.imagine();
    if (image?.uri) await this.downloadImage([{ url: image.uri }]);
    if (!IMAGE.UPSCALE || !image) return;
    if (IMAGE.UPSCALE === 'random') {
      const rand = getRandom(1, 4);
      await this.createAttemptHandler(`upscale ${rand}/4`, this.upscale.bind(this))(image, rand);
    } else {
      for (let i = 1; i < 1 + IMAGE.UPSCALE; i++) {
        await this.createAttemptHandler(`upscale ${i}/4`, this.upscale.bind(this))(image, i);
      }
    }
    this.client.Close();
  }

  logError({ type, error }: LogError) {
    this.log.error(`${type}: ${error?.response?.data?.error?.message || error}`);
  }

  async test() {
    try {
      if (connection.status) return true;
      await this.connect();
      this.log.info(await this.info());
      this.client.Close();
      connection.status = true;
      if (connection.timeout) clearTimeout(connection.timeout);
      connection.timeout = setTimeout(() => {
        connection.status = false;
      }, 1000 * 60 * 5);
      return true;
    } catch (error) {
      this.log.error(error);
      return error;
    }
  }
}
