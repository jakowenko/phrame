import fs from 'fs';
import express from 'express';

import config from '../config';
import Log from '../util/logger.util';
import socket from '../util/socket.util';

const { log } = new Log('image');

const router = express.Router();
const {
  SYSTEM: { STORAGE },
  IMAGE: { ORDER },
} = config();

const shuffleArray = (array: any[]) => {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
};

router.get('/', async (req, res) => {
  let images: any[] = [];
  const mostRecentId = (
    await req.prisma.summary.findMany({
      take: 1,
      include: { image: true },
      orderBy: { createdAt: 'desc' },
      where: {
        image: {
          some: {},
        },
      },
    })
  ).map(({ id }: any) => id)[0];

  if (ORDER === 'random') {
    const favImages = await req.prisma.image.findMany({
      where: { summaryId: mostRecentId },
      include: {
        summary: {
          select: { summary: true },
        },
        meta: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    images = await req.prisma.image.findMany({
      where: { favorite: true },
      include: {
        summary: {
          select: { summary: true },
        },
        meta: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    images = [...favImages, ...shuffleArray(images)];
  } else {
    images = await req.prisma.image.findMany({
      where: {
        OR: [
          {
            favorite: true,
          },
          { summaryId: mostRecentId },
        ],
      },
      include: {
        summary: {
          select: { summary: true },
        },
        meta: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  images = images.map(({ summary, meta, ...obj }: any) => ({
    ...obj,
    summary: summary.summary,
    meta: meta.reduce((acc: any, { key, value }: any) => ({ ...acc, [key]: value }), {}),
  }));

  res.send(images);
});

router.patch('/', async (req, res) => {
  const { ids, favorite } = req.body;
  await req.prisma.image.updateMany({
    where: { id: { in: ids } },
    data: { favorite },
  });
  socket.emit('to', { to: 'frame', reloadImages: true });
  res.send('OK');
});

router.delete('/', async (req, res) => {
  const { ids } = req.body;
  await req.prisma.meta.deleteMany({
    where: { imageId: { in: ids } },
  });
  const images = await req.prisma.image.findMany({
    where: { id: { in: ids } },
  });
  await req.prisma.image.deleteMany({
    where: { id: { in: ids } },
  });
  images.forEach(({ filename }: { filename: string }) => {
    try {
      fs.unlinkSync(`${STORAGE.IMAGE.PATH}/${filename}`);
    } catch (error: any) {
      log.error(error.message);
    }
  });
  socket.emit('to', { to: 'frame', reloadImages: true });
  res.send('OK');
});

router.patch('/:id', async (req, res) => {
  const { id } = req.params;
  await req.prisma.image.update({
    where: { id: Number(id) },
    data: req.body,
  });
  if (req.body.hasOwnProperty('favorite')) {
    socket.emit('to', { to: 'frame', reloadImages: true });
  }
  res.send('OK');
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  await req.prisma.meta.deleteMany({
    where: { imageId: Number(id) },
  });
  const { filename } = await req.prisma.image.delete({
    where: { id: Number(id) },
  });
  fs.unlinkSync(`${STORAGE.IMAGE.PATH}/${filename}`);
  res.send('OK');
});

export default router;
