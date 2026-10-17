/**
 * The Template Engine allows the Identity Provider to render Html Views as the Body of the Http Response.
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
  public abstract render<T extends NodeJS.Dict<unknown>>(view: string, data: T): Promise<string>;
}
