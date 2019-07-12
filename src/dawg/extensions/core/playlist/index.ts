import Vue from 'vue';
import { manager } from '@/dawg/extensions/manager';
import { project } from '@/dawg/extensions/core/project';
import { workspace, general, Project } from '@/store';
import { record } from '@/dawg/extensions/core/record';
import { ScheduledPattern, ScheduledSample } from '@/core';
import { value, computed, Wrapper } from 'vue-function-api';
import { ui } from '@/dawg/ui';
import { Ghost } from '@/core/ghosts/ghost';
import { applicationContext } from '../application-context';

// tslint:disable-next-line:interface-over-type-literal
type Workspace = {
  playlistRowHeight: number;
  playlistBeatWidth: number;
};

interface API {
  masterStart: Wrapper<number>;
  masterEnd: Wrapper<number>;
  ghosts: Ghost[];
}

export const playlist = manager.activate<Workspace, {}, API>({
  id: 'dawg.playlist',
  activate(context) {
    const masterStart = value(0);
    const masterEnd = value(0);
    const ghosts: Ghost[] = [];

    const playlistRowHeight = computed(() => {
      return context.workspace.get('playlistRowHeight', 16);
    }, (height: number) => {
      context.workspace.set('playlistRowHeight', height);
    });

    const playlistBeatWidth = computed(() => {
      return context.workspace.get('playlistBeatWidth', 80);
    }, (width: number) => {
      context.workspace.set('playlistBeatWidth', width);
    });

    const component = Vue.extend({
      name: 'PlaylistSequencerWrapper',
      template: `
      <playlist-sequencer
        :tracks="project.tracks"
        :elements="project.master.elements"
        :transport="project.master.transport"
        :play="playlistPlay"
        :start.sync="masterStart.value"
        :end.sync="masterEnd.value"
        :steps-per-beat="project.stepsPerBeat"
        :beats-per-measure="project.beatsPerMeasure"
        :row-height.sync="playlistRowHeight.value"
        :px-per-beat.sync="playlistBeatWidth.value"
        @new-prototype="checkPrototype"
        :is-recording="recording.value"
        :ghosts="ghosts"
      ></playlist-sequencer>
      `,
      data: () => ({
        workspace,
        recording: record.recording,

        // We need these to be able to keep track of the start and end of the playlist loop
        // for creating automation clips
        masterStart,
        masterEnd,
        ghosts,
        project: project.getProject(),
        playlistRowHeight,
        playlistBeatWidth,
      }),
      computed: {
        playlistPlay() {
          return general.play && applicationContext.context.value === 'playlist';
        },
      },
      methods: {
        /**
         * Whenever we add a sample, if it hasn't been imported before, add it the the list of project samples.
         */
        async checkPrototype(prototype: ScheduledPattern | ScheduledSample) {
          if (prototype.component !== 'sample-element') {
            return;
          }

          const sample = prototype.sample;
          if ((await this.project).samples.indexOf(prototype.sample) >= 0) {
            return;
          }

          this.$log.debug('Adding a sample!');
          (await this.project).addSample(sample);
        },
      },
    });

    ui.mainSection.push(component);

    return {
      masterStart,
      masterEnd,
      ghosts,
    };
  },
});
