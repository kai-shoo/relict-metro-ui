export type MetroItemRenderer<T = unknown> = (item: T, container: HTMLElement, index: number) => void;

interface Content<T> {
  element: HTMLElement;
  item?: T;
  index?: number;
  template?: HTMLTemplateElement;
  renderer?: MetroItemRenderer<T>;
}

function fieldValue(item: unknown, name: string): string {
  if (item === null || typeof item !== 'object' || !Object.hasOwn(item, name)) return '';
  const value = (item as Record<string, unknown>)[name];
  return value == null ? '' : String(value);
}

export class RepeaterContent<T> {
  #content = new Map<string, Content<T>>();

  get(key: string): HTMLElement | null { return this.#content.get(key)?.element ?? null; }

  retain(keys: Set<string>): void {
    for (const key of this.#content.keys()) {
      if (!keys.has(key)) this.#content.delete(key);
    }
  }

  render(document: Document, key: string, item: T, index: number, template?: HTMLTemplateElement,
    renderer?: MetroItemRenderer<T>, fallback = ''): HTMLElement {
    let content = this.#content.get(key);
    if (!content) {
      const element = document.createElement('div');
      element.dataset.metroKey = key;
      element.part.add('item-content');
      content = { element };
      this.#content.set(key, content);
    }
    const { element } = content;
    if (renderer) {
      if (!content.renderer && element.hasChildNodes()) element.replaceChildren();
      if (content.renderer !== renderer || !Object.is(content.item, item) || content.index !== index) renderer(item, element, index);
    } else if (template) {
      if (template !== content.template || content.renderer) element.replaceChildren(template.content.cloneNode(true));
      for (const field of element.querySelectorAll<HTMLElement>('[data-metro-field]')) {
        const text = fieldValue(item, field.dataset.metroField ?? '');
        if (field.textContent !== text) field.textContent = text;
      }
    } else if (element.textContent !== fallback || content.template || content.renderer) element.textContent = fallback;
    content.template = template;
    content.renderer = renderer;
    content.item = item;
    content.index = index;
    return element;
  }
}
