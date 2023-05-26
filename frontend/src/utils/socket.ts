import { reactive } from 'vue';
import { io, Socket } from 'socket.io-client';
import constants from '@/utils/constants';

interface StateSocket extends Socket {
  state: {
    connected: boolean;
  };
}

const socket = io(constants().socket) as StateSocket;
socket.state = reactive({
  connected: false,
});

socket.on('connect', () => {
  console.log('connected');
  socket.state.connected = true;
  socket.emit('register.url', window.location.href);
});

socket.on('disconnect', () => {
  console.log('disconnect');
  socket.state.connected = false;
});

socket.on('connect_error', () => {
  console.log('connect_error');
  socket.state.connected = false;
});

socket.on('reconnect_error', () => {
  console.log('reconnect');
  socket.state.connected = false;
});

export default socket;
