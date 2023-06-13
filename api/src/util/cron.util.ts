import os from 'os';
import axios from 'axios';
import { CronJob } from 'cron';
import { DateTime } from 'luxon';

import config from '../config';
import { emitter } from '../util/emitter.util';
import state from '../util/state.util';
import prisma from '../util/prisma.util';
import Log from '../util/logger.util';
import { version } from '../../package.json';

const {
  TELEMETRY,
  TRANSCRIPT: { CRON, MINUTES, MINIMUM },
  AUTOGEN,
} = config();

export default {
  heartbeat: async () => {
    if (process.env.NODE_ENV !== 'production' || !TELEMETRY) return;
    const track = async () =>
      axios({
        method: 'post',
        url: 'https://api.phrame.ai/v1/telemetry',
        timeout: 5 * 1000,
        data: {
          version,
          arch: os.arch(),
        },
        validateStatus: () => true,
      }).catch((/* error */) => {});

    await track();
    new CronJob(`${DateTime.now().toFormat('m')} * * * *`, track).start();
  },
  transcript: async () => {
    const { log } = new Log('cron');
    try {
      new CronJob(CRON, async () => {
        const { cron } = state.get();
        if (!cron) {
          log.verbose('paused');
          return;
        }

        const recent = await prisma.image.findFirst({
          where: {
            createdAt: {
              gte: new Date(Date.now() - 5 * 60 * 1000),
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        if (recent) {
          log.verbose('skipped (image created within last 5 minutes)');
          return;
        }

        await prisma.transcript.deleteMany({
          where: {
            createdAt: {
              lt: new Date(Date.now() - MINUTES * 60 * 1000),
            },
          },
        });

        const transcriptIds = (
          await prisma.transcript.findMany({
            select: {
              id: true,
            },
            where: {
              createdAt: {
                gte: new Date(Date.now() - MINUTES * 60 * 1000),
              },
            },
          })
        ).map(({ id }: { id: number }) => id);

        if (transcriptIds.length < MINIMUM) {
          log.info(
            `${MINIMUM} transcript(s) needed within last ${MINUTES} minutes, found ${transcriptIds.length}`
          );
          return;
        }

        emitter.emit('transcript.process', transcriptIds);
      }).start();
    } catch (error: any) {
      log.error(error.message);
    }
  },
  autogen: async () => {
    const { log } = new Log('autogen');
    try {
      new CronJob(AUTOGEN.CRON, async () => {
        const { autogen } = state.get();
        if (!autogen) {
          log.verbose('paused');
          return;
        }
        const openai = (await import('../ai/openai')).default;
        const summary = await new openai().random({
          prompt: AUTOGEN.PROMPT,
          context: AUTOGEN.KEYWORDS.join(', '),
        });
        emitter.emit('summary.create', summary);
      }).start();
    } catch (error: any) {
      log.error(error.message);
    }
  },
};
