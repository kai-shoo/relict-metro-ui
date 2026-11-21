import { MetroFormViewport } from '../../dist/metro-ui.js';

const viewport = new MetroFormViewport();
const workspace = document.querySelector('#workspace');
const frame = document.querySelector('#frame');
const form = document.querySelector('#editor');
const fields = document.querySelector('#fields');
const website = document.querySelector('#website');
const savedStatus = document.querySelector('#saved');
const back = document.querySelector('#back');
const more = document.querySelector('#more');
const menu = document.querySelector('#menu');
const leave = document.querySelector('#leave');
let lastField = website;
let saved = readFields();
let leaving = false;

function readFields() {
  return new URLSearchParams(new FormData(form)).toString();
}

function explain(field) {
  const error = document.getElementById(`${field.id}-error`);
  if (!error) return;
  const invalid = !field.validity.valid;
  error.textContent = invalid ? field.validationMessage : '';
  error.hidden = !invalid;
  if (invalid) {
    field.setAttribute('aria-invalid', 'true');
    field.setAttribute('aria-describedby', error.id);
  } else {
    field.removeAttribute('aria-invalid');
    field.removeAttribute('aria-describedby');
  }
}

function keepActiveFieldVisible() {
  const field = document.activeElement;
  const group = field?.closest('.field');
  if (!group || !fields.contains(group)) return;
  const area = fields.getBoundingClientRect();
  const bounds = group.getBoundingClientRect();
  const target = bounds.height + 12 <= area.height ? bounds : field.getBoundingClientRect();
  if (target.top < area.top + 6) fields.scrollTop += target.top - area.top - 6;
  else if (target.bottom > area.bottom - 6) fields.scrollTop += target.bottom - area.bottom + 6;
}

function layout({ visible, usable }) {
  workspace.style.setProperty('--visible-x', `${visible.x}px`);
  workspace.style.setProperty('--visible-y', `${visible.y}px`);
  workspace.style.setProperty('--visible-width', `${visible.width}px`);
  workspace.style.setProperty('--usable-height', `${usable.height}px`);
  keepActiveFieldVisible();
}

viewport.addEventListener('change', event => layout(event.detail));
layout(viewport.snapshot);
window.addEventListener('pagehide', event => {
  if (!event.persisted) viewport.dispose();
});

document.querySelector('#edit').addEventListener('click', () => {
  if (!frame.navigate('editor')) return;
  requestAnimationFrame(() => {
    if (frame.value === 'editor') lastField.focus({ preventScroll: true });
  });
});

fields.addEventListener('focusin', event => {
  lastField = event.target;
  keepActiveFieldVisible();
});
fields.addEventListener('input', event => {
  if (event.target.hasAttribute('aria-invalid')) explain(event.target);
  keepActiveFieldVisible();
});

form.addEventListener('submit', event => {
  event.preventDefault();
  if (!form.checkValidity()) {
    for (const field of form.querySelectorAll('input')) explain(field);
    form.querySelector(':invalid').focus({ preventScroll: true });
    keepActiveFieldVisible();
    return;
  }
  saved = readFields();
  savedStatus.textContent = 'Contact saved for this visit.';
  frame.back();
});

menu.commands = [{ id: 'clear-website', label: 'Clear website' }];
more.addEventListener('click', () => {
  menu.show(more);
  more.setAttribute('aria-expanded', 'true');
});
menu.addEventListener('metro-close', () => more.setAttribute('aria-expanded', 'false'));
menu.addEventListener('metro-command', event => {
  if (event.detail.id !== 'clear-website') return;
  website.value = '';
  explain(website);
});

function requestBack() {
  if (leave.open) {
    leave.close('stay');
  } else if (menu.open) {
    menu.close();
  } else if (!viewport.handleBack()) {
    frame.back();
  }
}

back.addEventListener('pointerdown', event => {
  // Keep the native editor focused while a pointer asks the keyboard to hide.
  if (event.isPrimary && event.button === 0 && viewport.canHandleBack
    && fields.contains(document.activeElement)) event.preventDefault();
});
back.addEventListener('click', requestBack);
frame.addEventListener('metro-before-navigate', event => {
  if (event.detail.direction !== 'back' || event.detail.from?.value !== 'editor'
    || leaving || readFields() === saved) return;
  event.preventDefault();
  leave.returnValue = 'stay';
  leave.showModal();
});
leave.addEventListener('close', () => {
  if (leave.returnValue === 'leave') {
    leaving = true;
    frame.back();
    leaving = false;
  } else {
    lastField.focus({ preventScroll: true });
  }
});
