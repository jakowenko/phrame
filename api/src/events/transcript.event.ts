import prisma from '../util/prisma.util';
import socket from '../util/socket.util';
import { emitter } from '../util/emitter.util';
import ai from '../ai';

emitter.on(
  'transcript.create',
  async (transcript: string, { socket = false }: { socket: boolean }) => {
    const data = await prisma.transcript.create({
      data: {
        transcript,
      },
    });
    if (socket) emitter.emit('to', { to: 'controller', transcript: data });
  }
);

emitter.on('transcript.process', async (ids: number[]) => {
  const transcripts: string[] = (
    await prisma.transcript.findMany({
      where: { id: { in: ids } },
    })
  ).map(({ transcript }: { transcript: string }) => transcript);
  await prisma.transcript.deleteMany({
    where: { id: { in: ids } },
  });
  socket.emit('to', { to: 'controller', reloadTranscript: true });

  const summary = await ai.summary('openai', { transcripts });
  emitter.emit('summary.create', summary);
});
