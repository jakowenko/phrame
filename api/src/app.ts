import 'express-async-errors';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';

import Log from './util/logger.util';
import routes from './routes';

const { log } = new Log('server');

declare global {
  namespace Express {
    interface Request {
      prisma: PrismaClient;
    }
  }
}

export const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(
  express.static(`./frontend/${process.env.NODE_ENV === 'production' ? '' : 'dist/'}`, {
    index: false,
  })
);
app.use('/api', routes);

app.use((req, res) => {
  const html = fs.readFileSync(
    `${process.cwd()}/frontend/${process.env.NODE_ENV === 'production' ? '' : 'dist/'}index.html`,
    'utf8'
  );
  res.send(html);
});

app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  log.error(error);
  res.status(500).send({ error: error.message });
});
