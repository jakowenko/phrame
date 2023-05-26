import express from 'express';

import { emitter } from '../util/emitter.util';
import Log from '../util/logger.util';

const { log } = new Log('transcript');

const router = express.Router();

router.get('/', async (req, res) => {
  const { beforeId } = req.query;
  const transcriptCount = await req.prisma.transcript.count();
  const transcripts = await req.prisma.transcript.findMany({
    take: 20,
    where: { ...(beforeId && { id: { lt: Number(beforeId) } }) },
    orderBy: { createdAt: 'desc' },
  });
  res.send({ count: transcriptCount, transcripts });
});

router.post('/', (req, res) => {
  const { transcript } = req.body;
  const words = transcript.split(' ');
  if (words.length >= 3) {
    emitter.emit('transcript.create', transcript, { socket: true });
  }
  res.send('OK');
});

router.delete('/', async (req, res) => {
  const ids = req.body.ids;
  const transcripts = await req.prisma.transcript.deleteMany(
    ids
      ? {
          where: { id: { in: ids } },
        }
      : undefined
  );
  log.info(`deleted ${transcripts.count} transcript(s)`);
  res.send('OK');
});

router.post('/process', (req, res) => {
  emitter.emit('transcript.process');
  res.send('OK');
});

router.post('/manual', (req, res) => {
  const { transcript } = req.body;
  emitter.emit('summary.create', transcript);
  res.send('OK');
});

export default router;
