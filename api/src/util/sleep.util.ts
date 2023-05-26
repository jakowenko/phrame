export default (sec: number) => {
  sec *= 1000;
  return new Promise((resolve) => setTimeout(resolve, sec));
};
