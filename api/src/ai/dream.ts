import axios from 'axios';

import AI, { LogError } from './ai';
import config from '../config';
import dreamStyles from './util/dream-styles.util';

const {
  DREAM: { KEY, IMAGE },
} = config();

const styleToId = (style: string) =>
  dreamStyles.find((s) => s.name.toLowerCase() === style.toLowerCase())?.id;

class Dream extends AI {
  taskId?: number;
  constructor(meta?: any) {
    super('dream', meta);
    this.styles = IMAGE.STYLE;
    this.taskId = undefined;
  }

  async generateTask() {
    const { data } = await axios({
      method: 'post',
      url: 'https://api.luan.tools/api/tasks',
      headers: {
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
      },
      data: { use_target_image: false },
    });
    this.taskId = data.id;
  }

  async generateImage() {
    await this.createAttemptHandler('create task', this.generateTask.bind(this))();
    if (!this.taskId) {
      this.log.error('task id not found');
      return;
    }
    await this.createAttemptHandler('set task', this.startTask.bind(this))();
    const image = await this.waitForImage();
    if (image?.url) await this.downloadImage([{ url: image.url }]);
  }

  async startTask() {
    await axios({
      method: 'put',
      url: `https://api.luan.tools/api/tasks/${this.taskId}`,
      headers: {
        Authorization: `Bearer ${KEY}`,
        'Content-Type': 'application/json',
      },
      data: JSON.stringify({
        input_spec: {
          style: styleToId(this.style),
          prompt: this.meta.summary.summary,
          width: 512,
          height: 512,
        },
      }),
    });
  }

  async waitForImage() {
    try {
      this.log.info('wait for image');
      for (let i = 0; i < IMAGE.TIMEOUT; i++) {
        const { data } = await axios({
          method: 'get',
          url: `https://api.luan.tools/api/tasks/${this.taskId}`,
          headers: {
            Authorization: `Bearer ${KEY}`,
            'Content-Type': 'application/json',
          },
        });

        if (i === IMAGE.TIMEOUT / 2) {
          this.log.info('still waiting');
        }

        const { state } = data;
        if (state == 'failed') {
          this.log.error('failed to generate image');
          break;
        } else if (state == 'completed') {
          return { url: data.result };
        }
        await this.sleep(1);
      }
      this.log.warn(`image was not generated after ${IMAGE.TIMEOUT} seconds`);
    } catch (error: any) {
      this.logError({ type: 'wait for image', error });
      throw new Error(error);
    }
  }

  async test() {
    const uuid = () =>
      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        let r = (Math.random() * 16) | 0,
          v = c == 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });

    const taskId = uuid();
    const { data } = await axios({
      method: 'get',
      url: `https://api.luan.tools/api/tasks/${taskId}`,
      headers: {
        Authorization: `Bearer ${KEY}`,
      },
      validateStatus: () => true,
    });

    return data?.detail?.toLowerCase().includes(`${taskId} not found`) || data;
  }

  logError({ type, error }: LogError): any {
    this.log.error(`${type}: ${error?.response?.data?.detail || error}`);
  }
}

export default Dream;
