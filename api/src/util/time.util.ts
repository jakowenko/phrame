import { DateTime } from 'luxon';

enum TimeUnit {
  YEAR = 'year',
  MONTH = 'month',
  WEEK = 'week',
  DAY = 'day',
  HOUR = 'hour',
  MINUTE = 'minute',
  SECOND = 'second',
}

const enumToArray = <T>(enumObj: T): T[keyof T][] => {
  return Object.values(enumObj as { [key: string]: T[keyof T] });
};

export default {
  ago: (date: any) => {
    const dateTime = DateTime.fromISO(date.toISOString());
    const units = enumToArray(TimeUnit);
    const diff = dateTime.diffNow().shiftTo(...units);
    const unit = units.find((u) => diff.get(u) !== 0) || 'second';

    const relativeFormatter = new Intl.RelativeTimeFormat('en', {
      numeric: 'auto',
    });
    return relativeFormatter.format(Math.trunc(diff.as(unit)), unit);
  },
};
