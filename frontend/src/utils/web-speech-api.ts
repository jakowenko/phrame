import { ApiService } from '@/services/api.service';
import emitter from '@/services/emitter.service';

const { emit } = emitter;

let restartTimeout: NodeJS.Timeout | null;

let audioContext: AudioContext | null;
let recognition: any;
let stream: MediaStream | null;
let source: MediaStreamAudioSourceNode | null;
let volumeMeterNode: AudioWorkletNode | null;
let allowRestart: boolean | null;
let wakeWordTimeout: NodeJS.Timeout | null;
let wakeWordWaiting: boolean | null;

const onVolumeMeterMessage = (event: MessageEvent) => {
  emit('realtime', { to: 'controller', volume: event.data.volume });
};

const stopSpeechRecognition = async () => {
  allowRestart = false;
  if (restartTimeout) clearTimeout(restartTimeout);

  if (recognition) recognition.stop();

  if (volumeMeterNode && source) {
    volumeMeterNode.port.removeEventListener('message', onVolumeMeterMessage);
    if (audioContext) volumeMeterNode.disconnect(audioContext.destination);
    source.disconnect(volumeMeterNode);
    volumeMeterNode = null;
  }

  if (audioContext) await audioContext.close();

  if (stream) stream.getTracks().forEach((track) => track.stop());

  emit('realtime', { to: 'controller', recognition: 'stopped' });
  emit('realtime', { to: 'controller', volume: 0 });
};

const getUserMedia = async () => {
  audioContext = new AudioContext();
  await audioContext.audioWorklet.addModule('js/worklets/volume-meter-processor.js');

  stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
  });

  source = audioContext.createMediaStreamSource(stream);
  volumeMeterNode = new AudioWorkletNode(audioContext, 'volume-meter-processor');
  volumeMeterNode.port.onmessage = onVolumeMeterMessage;
  source.connect(volumeMeterNode);
  volumeMeterNode.connect(audioContext.destination);
};

const speechRecognition = () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  recognition = new SpeechRecognition();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.continuous = true;

  allowRestart = true;
  recognition.start();

  recognition.onresult = async (event: any) => {
    if (wakeWordTimeout) clearTimeout(wakeWordTimeout);
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const { transcript: interm } = event.results[i][0];
      transcript += interm;
    }
    transcript = transcript.trim();

    if (transcript === '') return;

    if (transcript.split(' ').length < 5) {
      if (transcript.includes('next image')) {
        emit('image-control', 'next');
        return;
      }

      if (['previous image', 'last image'].some((keyword) => transcript.includes(keyword))) {
        emit('image-control', 'previous');
        return;
      }
    }

    if (transcript.includes('hey frame') && transcript.split(' ').length < 10) {
      if (restartTimeout) clearTimeout(restartTimeout);
      wakeWordWaiting = true;
      emit('wake-word', { show: true });
      wakeWordTimeout = setTimeout(() => {
        emit('wake-word', { show: false });
        wakeWordWaiting = false;
      }, 10000);
      return;
    }

    if (wakeWordWaiting) {
      emit('wake-word', { transcript });
      wakeWordWaiting = false;
      try {
        await ApiService.post('transcript/manual', { transcript });
      } catch (error) {
        emit('error', error);
      }
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      restartTimeout = setTimeout(restartAll, 5000);
      return;
    }

    try {
      await ApiService.post('transcript', { transcript });
      emit('realtime', { to: 'controller', recognition: 'transcript created' });
    } catch (error) {
      emit('error', error);
    }
  };

  const restartAll = async () => {
    await stopSpeechRecognition();
    await getUserMedia();
    speechRecognition();
  };

  recognition.onstart = (event: any) => {
    emit('realtime', { to: 'controller', recognition: 'active' });
    if (restartTimeout) clearTimeout(restartTimeout);
    restartTimeout = setTimeout(restartAll, 60000);
  };

  recognition.onspeechend = async () => {
    console.log('speech end');
    emit('realtime', { to: 'controller', recognition: 'speech end' });
    if (allowRestart) {
      if (restartTimeout) clearTimeout(restartTimeout);
      restartTimeout = setTimeout(speechRecognition, 1000);
    }
  };

  recognition.onerror = async (event: any) => {
    console.error(event);
    emit('realtime', { to: 'controller', recognition: `error: ${event.error}` });
    if (restartTimeout) clearTimeout(restartTimeout);
    restartTimeout = setTimeout(speechRecognition, 1000);
  };
};

export default {
  speechRecognition: () => speechRecognition(),
  stopSpeechRecognition: () => stopSpeechRecognition(),
  getUserMedia: () => getUserMedia(),
};
