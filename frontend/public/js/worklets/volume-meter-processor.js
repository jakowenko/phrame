/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/lines-between-class-members */
/* eslint-disable no-plusplus */

registerProcessor(
  'volume-meter-processor',
  class extends AudioWorkletProcessor {
    constructor() {
      super();
      this.volumeSum = 0;
      this.volumeCount = 0;
      this.lastUpdateTime = currentTime;
      this.updateInterval = 0.25;
    }

    process(inputs /* , outputs, parameters */) {
      const input = inputs[0];
      // const output = outputs[0];

      let sum = 0;
      let totalSamples = 0;

      for (let channel = 0; channel < input.length; ++channel) {
        const samples = input[channel];
        for (let i = 0; i < samples.length; ++i) {
          sum += Math.abs(samples[i]);
          totalSamples++;
        }
      }

      const average = sum / totalSamples;

      this.volumeSum += average;
      this.volumeCount++;

      if (currentTime - this.lastUpdateTime >= this.updateInterval) {
        const volumeDB = average === 0 ? -Infinity : 20 * Math.log10(average);
        const minDB = -60;
        const maxDB = 0;
        const clampedDB = Math.max(minDB, Math.min(maxDB, volumeDB));
        const volume0To100 = ((clampedDB - minDB) / (maxDB - minDB)) * 100;

        this.port.postMessage({ volume: volume0To100 });

        this.volumeSum = 0;
        this.volumeCount = 0;
        this.lastUpdateTime = currentTime;
      }

      return true;
    }
  },
);
