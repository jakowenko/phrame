import ai from '../ai';
import socket from '../util/socket.util';
import prisma from '../util/prisma.util';
import { emitter } from '../util/emitter.util';
import Log from '../util/logger.util';
import config from '../config';

emitter.on('image.create', async (summary: { id: number; summary: string }) => {
  const { log } = new Log('image.create');
  const promises: any[] = [];
  const services = config
    .ai()
    .filter((obj) => obj.services.includes('image'))
    .map((obj) => obj.ai);
  if (!services.length) {
    log.warn('no active ai image services');
    return;
  }
  services.forEach((service) => {
    promises.push(ai.image(service, { summary }));
  });
  await Promise.all(promises);
});

emitter.on(
  'image.ready',
  async ({
    summaryId,
    images = [],
  }: {
    summaryId: number;
    images: [{ filename: string }] | [];
  }) => {
    for (let i = 0; i < images.length; i++) {
      const { filename, ...meta }: { filename: string; [key: string]: any } = images[i];
      const { id } = await prisma.image.create({
        data: { summaryId, filename },
      });

      for (const [key, value] of Object.entries(meta)) {
        await prisma.meta.create({
          data: { imageId: id, key, value },
        });
      }

      socket.emit('to', { to: ['frame', 'gallery'], action: 'new-image', summaryId });
    }
  }
);
