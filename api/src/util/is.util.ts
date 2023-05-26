export default {
  json: (value: any) => {
    try {
      JSON.parse(value);
    } catch (e) {
      return false;
    }
    return true;
  },
  object: (value: any) => value && typeof value === 'object' && value instanceof Object,
};
