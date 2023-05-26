import fs from 'fs';
import yaml from 'js-yaml';
import _ from 'lodash';

import SYSTEM from './system';
import DEFAULT from './default';

const objectKeysToCase = (
  casing: 'toLowerCase' | 'toUpperCase',
  input: { [name: string]: any }
): { [name: string]: any } => {
  const self = objectKeysToCase;
  if (input === null) return input;
  if (typeof input !== 'object') return input;
  if (Array.isArray(input)) return input.map((value) => self(casing, value));
  return Object.keys(input).reduce((newObj: { [name: string]: any }, key) => {
    const val = input[key];
    const newVal = typeof val === 'object' ? self(casing, val) : val;
    if (casing === 'toLowerCase') newObj[key.toLowerCase()] = newVal;
    else newObj[key.toUpperCase()] = newVal;
    return newObj;
  }, {});
};

const customizer = (objValue: any, srcValue: any) => (_.isNull(srcValue) ? objValue : undefined);

const createFile = (filename: string, path: string, data: any) => {
  if (!fs.existsSync(path)) fs.mkdirSync(path, { recursive: true });
  if (!fs.existsSync(`${path}/${filename}`)) fs.writeFileSync(`${path}/${filename}`, data);
};

const loadYaml = (file: string) => {
  try {
    return yaml.load(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    return error;
  }
};

let loaded: any;
let userOptions: any;

const config = Object.assign(
  (options = {}) => {
    return objectKeysToCase('toUpperCase', config.lowercase());
  },
  {
    lowercase: () => {
      if (loaded) return loaded;
      createFile(
        'config.yml',
        './.storage/config',
        '# Phrame\n# Default values are already applied and do not need to be added\n# Learn more at https://github.com/jakowenko/phrame/#configuration'
      );
      userOptions = loadYaml('./.storage/config/config.yml');
      loaded = _.isEmpty(userOptions) ? DEFAULT : _.mergeWith(DEFAULT, userOptions, customizer);
      loaded = _.mergeWith(loaded, { SYSTEM: SYSTEM });
      loaded = objectKeysToCase('toLowerCase', loaded);

      if (!_.get(userOptions, 'stabilityai.key')) _.unset(loaded, 'stabilityai');
      if (!_.get(userOptions, 'openai.key')) _.unset(loaded, 'openai');

      return loaded;
    },
    ai: () => {
      const supportedAIs = ['openai', 'stabilityai'];
      const configuredAIs: any[] = [];

      supportedAIs.forEach((supportedAI) => {
        const base: { ai: string; services: string[] } = { ai: supportedAI, services: [] };
        if (_.get(loaded, `${supportedAI}.image`)) base.services.push('image');
        if (_.get(loaded, `${supportedAI}.key`)) configuredAIs.push(base);
      });

      return configuredAIs;
    },
  }
);
export default config;
