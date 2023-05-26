import config from '../config';

const {
  LOGS: { LEVEL },
} = config();

const KEYS = [
  // generic
  /passw(or)?d/i,
  /key/,
  /^pw$/,
  /^pass$/i,
  /secret/i,
  /token/i,
  /api[-._]?key/i,
  /session[-._]?id/i,
  /^connect\.sid$/,
];

const key = (str: any) => KEYS.some((regex) => regex.test(str));

const traverse = (obj: { [name: string]: any }, value: any) => {
  const o = obj;
  Object.keys(o).forEach((k) => {
    if (o[k] !== null && typeof o[k] === 'object') {
      traverse(o[k], value);
      return;
    }
    if (typeof o[k] === 'string') {
      if (key(k)) o[k] = value;
    }
  });
  return o;
};

export default (obj: {}, value = '*** REDACTED IN LOGS ***') => {
  try {
    return LEVEL === 'silly' ? obj : traverse(JSON.parse(JSON.stringify(obj)), value);
  } catch (error) {
    return obj;
  }
};
