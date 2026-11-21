import { MetroBackScope } from '../../dist/metro-ui.js';
import { reportStore } from './report-store.js';

const initialReport = { summary: 'Shipping inspection', date: '2028-02-29' };

export function mountSurveyForm(store = reportStore) {
  const frame = document.querySelector('#frame');
  const form = document.querySelector('#report');
  const fields = document.querySelector('#fields');
  const summary = document.querySelector('#summary');
  const date = document.querySelector('#date');
  const summaryError = document.querySelector('#summary-error');
  const dialog = document.querySelector('#leave');
  const open = document.querySelector('#open');
  const overviewStatus = document.querySelector('#overview-status');
  const formStatus = document.querySelector('#form-status');
  const formError = document.querySelector('#form-error');
  const leaveStatus = document.querySelector('#leave-status');
  const leaveError = document.querySelector('#leave-error');
  const saveAndLeave = document.querySelector('#save-leave');
  const buttons = ['#save', '#stay', '#discard', '#save-leave'].map(id => document.querySelector(id));
  const indicators = ['#form-progress', '#leave-progress'].map(id => document.querySelector(id));
  let saved = initialReport;
  let pending = false;
  let continueBack = false;
  let showValidation = false;

  const draft = () => ({ summary: summary.value, date: date.value });
  const dirty = () => summary.value !== saved.summary || date.value !== saved.date;

  function loadDraft() {
    summary.value = saved.summary;
    date.value = saved.date;
    showValidation = false;
    markSummary();
    formStatus.textContent = '';
    formError.hidden = true;
  }

  function markSummary() {
    const missing = showValidation && !summary.value.trim();
    summary.setCustomValidity(missing ? 'Enter a title for the report.' : '');
    summaryError.hidden = !missing;
    summaryError.textContent = missing ? summary.validationMessage : '';
    if (missing) summary.setAttribute('aria-invalid', 'true');
    else summary.removeAttribute('aria-invalid');
  }

  function showPending(active) {
    pending = active;
    fields.disabled = active;
    buttons.forEach(button => { button.disabled = active; });
    indicators.forEach(indicator => { indicator.hidden = !active; });
    form.setAttribute('aria-busy', String(active));
    leaveStatus.hidden = !active;
    formStatus.textContent = active ? 'Saving the report…' : '';
  }

  async function save() {
    if (pending) return;
    showValidation = true;
    markSummary();
    if (!form.checkValidity()) {
      if (dialog.open) dialog.close('stay');
      if (!summary.validity.valid) {
        summary.focus({ preventScroll: true });
        summary.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' });
      } else {
        form.reportValidity();
      }
      return;
    }
    const destination = continueBack;
    const snapshot = draft();
    formError.hidden = true;
    leaveError.hidden = true;
    showPending(true);
    try {
      await store.save(snapshot);
    } catch {
      showPending(false);
      if (destination && dialog.open) {
        leaveError.hidden = false;
        saveAndLeave.textContent = 'Retry save and leave';
        saveAndLeave.focus();
      } else {
        formError.hidden = false;
      }
      return;
    }
    saved = snapshot;
    showPending(false);
    formStatus.textContent = 'Report saved on this device.';
    overviewStatus.textContent = 'Report saved on this device.';
    if (!destination || !continueBack || frame.value !== 'editor') return;
    continueBack = false;
    dialog.close('saved');
    frame.back();
  }

  const back = new MetroBackScope({
    mode() {
      if (pending) return 'blocked';
      if (dialog.open) return dialog.close('stay') ? 'handled' : 'blocked';
      if (date.pickerOpen) return date.closePicker() ? 'handled' : 'blocked';
      return 'pass';
    },
    navigation() {
      if (!frame.canGoBack) return 'pass';
      return frame.back() ? 'handled' : 'blocked';
    },
  });

  frame.addEventListener('metro-before-navigate', event => {
    if (event.detail.from?.value !== 'editor' || (!pending && !dirty())) return;
    event.preventDefault();
    if (pending || dialog.open || event.detail.direction !== 'back') return;
    continueBack = true;
    leaveError.hidden = true;
    saveAndLeave.textContent = 'Save and leave';
    dialog.show();
  });
  dialog.addEventListener('metro-before-close', event => {
    if (event.target === dialog && pending) event.preventDefault();
  });
  dialog.addEventListener('metro-close', event => {
    if (event.target !== dialog) return;
    const discard = continueBack && event.detail.value === 'discard';
    continueBack = false;
    if (!discard) return;
    loadDraft();
    frame.back();
  });

  open.addEventListener('click', () => {
    loadDraft();
    open.focus({ preventScroll: true });
    frame.navigate('editor');
  });
  document.querySelector('#back').addEventListener('click', () => { void back.requestBack(); });
  document.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' || !event.altKey || event.ctrlKey || event.metaKey
      || event.shiftKey || event.isComposing || frame.value !== 'editor') return;
    event.preventDefault();
    event.stopPropagation();
    if (!event.repeat) void back.requestBack();
  }, { capture: true });
  summary.addEventListener('input', markSummary);
  form.addEventListener('submit', event => {
    event.preventDefault();
    void save();
  });
  saveAndLeave.addEventListener('click', () => { void save(); });

  void Promise.resolve().then(() => store.load()).then(report => {
    if (typeof report?.summary === 'string' && typeof report.date === 'string') saved = report;
  }).catch(() => {
    overviewStatus.textContent = 'The previous report could not be loaded.';
  }).finally(() => { open.disabled = false; });
}
