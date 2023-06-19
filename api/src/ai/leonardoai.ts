import axios from 'axios';

import AI, { LogError } from './ai';
import config from '../config';

const {
  LEONARDOAI: { KEY, IMAGE },
} = config();

class DeepAI extends AI {
  generationId?: string;
  constructor(meta?: any) {
    super('leonardoai', meta);
    this.generationId = undefined;
    this.styles = IMAGE.STYLE;
  }

  async generateImageId() {
    const { data } = await axios({
      method: 'post',
      url: 'https://cloud.leonardo.ai/api/rest/v1/generations',
      headers: {
        Authorization: `Bearer ${KEY}`,
      },
      data: {
        prompt: `${this.meta.summary.summary}, ${this.style}`,
        negative_prompt: IMAGE.NEGATIVE_PROMPT,
        modelId: IMAGE.MODEL_ID,
        sd_version: IMAGE.SD_VERSION,
        num_images: IMAGE.NUM_IMAGES,
        width: IMAGE.WIDTH,
        height: IMAGE.HEIGHT,
        num_inference_steps: IMAGE.NUM_INFERENCE_STEPS,
        guidance_scale: IMAGE.GUIDANCE_SCALE,
        scheduler: IMAGE.SCHEDULER,
        presetStyle: IMAGE.PRESET_STYLE,
        tiling: IMAGE.TILING,
        public: IMAGE.PUBLIC,
        promptMagic: IMAGE.PROMPT_MAGIC,
      },
    });

    if (data?.sdGenerationJob?.generationId) this.generationId = data.sdGenerationJob.generationId;
  }

  async generateImage() {
    await this.createAttemptHandler('create generation', this.generateImageId.bind(this))();
    if (!this.generationId) {
      this.log.error('generation id not found');
      return;
    }
    const images = await this.waitForImage();
    if (images?.length) await this.downloadImage(images);
  }

  async waitForImage() {
    try {
      this.log.info('wait for image');
      for (let i = 0; i < IMAGE.TIMEOUT; i++) {
        const { data } = await axios({
          method: 'get',
          url: `https://cloud.leonardo.ai/api/rest/v1/generations/${this.generationId}`,
          headers: {
            Authorization: `Bearer ${KEY}`,
          },
        });

        if (i === IMAGE.TIMEOUT / 2) {
          this.log.info('still waiting');
        }

        const { status, generated_images } = data.generations_by_pk;
        if (status == 'FAILED') {
          this.log.error('failed to generate image');
          break;
        } else if (status == 'COMPLETE') {
          return generated_images.map(({ url }: { url: string }) => ({
            url,
          }));
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
    try {
      const { data } = await axios({
        method: 'get',
        url: 'https://cloud.leonardo.ai/api/rest/v1/me',
        headers: { Authorization: `Bearer ${KEY}` },
        timeout: 10000,
      });
      return true;
    } catch (error: any) {
      return error?.response?.data || error;
    }
  }

  logError({ type, error }: LogError) {
    this.log.error(`${type}: ${error?.response?.data.error || error}`);
  }
}

export default DeepAI;
