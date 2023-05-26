import { DateTime } from 'luxon';

export default {
  format: (ISO: string, format: string) => DateTime.fromISO(ISO).toFormat(format),
  ago: (ISO: string) => {
    const units = ['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds'] as const;
    const dateTime = DateTime.fromISO(ISO);
    const diff = dateTime.diffNow().shiftTo(...units);
    const unit = units.find((u) => diff.get(u) !== 0) || 'seconds';
    const relativeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
    return relativeFormatter.format(Math.trunc(diff.as(unit)), unit);
  },
};
