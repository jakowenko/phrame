// @ts-nocheck
import express from 'express';

import { NOT_FOUND } from '../constants/http-status';

const router = express.Router();

type Image = {
  key: string;
  value: string;
};

type GroupedImages = {
  [key: string]: { name: string; value: string }[];
};

const toTitleCase = (str: string): string => {
  if (str === 'openai') return 'OpenAI';
  if (str === 'stabilityai') return 'Stability AI';
  if (str === 'deepai') return 'DeepAI';

  return str.replace(/(\w)(\w*)/g, function (g0, g1, g2) {
    return g1.toUpperCase() + g2.toLowerCase();
  });
};

router.get('/filters', async (req, res) => {
  const data = await req.prisma.meta.groupBy({
    by: ['key', 'value'],
  });

  let filters: GroupedImages = data.reduce((acc: GroupedImages, curr: Image) => {
    if (!acc[curr.key]) {
      acc[curr.key] = [];
    }

    acc[curr.key].push({ name: curr.value, value: curr.value });
    return acc;
  }, {});

  for (const key in filters) {
    let unique = [...new Set(filters[key].map((item) => item.value))];
    filters[key] = unique.map((item) => ({ name: toTitleCase(item), value: item }));
  }

  res.send(filters);
});

router.get('/', async (req, res) => {
  const { limit, summaryId, beforeSummaryId, favorites, ais, styles, summary } = req.query;
  let favoriteFilter = {};
  let searchSummaryIds = false;

  if (favorites) {
    if (favorites.includes('true') && favorites.includes('false')) {
    } else if (favorites.includes('true')) {
      favoriteFilter = { favorite: true };
    } else if (favorites.includes('false')) {
      favoriteFilter = { favorite: false };
    }
  } else favoriteFilter = false;

  if (summary && summary.length >= 3) {
    searchSummaryIds = (
      await req.prisma.summary.findMany({
        where: {
          summary: {
            contains: summary,
          },
        },
      })
    ).map((item) => item.id);
  }

  let aiFilter = ais?.split(',');
  let styleFilter = styles?.split(',');

  const favoriteIds =
    !favoriteFilter && !summaryId
      ? []
      : (
          await req.prisma.image.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
            },
            where: {
              ...favoriteFilter,
              ...(beforeSummaryId && { summaryId: { lt: Number(beforeSummaryId) } }),
              ...(summaryId && { summaryId: Number(summaryId) }),
              ...(searchSummaryIds && { summaryId: { in: searchSummaryIds } }),
            },
          })
        ).map((item) => item.id);

  const styleIds = (
    await req.prisma.meta.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        imageId: true,
      },
      where: {
        AND: [
          {
            key: 'style',
            value: { in: styleFilter },
          },
          { imageId: { in: favoriteIds } },
        ],
      },
    })
  ).map((item) => ({ imageId: item.imageId, metaId: item.id }));

  const aiIds = (
    await req.prisma.meta.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        imageId: true,
      },
      where: {
        AND: [{ key: 'ai', value: { in: aiFilter } }, { imageId: { in: favoriteIds } }],
      },
    })
  ).map((item) => ({ imageId: item.imageId, metaId: item.id }));

  const intersectionIds = styleIds
    .map(({ imageId }) => imageId)
    .filter(
      (imageId) =>
        aiIds.map(({ imageId }) => imageId).includes(imageId) && favoriteIds.includes(imageId)
    );

  const images = await req.prisma.image.findMany({
    orderBy: { createdAt: 'desc' },
    where: {
      id: { in: intersectionIds },
    },
    include: {
      meta: {
        select: { key: true, value: true },
      },
    },
  });

  const summaryIds = [...new Set(images.map((obj) => obj.summaryId))];
  const summaries = await req.prisma.summary.findMany({
    ...(limit !== 'false' && { take: 10 }),
    where: {
      ...(searchSummaryIds.length && { id: { in: searchSummaryIds } }),
      ...(summaryId
        ? { id: Number(summaryId) }
        : beforeSummaryId
        ? { id: { in: summaryIds, lt: Number(beforeSummaryId) } }
        : {
            id: { in: summaryIds },
          }),
    },
    orderBy: { createdAt: 'desc' },
  });

  summaries.forEach((summary: { [key: string]: any }) => {
    summary.image = images.filter(({ summaryId }) => summaryId === summary.id);
  });

  summaries.forEach((summary: { [key: string]: any }) => {
    summary.image = summary.image.map((image: { [key: string]: any }) => ({
      ...image,
      meta: image.meta.reduce(
        (acc: { [key: string]: any }, { key, value }: { [key: string]: any }) => ({
          ...acc,
          [key]: value,
        }),
        {}
      ),
    }));
  });

  if (summaryId) {
    if (!summaries.length) return res.status(NOT_FOUND).send({ error: 'not found' });
    return res.send(summaries[0]);
  }

  const hasMore =
    (await req.prisma.summary.count({
      where: beforeSummaryId
        ? { id: { in: summaryIds, lt: Number(beforeSummaryId) } }
        : { id: { in: summaryIds } },
    })) > summaries.length;

  const totalSummaries = await req.prisma.summary.count({
    where: {
      image: {
        some: {},
      },
    },
  });
  const totalImages = await req.prisma.image.count();
  const totalFavorites = await req.prisma.image.count({ where: { favorite: true } });

  res.send({
    hasMore,
    total: { summaries: totalSummaries, images: totalImages, favorites: totalFavorites },
    galleries: summaries,
  });
});

export default router;
