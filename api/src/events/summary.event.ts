import prisma from '../util/prisma.util';
import { emitter } from '../util/emitter.util';

emitter.on('summary.create', async (summary: string) => {
  if (!summary) return;
  const data = await prisma.summary.create({ data: { summary } });
  emitter.emit('image.create', data);
});
