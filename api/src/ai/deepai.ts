import axios from 'axios';

import AI, { LogError } from './ai';
import config from '../config';

const {
  DEEPAI: { KEY, IMAGE },
} = config();

class DeepAI extends AI {
  constructor(meta?: any) {
    super('deepai', meta);
    this.styles = IMAGE.STYLE;
  }

  async generateImage() {
    let formData = new FormData();
    formData.append('text', `${this.meta.summary.summary}`);
    formData.append('grid_size', IMAGE.GRID_SIZE);
    formData.append('width', IMAGE.WIDTH);
    formData.append('height', IMAGE.HEIGHT);
    if (IMAGE.NEGATIVE_PROMPT) formData.append('negative_prompt', IMAGE.NEGATIVE_PROMPT);
    const { data } = await axios({
      method: 'post',
      url: `https://api.deepai.org/api/${this.style}`,
      timeout: IMAGE.TIMEOUT * 1000,
      headers: { 'api-key': KEY },
      data: formData,
    });
    this.downloadImage([{ url: data.output_url }]);
  }

  async test() {
    const { data } = await axios({
      method: 'post',
      url: 'https://api.deepai.org/api/text2img',
      timeout: 10000,
      validateStatus: () => true,
    });

    return data?.status?.toLowerCase().includes('valid api-key') || data;
  }

  logError({ type, error }: LogError) {
    this.log.error(
      `${type}: ${error?.response?.data?.status || error?.response?.data?.err || error}`
    );
  }
}

export default DeepAI;
