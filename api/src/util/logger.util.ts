import { createLogger, format, transports, Logger } from 'winston';
import util from 'util';
import { DateTime } from 'luxon';

import redact from '../util/redact.util';
import config from '../config';

const {
  SYSTEM: { STORAGE },
  LOGS: { LEVEL },
  TIME,
} = config();

declare global {
  interface Console {
    verbose(...data: any[]): Logger;
    http(...data: any[]): Logger;
    silly(...data: any[]): Logger;
  }
}

class Log {
  label?: string;
  log: Logger;
  logClone: Logger | null;
  constructor(label?: string) {
    this.label = label;
    this.logClone = null;
    this.log = this.create();
  }

  create() {
    const log = createLogger({
      silent: LEVEL === 'silent',
      level: LEVEL,
      defaultMeta: { label: this.label },
      transports: [
        new transports.Console({
          format: format.combine(
            format.colorize(),
            Log.format,
            format.printf((info) => Log.formatMessage(info))
          ),
        }),

        new transports.File({
          filename: `${STORAGE.PATH}/messages.log`,
          format: format.combine(
            Log.format,
            format.printf((info) => Log.formatMessage(info))
          ),
        }),
      ],
    });

    const { error } = log;
    this.logClone = log.child({});
    this.logClone.error = error;
    // @ts-ignore
    log.error = (...args) => this.patchError(args);

    return log;
  }

  patchError(args: any) {
    const isError = args[0] instanceof Error;
    const [error] = args;
    const message = isError
      ? { message: error.stack || error.message, errorUID: error.errorUID }
      : args.map((arg: any) => (typeof arg === 'object' ? JSON.stringify(arg) : arg)).join(' ');

    if (this.logClone) {
      if (isError) this.logClone.error(message);
      // @ts-ignore
      else this.logClone.error(...args);
    }
  }

  static formatMessage = (info: { [key: string]: any }) => {
    return `${Log.convertTime(info.timestamp)}: ${info.label ? `[${info.label}]` : ''} ${
      info.level
    }: ${info.message}`;
  };

  static convertTime = (time: string) => {
    return TIME.FORMAT
      ? DateTime.fromISO(time).setZone(TIME.TIMEZONE.toUpperCase()).toFormat(TIME.FORMAT)
      : DateTime.now().setZone(TIME.TIMEZONE.toUpperCase()).toString();
  };

  static combineMessageAndSplat = () => {
    return {
      transform: (info: any /* , opts */) => {
        info.message = util.format(
          redact(info.message),
          // @ts-ignore
          ...redact(info[Symbol.for('splat')] || [])
        );
        return info;
      },
    };
  };

  static format = format.combine(Log.combineMessageAndSplat(), format.simple(), format.timestamp());
}

export default Log;
