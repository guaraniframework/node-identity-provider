/**
 * Base class for a Template Engine.
 */
export abstract class TemplateEngine {
  /**
   * Renders the requested View with the provided Data.
   *
   * @param view Name of the View to be rendered.
   * @param data Data used to render the requested View.
   * @throws {TypeError} Could not find the requested View.
   * @returns Html of the requested View rendered with the provided Data.
   */
  public abstract render(view: string, data: NodeJS.Dict<unknown>): Promise<string>;
}
