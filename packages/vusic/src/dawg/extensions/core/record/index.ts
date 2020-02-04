import Vue from 'vue';
import { createExtension } from '@/framework/extensions';
import * as t from '@/modules/io';
import { commands } from '@/dawg/extensions/core/commands';
import { palette } from '@/dawg/extensions/core/palette';
import { notify } from '@/dawg/extensions/core/notify';
import * as Audio from '@/modules/audio';
import audioBufferToWav from 'audiobuffer-to-wav';
import path from 'path';
import fs from '@/fs';
import { ChunkGhost } from '@/core/ghost';
import { remote } from 'electron';
import { Sample, ScheduledSample } from '@/core';
import { ref, watch } from '@vue/composition-api';
import { project } from '@/dawg/extensions/core/project';
import { controls } from '@/dawg/extensions/core/controls';
import ChunkGhostComponent from '@/dawg/extensions/core/record/ChunkGhost.vue';
import * as framework from '@/framework';
import { blobsToAudioBuffer } from '@/modules/converter';

export const RECORDING_PATH = path.join(framework.DOCUMENTS_PROJECT_PATH, 'recordings');

function makeFileName() {
  const date = new Date();
  return 'recording-'
  + date.getFullYear() + '-'
  + date.getMonth() + '-'
  + date.getDay() + '-'
  + date.getHours() +
  + date.getMinutes() +
  + date.getSeconds() +
  '.wav';
}

let ghosts: ChunkGhost[] = [];

export const extension = createExtension({
  id: 'dawg.record',
  global: {
    microphoneIn: t.string,
  },
  activate(context) {
    const recording = ref(false);

    let mediaRecorder: MediaRecorder | null = null;

    watch(controls.state, () => {
      if (mediaRecorder) {
        stopRecording();
      }
    });

    const microphoneIn = context.global.microphoneIn;

    const startRecording = async (trackId: number) => {
      controls.stopIfStarted();
      controls.context.value = 'playlist';
      const time = project.master.transport.beat;

      if (microphoneIn === undefined) {
        notify.info('Please select a microphone from the settings.');
        return;
      }

      let deviceId: string | null = null;

      // enumerate devices and find our input device
      const devices = await navigator.mediaDevices.enumerateDevices();
      devices.forEach((device) => {
        if ( device.label === microphoneIn.value ) {
          deviceId = device.deviceId;
        }
      });

      if (deviceId === null) {
        notify.info('Selected microphone is no longer available.');
        return;
      }

      // create new chunk ghost
      const ghost = new ChunkGhost(time, trackId);
      ghosts.push(ghost);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId }, video: false });
      mediaRecorder = new MediaRecorder(stream);
      const audioBlobs: Blob[] = [];
      mediaRecorder.start(100);

      // keep the ghost updated
      mediaRecorder.ondataavailable = async (event: BlobEvent) => {
        if (!recording.value) {
          recording.value = true;
          controls.startTransport();
        }

        audioBlobs.push(event.data);
        ghost.buffer = await blobsToAudioBuffer(Audio.Context.context, audioBlobs);
      };

      mediaRecorder.onstop = async () => {
        const buffer = await blobsToAudioBuffer(Audio.Context.context, audioBlobs);
        const wavData: ArrayBuffer = audioBufferToWav(buffer, {
          sampleRate: buffer.sampleRate,
          float: true,
          bitDepth: 32,
        });

        await fs.mkdirRecursive(RECORDING_PATH);

        const dst = path.join(RECORDING_PATH, makeFileName());
        try {
          fs.writeFile(dst, new DataView(wavData));
        } catch (e) {
          notify.error('' + e);
        }

        // add the file to the workspace
        // create a sample from the file.
        const master = project.master;
        const sample = Sample.create(dst, buffer);
        project.samples.push(sample);
        const scheduled = new ScheduledSample(sample, {
          type: 'sample',
          sampleId: sample.id,
          duration: sample.beats,
          row: trackId,
          time,
          offset: 0,
        });

        scheduled.schedule(master.transport);
        master.elements.add(scheduled);

        recording.value = false;
      };
    };

    const stopRecording = () => {
      if (mediaRecorder != null) {
        mediaRecorder.stop();
        mediaRecorder = null;
        ghosts = [];
      }
    };

    const disposable = commands.registerCommand({
      text: 'Record Audio',
      callback: async () => {
        const trackNumber = await palette.showNumberInputBox();
        startRecording(trackNumber);
      },
    });

    context.subscriptions.push(disposable);

    const options: string[] = [];
    navigator.mediaDevices.enumerateDevices().then((media) => {
      media.forEach((device) => {
        if (device.kind === 'audioinput') {
          options.push(device.label);
        }
      });
    });

    Vue.component('ChunkGhost', ChunkGhostComponent);

    context.settings.push({
      type: 'select',
      label: 'Microphone In',
      description: 'The source of the microphone',
      value: context.global.microphoneIn,
      options,
    });

    framework.ui.trackContext.push({
      text: 'Record',
      callback: (i) => startRecording(i),
    });

    return {
      recording,
    };
  },
});


export const record = framework.manager.activate(extension);
