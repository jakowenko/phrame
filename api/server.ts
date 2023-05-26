import os from 'os';
import http from 'http';

import Log from './src/util/logger.util';
import { version } from './package.json';
import config from './src/config';
import socket from './src/util/socket.util';
import storage from './src/util/storage.util';
import cron from './src/util/cron.util';
import emitter from './src/util/emitter.util';
import validate from './src/schemas';

const { log } = new Log('server');

const {
  SYSTEM: { PORT },
} = config();

const getLocalIPs = (): string[] => {
  const networkInterfaces = os.networkInterfaces();
  const localIPs: string[] = [];

  for (const interfaceName in networkInterfaces) {
    const addresses = networkInterfaces[interfaceName];
    if (!addresses) continue;

    for (const addressInfo of addresses) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (addressInfo.internal || addressInfo.family !== 'IPv4') continue;
      localIPs.push(addressInfo.address);
    }
  }

  return localIPs;
};

const start = async () => {
  const server = http.createServer((await import('./src/app')).app).listen(PORT, async () => {
    const message = ['localhost', ...getLocalIPs()]
      .map((ip) => `${ip === 'localhost' ? 'Local' : 'Network'}: http://${ip}:${PORT}`)
      .join('\n');
    log.info(
      `Phrame v${version}\n-------------------------------------------------------\n${message}\n-------------------------------------------------------`
    );
    validate();
    storage.setup();
    emitter.setup();
    socket.connect(server);
    cron.transcript();
    cron.heartbeat();
  });
};

try {
  start().catch((error) => log.error(error));
} catch (error) {
  log.error(error);
}
