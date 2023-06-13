export default {
  telemetry: true,
  logs: { level: 'verbose' },
  time: { timezone: 'UTC', format: null },
  autogen: {
    cron: '15,45 * * * *',
    prompt:
      'Provide a random short description to describe a picture. It should be no more than one or two sentences. If keywords are provided select a couple at random to help guide the description.',
    keywords: [],
  },
  image: {
    interval: 60,
    order: 'recent',
  },
  transcript: {
    cron: '*/30 * * * *',
    minutes: 30,
    minimum: 5,
  },
  openai: {
    summary: {
      model: 'gpt-3.5-turbo',
      prompt:
        "You are a helpful assistant that will take a string of random conversations and pull out a few keywords and topics that were talked about. You will then turn this into a short description to describe a picture, painting, or artwork. It should be no more than two or three sentences and be something that DALL·E can use. Make sure it doesn't contain words that would be rejected by your safety system.",
      random:
        "Provide a random short description to describe a picture, painting, or artwork. It should be no more than two or three sentences and be something that DALL·E can use. Make sure it doesn't contain words that would be rejected by your safety system.",
    },
    image: {
      size: '512x512',
      n: 1,
      style: ['cinematic'],
    },
  },
  stabilityai: {
    image: {
      timeout: 30,
      engine_id: 'stable-diffusion-512-v2-1',
      width: 512,
      height: 512,
      cfg_scale: 7,
      samples: 1,
      steps: 50,
      style: ['cinematic'],
    },
  },
  deepai: {
    image: {
      enable: true,
      timeout: 30,
      grid_size: 1,
      width: 512,
      height: 512,
      negative_prompt: null,
      style: ['text2img'],
    },
  },
  dream: {
    image: {
      enable: true,
      timeout: 30,
      width: 512,
      height: 512,
      style: ['buliojourney v2'],
    },
  },
  midjourney: {
    image: {
      enable: true,
      parameters: '--chaos 80 --no text',
      upscale: 'random',
      style: ['cinematic'],
    },
  },
};
