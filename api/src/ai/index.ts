const services: any = async (ai: string) => import(`./${ai}`);

export default {
  transcription: async (ai: string, files: string[]) =>
    new (await services(ai)).default().transcription(files),
  summary: async (ai: string, meta: { transcripts: string[] }) =>
    new (await services(ai)).default(meta).summary(),
  image: async (ai: string, meta: { summary: { id: number; summary: string } }) =>
    new (await services(ai)).default(meta).image(),
  test: async (ai: string) => new (await services(ai)).default().test(),
};
