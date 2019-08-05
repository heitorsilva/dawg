import tmp from 'tmp';
import fs from '@/fs';
import { Sample, ScheduledSample } from '@/core';
import { Beats } from '@/core/types';
import { IProject, Project, ProjectType } from '@/project';
import { createExtension, IExtensionContext } from '@/dawg/extensions';
import { remote } from 'electron';
import { manager } from '@/base/manager';
import { MemoryLoader } from '@/core/loaders/memory';
import { notify } from '@/dawg/extensions/core/notify';
import { DG_EXTENSION, FILTERS } from '@/constants';
import { commands, Command } from '@/dawg/extensions/core/commands';
import { menubar } from '@/dawg/extensions/core/menubar';
import { computed, value, watch } from 'vue-function-api';
import { patterns } from '@/dawg/extensions/core/patterns';
import { applicationContext } from '@/dawg/extensions/core/application-context';
import { ui } from '@/base/ui';
import { addEventListener } from '@/utils';
import { log } from '@/dawg/extensions/core/log';
import { emitter } from '@/events';

export interface InitializationError {
  type: 'error';
  message: string;
  project: Project;
}

export interface InitializationSuccess {
  type: 'success';
  project: Project;
}

const events = emitter<{ save: [IProject] }>();

const projectApi = (context: IExtensionContext) => {
  // tslint:disable-next-line:variable-name
  let _p: Project | null = null;
  const state = value<'stopped' | 'started' | 'paused'>('stopped');
  const openedFile = value(manager.getOpenedFile());
  const logger = log.getLogger();

  context.subscriptions.push(manager.onDidSetOpenedFile(() => {
    openedFile.value = manager.getOpenedFile();
  }));

  const transport = computed(() => {
    if (applicationContext.context.value === 'pianoroll') {
      const pattern = patterns.selectedPattern;
      return pattern.value ? pattern.value.transport : null;
    } else {
      return get().master.transport;
    }
  });

  const get = () => {
    if (!_p) {
      const result = loadProject();
      if (result.type === 'error') {
        notify.info('Unable to load project.', { detail: result.message, duration: Infinity });
      }

      _p = result.project;
    }


    return _p;
  };

  function scheduleMaster(sample: Sample, row: number, time: Beats) {
    get().samples.push(sample);

    const scheduled = new ScheduledSample(sample, {
      type: 'sample',
      sampleId: sample.id,
      duration: sample.beats,
      row,
      time,
    });

    scheduled.schedule(get().master.transport);
    get().master.elements.push(scheduled);
  }

  async function openTempProject(p: IProject) {
    const { name } = tmp.fileSync({ keep: true });
    await fs.writeFile(name, JSON.stringify(p, null, 4));

    logger.info(`Writing ${name} as backup`);
    manager.setOpenedFile({ path: name, id: p.id }, { isTemp: true });

    const window = remote.getCurrentWindow();
    window.reload();
  }

  function onDidSave(cb: (encoded: IProject) => void) {
    events.addListener('save', cb);
    return {
      dispose() {
        events.removeListener('save', cb);
      },
    };
  }

  function serializeProject() {
    return get().serialize();
  }

  function getProject() {
    return get();
  }

  async function saveProject(opts: { forceDialog?: boolean }) {
    const p = await get();

    let projectPath = manager.getOpenedFile();
    if (!projectPath || opts.forceDialog) {
      projectPath = remote.dialog.showSaveDialog(remote.getCurrentWindow(), {}) || null;

      // If the user cancels the dialog
      if (!projectPath) {
        return;
      }

      if (!projectPath.endsWith(DG_EXTENSION)) {
        logger.info(`Adding ${DG_EXTENSION} to project path`);
        projectPath = projectPath + DG_EXTENSION;
      }

      // Make sure we set the cache and the general
      // The cache is what is written to the filesystem
      // and the general is the file that is currently opened
      logger.info(`Setting opened project as ${projectPath}`);
      manager.setOpenedFile({ path: projectPath, id: p.id });
    }

    const encoded = p.serialize();

    await fs.writeFile(projectPath, JSON.stringify(encoded, null, 4));
    events.emit('save', encoded);
  }

  async function removeOpenedFile() {
    await manager.setOpenedFile(undefined);
  }

  async function setOpenedFile(path: string) {
    await manager.setOpenedFile({
      path,
      id: get().id,
    });
  }

  const api = {
    scheduleMaster,
    openTempProject,
    onDidSave,
    serializeProject,
    getProject,
    openedFile,
    saveProject,
    removeOpenedFile,
    setOpenedFile,
    playPause() {
      if (!transport.value) {
        notify.warning('Please select a Pattern.', {
          detail: 'Please create and select a Pattern first or switch the Playlist context.',
        });
        return;
      }

      if (transport.value.state === 'started') {
        api.pause();
      } else {
        api.startTransport();
      }
    },
    pause() {
      if (!transport.value) {
        return;
      }

      transport.value.stop();
      state.value = 'paused';
    },
    project: getProject(),
    getTime() {
      if (!transport.value) {
        return 0;
      }

      return transport.value.seconds;
    },
    startTransport() {
      if (!transport.value) {
        return;
      }

      transport.value.start();
      state.value = 'started';
    },
    stopIfStarted() {
      if (transport.value && transport.value.state === 'started') {
        api.stopTransport();
      }
    },
    stopTransport() {
      if (!transport.value) {
        return;
      }

      transport.value.stop();
      state.value = 'stopped';
    },
    state,
  };

  return api;
};

function loadProject(): InitializationError | InitializationSuccess {
  const projectJSON = manager.getProjectJSON();

  if (!projectJSON) {
    return {
      type: 'success',
      project: Project.newProject(),
    };
  }

  const loader = new MemoryLoader(ProjectType, { data: projectJSON });
  const result = loader.load();
  if (result.type === 'error') {
    return {
      type: 'error',
      message: result.message,
      project: Project.newProject(),
    };
  }

  const loaded = Project.load(result.decoded);
  return {
    type: 'success',
    project: loaded,
  };
}

const online = (p: Project) => () => {
  p.instruments.forEach((instrument) => {
    instrument.online();
  });
};

const extension = createExtension({
  id: 'dawg.project',
  activate(context) {
    const api = projectApi(context);

    context.subscriptions.push(addEventListener('online', online(api.project)));

    // Pause every time the context changes
    watch(applicationContext.context, () => {
      api.pause();
    });

    const save: Command = {
      text: 'Save',
      shortcut: ['CmdOrCtrl', 'S'],
      callback: async () => {
        await api.saveProject({
          forceDialog: false,
        });
      },
    };

    const saveAs: Command = {
      text: 'Save',
      shortcut: ['CmdOrCtrl', 'Shift', 'S'],
      callback: async () => {
        await api.saveProject({
          forceDialog: true,
        });
      },
    };

    const open: Command = {
      text: 'Open',
      shortcut: ['CmdOrCtrl', 'O'],
      callback: async () => {
        // files can be undefined. There is an issue with the .d.ts files.
        const files = remote.dialog.showOpenDialog(
          remote.getCurrentWindow(),
          { filters: FILTERS, properties: ['openFile'] },
        );

        // FIXME
        // the showFileDialog messes with the keyup events
        // This is a temporary solution
        commands.clear();

        if (!files) {
          return;
        }

        const filePath = files[0];
        await api.setOpenedFile(filePath);

        const window = remote.getCurrentWindow();
        window.reload();
      },
    };

    const newProject: Command = {
      shortcut: ['CmdOrCtrl', 'N'],
      text: 'New Project',
      callback: async () => {
        await api.removeOpenedFile();

        const window = remote.getCurrentWindow();
        window.reload();
      },
    };

    const toDispose = [save, saveAs, open, newProject].map((command) => {
      context.subscriptions.push(commands.registerCommand(command));
      return menubar.addItem('File', command);
    });

    context.subscriptions.push(...toDispose);
    context.subscriptions.push(commands.registerCommand({
      text: 'Play/Pause',
      shortcut: ['Space'],
      callback: api.playPause,
    }));

    const p = api.getProject();
    const name = value(p.name);
    watch(name, () => {
      p.name = name.value;
    });

    ui.settings.push({
      type: 'string',
      title: 'Project Name',
      description: 'The project name',
      value: name,
    });

    return api;
  },
});

export const project = manager.activate(extension);
