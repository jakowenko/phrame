import { Server, Socket } from 'socket.io';
import http from 'http';

import state from '../util/state.util';
import { emitter } from '../util/emitter.util';

let io: Server;
let socketUrlMap = new Map();

type EmitMessage =
  | string
  | {
      [key: string]: any;
    };

const connect = (server: http.Server): void => {
  io = new Server(server, {
    cors: { origin: true },
  });

  io.on('connection', (socket: Socket) => {
    socket.on('register.url', (url) => {
      socketUrlMap.set(socket.id, url);
    });

    socket.on('state:patch', (data: { to: string; [key: string]: any }) => {
      const { to, ...obj } = data;
      state.patch(obj);
      if (to) emit('state:get', { to, ...state.get() });
    });

    socket.on('to', (obj: EmitMessage) => {
      emit('to', obj);
    });

    socket.on('realtime', (obj: EmitMessage) => {
      emit('realtime', obj);
    });

    socket.on('disconnect', () => {
      const url = socketUrlMap.get(socket.id) || 'unknown url';
      socketUrlMap.delete(socket.id);
      if (url.includes('?mic')) {
        state.patch({ microphone: { enabled: null } });
        emitter.emit('state:get', { to: 'controller' });
      }
    });
  });
};

const emit = (event: string, message?: EmitMessage): boolean => {
  if (io) {
    io.emit(event, message);
    return true;
  }
  return false;
};

export default { connect, emit };
