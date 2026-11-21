import { afterEach, describe, expect, test } from 'vitest';
import { cdp, page, server, userEvent } from 'vitest/browser';
import '../src/auto-suggest-box.js';
import '../src/password-box.js';
import '../src/text-box.js';

let fixture: HTMLDivElement | undefined;

function mount(content: string) {
  fixture = document.createElement('div');
  fixture.innerHTML = content;
  document.body.append(fixture);
  return fixture;
}

afterEach(() => {
  fixture?.remove();
  fixture = undefined;
});

describe('Metro text box', () => {
  test.each([
    { theme: 'light', background: '#00000026', text: '#000000de' },
    { theme: 'dark', background: '#ffffffbf', text: '#000' },
  ])('uses readable Phone input brushes for text, password, and suggestions in $theme', async ({ theme, background, text }) => {
    const tags = ['metro-text-box', 'metro-password-box', 'metro-auto-suggest-box'] as const;
    const container = mount(`
      ${tags.map(tag => `<${tag} data-metro-theme="${theme}" value="Example"></${tag}>`).join('')}
      <span style="background-color:${background}; color:${text}"></span>
    `);
    const reference = getComputedStyle(container.querySelector('span')!);
    for (const tag of tags) {
      const field = container.querySelector(tag)!;
      await field.updateComplete;
      const control = field.shadowRoot!.querySelector('[part="control"]')!;
      const input = field.shadowRoot!.querySelector('[part="input"]')!;
      expect(getComputedStyle(control).backgroundColor).toBe(reference.backgroundColor);
      expect(getComputedStyle(input).color).toBe(reference.color);
    }
  });

  test('links an external label and a description to a native editor and form', async () => {
    const container = mount(`
      <form id="profile"></form>
      <label for="nickname">Nickname</label>
      <metro-text-box id="nickname" name="nickname" form="profile" required pattern="[A-Za-z]+">
        <span slot="description">Use letters only</span>
      </metro-text-box>
      <button type="button">After the editor</button>
    `);
    const form = container.querySelector('form')!;
    const textBox = container.querySelector('metro-text-box')!;
    const input = page.getByRole('textbox', { name: 'Nickname' });
    await expect.element(input).toHaveAccessibleDescription('Use letters only');
    expect(textBox.form).toBe(form);
    expect(textBox.labels.length).toBe(1);
    expect(form.checkValidity()).toBe(false);
    expect(textBox.validity.valueMissing).toBe(true);

    await userEvent.click(page.getByText('Nickname'));
    await expect.poll(() => textBox.shadowRoot?.activeElement).toBe(input.element());

    const edited: string[] = [];
    const committed: string[] = [];
    container.addEventListener('input', event => {
      expect(event.target).toBe(textBox);
      expect(event).toBeInstanceOf(InputEvent);
      edited.push(textBox.value);
    });
    container.addEventListener('change', () => committed.push(textBox.value));
    await userEvent.keyboard('1');
    expect(edited).toEqual(['1']);
    expect(textBox.validity.patternMismatch).toBe(true);
    expect(new FormData(form).get('nickname')).toBe('1');
    await userEvent.click(page.getByRole('button', { name: 'After the editor' }));
    expect(committed).toEqual(['1']);

    textBox.value = 'Chris';
    textBox.defaultValue = 'Lee';
    expect(textBox.value).toBe('Chris');
    expect(new FormData(form).get('nickname')).toBe('Chris');
    expect(form.checkValidity()).toBe(true);
    textBox.setCustomValidity('That nickname is in use');
    expect(textBox.validationMessage).toBe('That nickname is in use');
    textBox.setCustomValidity('');
    form.reset();
    await expect.element(input).toHaveValue('Lee');
    expect(edited).toEqual(['1']);
    expect(committed).toEqual(['1']);
  });

  test('supports textarea selection, cancellation and the native undo stack', async () => {
    const container = mount(`
      <form>
        <metro-text-box value="first&#10;second" multiline rows="5" name="notes" maxlength="20">
          <span slot="label">Notes</span>
        </metro-text-box>
      </form>
    `);
    const form = container.querySelector('form')!;
    const textBox = container.querySelector('metro-text-box')!;
    const field = page.getByRole('textbox', { name: 'Notes' });
    await expect.element(field).toHaveValue('first\nsecond');
    expect(field.element()).toBeInstanceOf(HTMLTextAreaElement);
    expect((field.element() as HTMLTextAreaElement).rows).toBe(5);
    expect(textBox.maxLength).toBe(20);

    await userEvent.click(field);
    textBox.setSelectionRange(0, 5);
    expect(textBox.selectionStart).toBe(0);
    expect(textBox.selectionEnd).toBe(5);
    textBox.addEventListener('beforeinput', event => event.preventDefault(), { once: true });
    await userEvent.keyboard('x');
    expect(textBox.value).toBe('first\nsecond');

    await userEvent.keyboard('Y');
    expect(textBox.value).toBe('Y\nsecond');
    await userEvent.keyboard('{Control>}z{/Control}');
    expect(textBox.value).toBe('first\nsecond');

    textBox.setSelectionRange(0, 5);
    await userEvent.keyboard('{Control>}c{/Control}');
    textBox.setSelectionRange(6, 12);
    const editTypes: string[] = [];
    textBox.addEventListener('input', event => editTypes.push((event as InputEvent).inputType));
    await userEvent.keyboard('{Control>}v{/Control}');
    await expect.poll(() => textBox.value).toBe('first\nfirst');
    expect(editTypes).toEqual(['insertFromPaste']);
    await userEvent.keyboard('{Control>}z{/Control}');
    expect(textBox.value).toBe('first\nsecond');
    textBox.setSelectionRange(5, 5);
    await userEvent.keyboard('{End}{Enter}line');
    expect(new FormData(form).get('notes')).toBe('first\nline\nsecond');
  });

  test.skipIf(server.browser !== 'chromium')('passes emulated IME composition through the native input', async () => {
    const container = mount('<metro-text-box label="Translation"></metro-text-box>');
    const textBox = container.querySelector('metro-text-box')!;
    const field = page.getByRole('textbox', { name: 'Translation' });
    await userEvent.click(field);
    const changes: [string, boolean][] = [];
    textBox.addEventListener('input', event => {
      changes.push([textBox.value, (event as InputEvent).isComposing]);
    });
    const session = cdp();
    await session.send('Input.imeSetComposition', { text: 'に', selectionStart: 1, selectionEnd: 1 });
    expect(changes).toContainEqual(['に', true]);
    await session.send('Input.insertText', { text: '日本' });
    expect(textBox.value).toBe('日本');
    await expect.element(field).toHaveValue('日本');
  });

  test('submits a one-line form through its default button and honors cancellation', async () => {
    const container = mount(`
      <form>
        <metro-text-box label="Email" name="email" type="email" required></metro-text-box>
        <button type="submit">Continue</button>
      </form>
    `);
    const form = container.querySelector('form')!;
    const textBox = container.querySelector('metro-text-box')!;
    const submitters: (HTMLElement | null)[] = [];
    form.addEventListener('submit', event => {
      event.preventDefault();
      submitters.push(event.submitter);
    });
    const submit = page.getByRole('button', { name: 'Continue' });
    const field = page.getByRole('textbox', { name: 'Email' });
    await userEvent.click(field);
    await userEvent.keyboard('wrong');
    expect(textBox.validity.typeMismatch).toBe(true);
    await userEvent.keyboard('{Enter}');
    expect(submitters).toEqual([]);

    textBox.value = 'mail@example.test';
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => submitters).toEqual([submit.element()]);
    form.addEventListener('keydown', event => event.preventDefault(), { once: true });
    await userEvent.keyboard('{Enter}');
    expect(submitters).toEqual([submit.element()]);
  });

  test('Enter uses the first image submit button associated with the form', async () => {
    const container = mount(`
      <input type="image" form="details" alt="Locate" name="point" width="32" height="32"
        src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7">
      <form id="details">
        <metro-text-box label="Address" name="address" value="Test street"></metro-text-box>
        <button type="submit">Open</button>
      </form>
    `);
    const submitters: (HTMLElement | null)[] = [];
    const form = container.querySelector('form')!;
    const image = container.querySelector<HTMLInputElement>('input[type=image]')!;
    expect(image.form).toBe(form);
    form.addEventListener('submit', event => {
      event.preventDefault();
      submitters.push(event.submitter);
    });
    const field = container.querySelector('metro-text-box')!;
    await field.updateComplete;
    field.focus();
    expect(document.activeElement).toBe(field);
    await userEvent.keyboard('{Enter}');
    await expect.poll(() => submitters).toEqual([image]);
  });
});

describe('Metro password box', () => {
  test('keeps secrets masked, does not reflect a current value, and resets with the form', async () => {
    const container = mount(`
      <form>
        <fieldset>
          <metro-password-box name="passphrase" label="Passphrase" required minlength="3"></metro-password-box>
        </fieldset>
      </form>
    `);
    const form = container.querySelector('form')!;
    const fieldset = container.querySelector('fieldset')!;
    const password = container.querySelector('metro-password-box')!;
    await expect.element(page.getByLabelText('Passphrase')).toBeVisible();
    const native = password.shadowRoot!.querySelector('input')!;
    expect(native.type).toBe('password');
    expect(native.getAttribute('autocomplete')).toBe('current-password');
    expect(native.spellcheck).toBe(false);
    expect(password.validity.valueMissing).toBe(true);

    password.focus();
    await userEvent.keyboard('ab');
    expect(password.validity.tooShort).toBe(true);
    await userEvent.keyboard('c');
    expect(password.checkValidity()).toBe(true);
    expect(password.getAttribute('value')).toBeNull();
    expect(new FormData(form).get('passphrase')).toBe('abc');

    fieldset.disabled = true;
    expect(new FormData(form).has('passphrase')).toBe(false);
    expect(native.disabled).toBe(true);
    fieldset.disabled = false;
    form.reset();
    expect(password.value).toBe('');
    expect(native.type).toBe('password');
    expect(password.validity.valueMissing).toBe(true);
  });

  test('reveals only during pointer or keyboard hold and restores selection', async () => {
    const container = mount(`
      <metro-password-box reveal reveal-label="Hold to reveal" label="Passphrase"></metro-password-box>
      <button type="button">Outside</button>
    `);
    const password = container.querySelector('metro-password-box')!;
    const reveal = page.getByRole('button', { name: 'Hold to reveal' });
    await expect.element(reveal).toBeDisabled();
    password.value = 'secret';
    await expect.element(reveal).toBeEnabled();
    const input = password.shadowRoot!.querySelector('input')!;
    password.focus();
    password.setSelectionRange(1, 4);
    const changes: string[] = [];
    password.addEventListener('change', () => changes.push(password.value));

    await userEvent.pointer({ target: reveal, keys: '[MouseLeft>]' });
    expect(input.type).toBe('text');
    expect(password.shadowRoot?.activeElement).toBe(input);
    await userEvent.pointer('[/MouseLeft]');
    expect(input.type).toBe('password');
    expect([password.selectionStart, password.selectionEnd]).toEqual([1, 4]);

    await userEvent.tab();
    await expect.poll(() => password.shadowRoot?.activeElement).toBe(reveal.element());
    await userEvent.keyboard('{Enter>}');
    expect(input.type).toBe('text');
    await userEvent.keyboard('{Escape}');
    expect(input.type).toBe('password');
    await userEvent.keyboard('{/Enter}');

    await userEvent.keyboard('[Space>]');
    expect(input.type).toBe('text');
    await userEvent.tab();
    expect(input.type).toBe('password');
    await userEvent.keyboard('[/Space]');
    expect(changes).toEqual([]);
  });

  test('masks and restores the input focus if the held reveal action is removed', async () => {
    const container = mount(`
      <metro-password-box reveal label="Passphrase"></metro-password-box>
      <button type="button">Outside</button>
    `);
    const password = container.querySelector('metro-password-box')!;
    password.value = 'fixture';
    const reveal = page.getByRole('button', { name: 'Show password while held' });
    await expect.element(reveal).toBeEnabled();
    const input = password.shadowRoot!.querySelector('input')!;
    password.focus();
    password.setSelectionRange(1, 4);
    await userEvent.tab();
    expect(password.shadowRoot?.activeElement).toBe(reveal.element());
    await userEvent.keyboard('{Enter>}');
    expect(input.type).toBe('text');

    password.reveal = false;
    await expect.element(reveal).not.toBeInTheDocument();
    expect(input.type).toBe('password');
    expect(password.shadowRoot?.activeElement).toBe(input);
    expect([input.selectionStart, input.selectionEnd]).toEqual([1, 4]);
    await userEvent.keyboard('{/Enter}');

    password.reveal = true;
    await expect.element(reveal).toBeEnabled();
    (reveal.element() as HTMLButtonElement).focus();
    const outside = page.getByRole('button', { name: 'Outside' });
    (outside.element() as HTMLButtonElement).focus();
    password.reveal = false;
    await expect.element(reveal).not.toBeInTheDocument();
    await expect.element(outside).toHaveFocus();
  });
});
