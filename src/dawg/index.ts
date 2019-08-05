export { notify } from '@/dawg/extensions/core/notify';
export { palette } from '@/dawg/extensions/core/palette';
export { commands } from '@/dawg/extensions/core/commands';
export { activityBar } from '@/dawg/extensions/core/activity-bar';
export { busy } from '@/dawg/extensions/core/busy';
export { theme } from '@/dawg/extensions/core/theme';
export { project } from '@/dawg/extensions/core/project';
export { menu, context } from '@/base/menu';
export { instruments } from '@/dawg/extensions/core/instruments';
export { ui } from '@/base/ui';
export { pianoRoll } from '@/dawg/extensions/core/piano-roll';
export { patterns } from '@/dawg/extensions/core/patterns';
export { applicationContext } from '@/dawg/extensions/core/application-context';
export { panels } from '@/dawg/extensions/core/panels';
export { sizes } from '@/dawg/extensions/core/sizes';
export { models } from '@/dawg/extensions/core/models';
export { menubar } from '@/dawg/extensions/core/menubar';
export { record } from '@/dawg/extensions/core/record';
export { status } from '@/dawg/extensions/core/status';
export { log } from '@/dawg/extensions/core/log';
export { playlist } from '@/dawg/extensions/core/playlist';
export { sampleViewer } from '@/dawg/extensions/core/sample-viewer';
export { window } from '@/dawg/extensions/core/window';
export { DawgCommand } from '@/dawg/commands';
export { IExtensionContext, Extension, createExtension, Subscription } from '@/dawg/extensions';
export { manager } from '@/base/manager';
export { Key } from '@/base/keyboard';

// Ignore unused imports here
import { helpLinks } from '@/dawg/extensions/core/help-links';

import * as platform from '@/base/platform';
import * as events from '@/events';

export {
  events,
  platform,
};
