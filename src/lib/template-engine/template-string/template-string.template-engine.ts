import path from 'path';

import { Injectable } from '@guarani/di';

import { Logger } from '../../logger/logger';
import { TemplateEngine } from '../template-engine';

/**
 * Implementation of the Template String Template Engine.
 */
@Injectable()
export class TemplateStringTemplateEngine extends TemplateEngine {
  /**
   * Instantiates a new Template String Template Engine.
   *
   * @param logger Logger of the Identity Provider.
   */
  public constructor(private readonly logger: Logger) {
    super();
  }

  /**
   * Renders the requested View with the provided Data.
   *
   * @param view Name of the View to be rendered.
   * @param data Data used to render the requested View.
   * @throws {TypeError} Could not find the requested View.
   * @returns Html of the requested View rendered with the provided Data.
   */
  public async render(view: string, data: NodeJS.Dict<unknown>): Promise<string> {
    this.logger.debug(`[${this.constructor.name}] Called render()`, 'dfa8ef1f-89b6-4761-b2f6-0be2c0c5a806', {
      view,
      data,
    });

    const file = path.join(__dirname, 'views', `${view}.view`);
    const viewFunction: (data: NodeJS.Dict<unknown>) => string = require(file).default;

    const html = viewFunction(data);

    this.logger.debug(`[${this.constructor.name}] Completed render()`, '1cbad272-24d9-4fe4-8d1c-4c669148b8c9', {
      view,
      data,
      html,
    });

    return html;
  }
}
