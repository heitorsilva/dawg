import Vue from 'vue';
import * as t from '@/lib/io';
import PianoRollSequencer from '@/core/piano-roll/PianoRollSequencer.vue';
import Note from '@/core/piano-roll/Note.vue';
import { instruments } from '@/core/instruments';
import { patterns } from '@/core/patterns';
import * as framework from '@/lib/framework';
import { commands } from '@/core/commands';
import { ref, watch } from '@vue/composition-api';
import { project } from '@/core/project';
import { controls } from '@/core/controls';
import { SequencerTool } from '@/grid';

export const pianoRoll = framework.manager.activate({
  id:  'dawg.piano-roll',
  workspace: {
    pianoRollRowHeight: {
      type: t.number,
      default: 16,
    },
    pianoRollBeatWidth: {
      type: t.number,
      default: 80,
    },
    scrollLeft: {
      type: t.number,
      default: 0,
    },
    scrollTop: {
      type: t.number,
      default: 0,
    },
    cursorPosition: {
      type: t.number,
      default: 0,
    },
    userLoopStart: t.number,
    userLoopEnd: t.number,
    tool: t.union([t.literal('slicer'), t.literal('pointer')]),
  },
  activate(context) {
    // Do not remove, for type checking
    const tool: SequencerTool | undefined = context.workspace.tool.value;

    context.subscriptions.push(commands.registerCommand({
      text: 'Open Piano Roll',
      shortcut: ['CmdOrCtrl', 'P'],
      callback: () => {
        framework.ui.openedPanel.value = 'Piano Roll';
      },
    }));

    const {
      pianoRollRowHeight,
      pianoRollBeatWidth,
      scrollLeft,
      scrollTop,
      userLoopStart,
      userLoopEnd,
      cursorPosition,
    } = context.workspace;

    Vue.component('Note', Vue.extend(Note));

    const recording = ref(false);
    const component = Vue.extend({
      components: { PianoRollSequencer },
      template: `
      <piano-roll-sequencer
        style="height: 100%"
        v-if="selectedScore.value"
        :pattern="selectedPattern.value"
        :score="selectedScore.value"
        :play="pianoRollPlay"
        :steps-per-beat="project.stepsPerBeat"
        :beats-per-measure="project.beatsPerMeasure"
        :row-height.sync="pianoRollRowHeight.value"
        :px-per-beat.sync="pianoRollBeatWidth.value"
        :scroll-left.sync="scrollLeft.value"
        :scroll-top.sync="scrollTop.value"
        :is-recording="recording.value"
        :user-loop-start.sync="userLoopStart.value"
        :user-loop-end.sync="userLoopEnd.value"
        :cursor-position.sync="cursorPosition.value"
        :tool.sync="tool.value"
      ></piano-roll-sequencer>
      `,
      data: () => ({
        project,
        selectedScore: instruments.selectedScore,
        selectedPattern: patterns.selectedPattern,
        recording,
        pianoRollBeatWidth,
        pianoRollRowHeight,
        scrollLeft,
        scrollTop,
        userLoopStart,
        userLoopEnd,
        cursorPosition,
        tool: context.workspace.tool,
      }),
      computed: {
        pianoRollPlay() {
          return controls.state.value === 'started' && controls.context.value === 'pianoroll';
        },
      },
    });

    const actions: framework.TabAction[] = [];

    framework.ui.panels.push({
      name: 'Piano Roll',
      component,
      actions,
    });

    watch(instruments.selectedScore, () => {
      if (instruments.selectedScore.value) {
        framework.ui.openedPanel.value = 'Piano Roll';
      }
    });

    return {
      addAction(action: framework.TabAction) {
        actions.push(action);
      },
      setRecording(r: boolean) {
        recording.value = r;
      },
      tool,
    };
  },
});
