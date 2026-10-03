import { Constructor } from '@guarani/di';

import { PageDisplay } from './page/page.display';
import { PopupDisplay } from './popup/popup.display';
import { TouchDisplay } from './touch/touch.display';
import { WapDisplay } from './wap/wap.display';
import { Display } from './display';
import { DisplayName } from './display-name.type';

/**
 * Display Registry.
 */
export const displayRegistry: Record<DisplayName, Constructor<Display>> = {
  page: PageDisplay,
  popup: PopupDisplay,
  touch: TouchDisplay,
  wap: WapDisplay,
};
