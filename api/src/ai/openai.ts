import { Configuration, OpenAIApi, ChatCompletionRequestMessageRoleEnum } from 'openai';

import AI, { Random, LogError } from './ai';
import config from '../config';

const {
  OPENAI: { KEY, SUMMARY, IMAGE },
} = config();

const openai = new OpenAIApi(
  new Configuration({
    apiKey: KEY,
  })
);

class OpenAI extends AI {
  constructor(meta?: any) {
    super('openai', meta);
    this.styles = IMAGE.STYLE;
  }

  async generateRandom({ prompt = SUMMARY.RANDOM, context }: Random) {
    const {
      data: { choices },
    } = await openai.createChatCompletion(
      {
        model: SUMMARY.MODEL,
        messages: [
          { role: 'system', content: prompt },
          ...(context
            ? [{ role: 'user' as ChatCompletionRequestMessageRoleEnum, content: context }]
            : []),
        ],
      },
      { timeout: 15000 }
    );

    if (!choices[0]?.message?.content) throw new Error('no content returned');
    return choices[0].message.content.replace(/(\r\n|\n|\r)/gm, '');
  }

  async generateSummary() {
    const {
      data: { choices, usage },
    } = await openai.createChatCompletion(
      {
        model: SUMMARY.MODEL,
        messages: [
          {
            role: 'system',
            content: SUMMARY.PROMPT,
          },
          {
            role: 'user',
            content: this.meta.transcripts.join(' '),
          },
        ],
      },
      { timeout: 15000 }
    );
    if (!choices[0]?.message?.content) throw new Error('no content returned');
    return choices[0].message.content.replace(/(\r\n|\n|\r)/gm, '');
  }

  async generateImage() {
    const {
      data: { data },
    } = await openai.createImage({
      prompt: `${this.meta.summary.summary}, ${this.style}`,
      n: IMAGE.N,
      size: IMAGE.SIZE,
    });
    const images: { url: string }[] = data
      .filter((item): item is { url: string } => 'url' in item)
      .map(({ url }) => ({ url }));
    this.downloadImage(images);
  }

  async test() {
    try {
      await openai.listModels();
      return true;
    } catch (error) {
      this.log.error(error);
      return error;
    }
  }

  logError({ type, error }: LogError) {
    this.log.error(`${type}: ${error?.response?.data?.error?.message || error}`);
  }
}

export default OpenAI;
