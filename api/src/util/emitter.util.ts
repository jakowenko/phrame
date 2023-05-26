import { EventEmitter } from 'events';

import socket from './socket.util';
import state from './state.util';

const setup = async (): Promise<void> => {
  await import('../events/transcript.event');
  await import('../events/summary.event');
  await import('../events/image.event');
};

export const emitter = new EventEmitter();

emitter.on('to', ({ to, ...obj }) => {
  socket.emit('to', { to, ...obj });
});

emitter.on('state:get', ({ to }) => {
  socket.emit('state:get', { to, ...state.get() });
});

export default { setup, emitter };
