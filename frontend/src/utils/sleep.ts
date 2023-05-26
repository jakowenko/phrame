// eslint-disable-next-line no-promise-executor-return
export default (time: number) => new Promise((resolve) => setTimeout(resolve, time));
