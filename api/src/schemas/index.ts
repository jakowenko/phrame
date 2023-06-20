import { z } from 'zod';
import util from 'util';

import config from '../config';
import redact from '../util/redact.util';
import Log from '../util/logger.util';

const { log } = new Log('schema validation');

const validateSizeFor768 = (value: {
  width: number;
  height: number;
  engine_id: string;
}): boolean => {
  const width = value.width;
  const height = value.height;
  const engine_id = value.engine_id;
  const size = width * height;

  return !(engine_id.includes('768') && (size < 589824 || size > 1048576));
};

const validateSizeForOtherEngines = (value: {
  width: number;
  height: number;
  engine_id: string;
}): boolean => {
  const width = value.width;
  const height = value.height;
  const engine_id = value.engine_id;
  const size = width * height;

  return !(engine_id.includes('768') === false && (size < 262144 || size > 1048576));
};

const schema = z
  .object({
    telemetry: z.boolean(),
    logs: z
      .object({
        level: z.enum(['silent', 'error', 'warn', 'info', 'http', 'verbose', 'debug', 'silly']),
      })
      .strict(),
    time: z
      .object({
        timezone: z.string(),
        format: z.string().nullish(),
      })
      .strict(),
    image: z
      .object({
        interval: z.number().min(10),
        order: z.enum(['random', 'recent']),
      })
      .strict(),
    transcript: z
      .object({
        cron: z.string(),
        minutes: z.number(),
        minimum: z.number().min(1),
      })
      .strict(),
    autogen: z
      .object({
        cron: z.string(),
        prompt: z.string(),
        keywords: z.array(z.string()),
      })
      .strict(),
    openai: z
      .object({
        key: z.string(),
        summary: z
          .object({
            model: z.string(),
            prompt: z.string(),
            random: z.string(),
          })
          .strict(),
        image: z
          .object({
            enable: z.boolean(),
            trim: z.boolean(),
            size: z.enum(['1024x1024', '512x512', '256x256']),
            style: z.array(z.string()).min(1),
            n: z.number().min(1).max(10),
          })
          .strict(),
      })
      .strict()
      .nullish(),
    stabilityai: z
      .object({
        key: z.string(),
        image: z
          .object({
            enable: z.boolean(),
            trim: z.boolean(),
            engine_id: z.string(),
            width: z.number(),
            height: z.number(),
            timeout: z.number(),
            cfg_scale: z.number().min(0).max(35),
            samples: z.number().min(1).max(10),
            steps: z.number().min(10).max(50),
            style: z
              .array(
                z.enum([
                  '3d-model',
                  'analog-film',
                  'anime',
                  'cinematic',
                  'comic-book',
                  'digital-art',
                  'enhance',
                  'fantasy-art',
                  'isometric',
                  'line-art',
                  'low-poly',
                  'modeling-compound',
                  'neon-punk',
                  'origami',
                  'photographic',
                  'pixel-art',
                  'tile-texture',
                ])
              )
              .min(1),
          })
          .strict()
          .refine(
            (value) => value.width % 64 === 0 && value.height % 64 === 0,
            'Width and height must be multiples of 64'
          )
          .refine(
            validateSizeFor768,
            'Size must be between 589,824 (768x768) and 1,048,576 (1024x1024) for engine_id containing 768'
          )
          .refine(
            validateSizeForOtherEngines,
            'Size must be between 262,144 (512x512) and 1,048,576 (1024x1024) for other engine_ids'
          ),
      })
      .strict()
      .nullish(),
    deepai: z
      .object({
        key: z.string(),
        image: z
          .object({
            enable: z.boolean(),
            trim: z.boolean(),
            timeout: z.number(),
            grid_size: z.number().min(1).max(2),
            width: z.number().min(128).max(1536),
            height: z.number().min(128).max(1536),
            style: z
              .array(
                z.enum([
                  'text2img',
                  'cute-creature-generator',
                  'fantasy-world-generator',
                  'cyberpunk-generator',
                  'anime-portrait-generator',
                  'old-style-generator',
                  'renaissance-painting-generator',
                  'abstract-painting-generator',
                  'impressionism-painting-generator',
                  'surreal-graphics-generator',
                  '3d-objects-generator',
                  'origami-3d-generator',
                  'hologram-3d-generator',
                  '3d-character-generator',
                  'watercolor-painting-generator',
                  'pop-art-generator',
                  'contemporary-architecture-generator',
                  'future-architecture-generator',
                  'watercolor-architecture-generator',
                  'fantasy-character-generator',
                  'steampunk-generator',
                  'logo-generator',
                  'pixel-art-generator',
                  'street-art-generator',
                  'surreal-portrait-generator',
                  'anime-world-generator',
                  'fantasy-portrait-generator',
                  'comics-portrait-generator',
                  'cyberpunk-portrait-generator',
                ])
              )
              .min(1),
            negative_prompt: z.string().nullish(),
          })
          .strict(),
      })
      .strict()
      .nullish(),
    dream: z
      .object({
        key: z.string(),
        image: z
          .object({
            enable: z.boolean(),
            trim: z.boolean(),
            timeout: z.number(),
            width: z.number(),
            height: z.number(),
            style: z
              .array(
                z.enum([
                  'synthwave',
                  'ukiyoe',
                  'no style',
                  'steampunk',
                  'fantasy art',
                  'vibrant',
                  'hd',
                  'pastel',
                  'psychic',
                  'dark fantasy',
                  'mystical',
                  'festive',
                  'baroque',
                  'etching',
                  's.dali',
                  'wuhtercuhler',
                  'realistic',
                  'van gogh',
                  'throwback',
                  'ink',
                  'surreal diffusion',
                  'meme',
                  'provenance',
                  'rose gold',
                  'moonwalker',
                  'blacklight',
                  'psychedelic',
                  'ghibli',
                  'surreal',
                  'love',
                  'death',
                  'robots',
                  'radioactive',
                  'melancholic',
                  'transitory',
                  'aquatic',
                  'toasty',
                  'arcane',
                  'daydream',
                  'malevolent',
                  'street art',
                  'unrealistic',
                  'vibrance',
                  'pandora',
                  'comic',
                  'anime',
                  'line-art',
                  'gouache',
                  'polygon',
                  'paint',
                  'vfx',
                  'hdr',
                  'analogue',
                  'retro-futurism',
                  'isometric',
                  'abstract fluid',
                  'bad trip',
                  'cartoonist',
                  'pixel art',
                  'vector',
                  'fantastical',
                  'the city',
                  'spectral',
                  'dystopia',
                  'diorama',
                  'flora',
                  'abstract',
                  'flora',
                  'watercolor',
                  'illustrative',
                  'soft touch',
                  'winter',
                  'festive',
                  'splatter',
                  'instruct',
                  'realistic v2',
                  'anime v2',
                  'intimate',
                  'vfx v2',
                  'flora v2',
                  'hdr v2',
                  'expressionism v2',
                  'buliojourney v2',
                  'item v2',
                  'blues v2',
                  'unrealistic v2',
                  'cartoonist v2',
                  'watercolor v2',
                  'spectral v2',
                  'spring v2',
                  'gloomy',
                  'the cut',
                  'the bulio cut',
                  'dreamwave v2',
                  'rorschach v2',
                  'vector v2',
                  'flat design',
                  'figure',
                  'abstract fluid v2',
                  'illustrated v2',
                  'ink v2',
                  'poster art',
                  'figure v2',
                  'horror v2',
                ])
              )
              .min(1),
          })
          .strict(),
      })
      .strict()
      .nullish(),
    midjourney: z
      .object({
        server_id: z.string(),
        channel_id: z.string(),
        token: z.string(),
        hugging_face_token: z.string().nullish(),
        image: z
          .object({
            enable: z.boolean(),
            trim: z.boolean(),
            style: z.array(z.string()).min(1),
            parameters: z.string(),
            upscale: z.union([z.literal(false), z.literal('random'), z.number().min(1).max(4)]),
          })
          .strict(),
      })
      .strict()
      .nullish(),
    leonardoai: z
      .object({
        key: z.string().uuid(),
        image: z
          .object({
            enable: z.boolean(),
            trim: z.boolean(),
            timeout: z.number(),
            negative_prompt: z.string().nullable(),
            model_id: z
              .enum([
                '6bef9f1b-29cb-40c7-b9df-32b51c1f67d3',
                'cd2b2a15-9760-4174-a5ff-4d2925057376',
                '291be633-cb24-434f-898f-e662799936ad',
              ])
              .nullable(),
            sd_version: z.enum(['v2', 'v1_5']).nullable(),
            num_images: z.number().min(1).max(8),
            width: z
              .number()
              .min(32)
              .max(1024)
              .refine((n) => n % 8 === 0, {
                message: 'Width must be a multiple of 8',
              }),
            height: z
              .number()
              .min(32)
              .max(1024)
              .refine((n) => n % 8 === 0, {
                message: 'Height must be a multiple of 8',
              }),
            num_inference_steps: z.number().min(30).max(60).nullable(),
            guidance_scale: z.number().min(1).max(7).nullable(),
            scheduler: z
              .enum([
                'KLMS',
                'EULER_ANCESTRAL_DISCRETE',
                'EULER_DISCRETE',
                'DDIM',
                'DPM_SOLVER',
                'PNDM',
              ])
              .nullable(),
            preset_style: z.enum(['LEONARDO', 'NONE']).nullable(),
            tiling: z.boolean().nullable(),
            public: z.boolean().nullable(),
            prompt_magic: z.boolean().nullable(),
            style: z.array(z.string()).min(1),
          })
          .strict()
          .refine(
            (data) =>
              !(data.width > 768 || data.height > 768) ||
              (data.num_images >= 1 && data.num_images <= 4),
            { message: 'If either width or height is over 768, num_images must be between 1 and 4' }
          ),
      })
      .strict()
      .nullish(),
    system: z
      .object({
        port: z.number(),
        storage: z
          .object({
            path: z.string(),
            config: z
              .object({
                path: z.string(),
              })
              .strict(),
            image: z
              .object({
                path: z.string(),
              })
              .strict(),
          })
          .strict(),
      })
      .strict(),
  })
  .strict();

export default (returnErrors: boolean = false) => {
  const configuration = config.lowercase();
  const errors: [string?] = [];
  const validate = schema.safeParse(configuration);

  if (!returnErrors)
    log.verbose(util.inspect(redact(configuration), { depth: null, colors: false }));

  if (!validate.success) {
    if (!returnErrors) log.error(`${validate.error.issues.length} validation error(s)`);
    validate.error.issues.forEach((error) => {
      const path = error.path.join('.');
      const message = `${path ? path + ': ' : ''}${error.message.toLowerCase()}`;
      if (returnErrors) errors.push(message);
      else log.error(message);
    });
  }

  return errors;
};
