import axios from 'axios';

import AI, { LogError } from './ai';
import config from '../config';

const {
  STABILITYAI: { KEY, IMAGE },
} = config();

class StabilityAI extends AI {
  constructor(meta?: any) {
    super('stabilityai', meta);
    this.styles = IMAGE.STYLE;
  }

  async generateImage() {
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
        style_preset: this.style,
        text_prompts: [
          {
            text: this.meta.summary.summary,
          },
        ],
      }),
    });
    const images: { base64: string }[] = [];
    data.artifacts.forEach((artifact: { base64: string }) => {
      images.push({ base64: artifact.base64 });
    });
    this.downloadImage(images);
  }

  async test() {
    try {
      await axios({
        method: 'get',
        url: `https://api.stability.ai/v1/user/balance`,
        headers: { Authorization: `Bearer ${KEY}` },
      });
      return true;
    } catch (error: any) {
      this.log.error(error);
      return error?.response?.data?.message || error;
    }
  }

  logError({ type, error }: LogError) {
    this.log.error(`${type}: ${error?.response?.data?.message || error}`);
  }
}

export default StabilityAI;
