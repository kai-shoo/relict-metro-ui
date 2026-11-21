const tabs = document.querySelector('#documents');
const confirmation = document.querySelector('#confirm');
const channel = 'metro-workspace-notebook';

tabs.addEventListener('metro-before-tab-close', (event) => {
  if (!event.detail.session?.draft) return;
  event.detail.waitUntil(new Promise((resolve) => {
    confirmation.addEventListener('metro-close', (closed) => resolve(closed.detail.value === 'close'), { once: true });
    confirmation.show();
  }));
});

if (document.documentElement.hasAttribute('data-detached')) {
  tabs.addEventListener('metro-tab-close', () => {
    document.querySelector('#return').disabled = true;
    window.opener?.postMessage({ channel, action: 'discard' }, location.origin);
  });
  document.querySelector('#return').addEventListener('click', () => {
    window.opener?.postMessage({ channel, action: 'return' }, location.origin);
  });
  window.opener?.postMessage({ channel, action: 'ready' }, location.origin);
} else {
  startWorkspace();
}

function notebookFor(owner, session) {
  const tab = owner.createElement('metro-tab-view-item');
  tab.value = 'notebook';
  tab.label = 'Блокнот';
  tab.closable = true;
  tab.session = session;
  const field = owner.createElement('metro-text-box');
  field.label = 'Черновик блокнота';
  field.dataset.metroFocus = 'notebook-draft';
  field.multiline = true;
  field.value = session.draft;
  field.addEventListener('input', () => { session.draft = field.value; });
  tab.append(field);
  return tab;
}

function startWorkspace() {
  const projects = document.querySelector('#projects');
  const projectTitle = document.querySelector('#project-title');
  const date = document.querySelector('#project-date');
  const notes = document.querySelector('#project-notes');
  const records = {
    north: { title: 'Северный маршрут', date: '', notes: '' },
    garden: { title: 'Городской сад', date: '', notes: '' },
  };
  const list = projects.querySelector('[slot="list"]');
  list.addEventListener('click', (event) => {
    const button = event.target.closest('[data-metro-focus]');
    if (button) projects.showDetails(button.dataset.metroFocus, button);
  });
  projects.addEventListener('metro-details-change', ({ detail }) => {
    for (const button of list.querySelectorAll('[data-metro-focus]')) {
      if (button.dataset.metroFocus === detail.value) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    }
    const record = records[detail.value];
    if (!record) return;
    projectTitle.textContent = record.title;
    date.value = record.date;
    notes.value = record.notes;
  });
  date.addEventListener('change', () => { records[projects.value].date = date.value; });
  notes.addEventListener('input', () => { records[projects.value].notes = notes.value; });

  const notebook = { draft: '' };
  const detach = document.querySelector('#detach');
  const notice = document.querySelector('#notice');
  tabs.append(notebookFor(document, notebook));
  tabs.addEventListener('metro-tab-close', () => { detach.disabled = true; });
  let detached;
  let remoteView;
  let monitor;

  const notebookAdapter = (owner, peers) => ({
    peers,
    canReceive: ({ value }) => value === 'notebook',
    createItem: ({ session }) => notebookFor(owner, session),
  });
  tabs.dragAdapter = notebookAdapter(document, () => remoteView ? [remoteView] : []);

  function stopMonitoring() {
    window.clearInterval(monitor);
    monitor = undefined;
  }

  function watchWindow(popup) {
    stopMonitoring();
    monitor = window.setInterval(() => {
      if (!popup.closed) return;
      stopMonitoring();
      detached = undefined;
      remoteView = undefined;
      if (!tabs.querySelector('metro-tab-view-item[value="notebook"]')) {
        const replacement = notebookFor(document, notebook);
        tabs.append(replacement);
        tabs.value = 'notebook';
        void tabs.updateComplete.then(() => replacement.restoreFocus('notebook-draft'));
      }
      detach.disabled = false;
      notice.textContent = 'Окно закрыто. Черновик возвращён в рабочую область.';
      notice.hidden = false;
    }, 300);
  }

  function prepareWindow() {
    const popup = window.open('./detached.html', 'metro-workspace-notebook', 'popup,width=560,height=540');
    if (!popup) {
      notice.textContent = 'Браузер заблокировал новое окно.';
      notice.hidden = false;
      return null;
    }
    detached = popup;
    detach.disabled = true;
    const destination = readyNotebook(popup).then(target => {
      if (!target) return null;
      remoteView = target;
      target.dragAdapter = notebookAdapter(target.ownerDocument, () => [tabs]);
      return { target, item: notebookFor(target.ownerDocument, notebook) };
    });
    return { popup, destination };
  }

  async function finishOpening(popup, transfer) {
    const moved = await transfer;
    detach.disabled = false;
    notice.textContent = moved ? 'Блокнот открыт в новом окне.' : 'Блокнот остался в рабочей области.';
    notice.hidden = false;
    if (moved) watchWindow(popup);
    else {
      popup.close();
      detached = undefined;
      remoteView = undefined;
    }
  }

  detach.addEventListener('click', () => {
    if (detached && !detached.closed) {
      detached.focus();
      return;
    }
    const windowRequest = prepareWindow();
    if (!windowRequest) return;
    const { popup, destination } = windowRequest;
    void finishOpening(popup, tabs.transferTab('notebook', () => destination));
  });

  tabs.addEventListener('metro-tab-detach-request', event => {
    if (event.detail.from !== tabs || event.detail.value !== 'notebook' || (detached && !detached.closed)) return;
    const windowRequest = prepareWindow();
    if (windowRequest) void finishOpening(windowRequest.popup, event.detail.accept(windowRequest.destination));
  });

  tabs.addEventListener('metro-tab-transferred', event => {
    if (event.detail.to !== tabs || event.detail.from !== remoteView) return;
    const popup = detached;
    stopMonitoring();
    detached = undefined;
    remoteView = undefined;
    notice.hidden = true;
    void tabs.updateComplete.then(() => popup?.close());
  });

  window.addEventListener('message', async (event) => {
    if (event.origin !== location.origin || event.source !== detached
      || event.data?.channel !== channel) return;
    if (event.data.action === 'discard') {
      stopMonitoring();
      detach.disabled = true;
      notice.textContent = 'Блокнот закрыт.';
      notice.hidden = false;
      return;
    }
    if (event.data.action !== 'return') return;
    await remoteView?.transferTab('notebook', { target: tabs, item: notebookFor(document, notebook) });
  });
}

function readyNotebook(target) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => finish(null), 5000);
    function finish(view) {
      window.removeEventListener('message', receive);
      clearTimeout(timeout);
      resolve(view);
    }
    function receive(event) {
      if (event.origin === location.origin && event.source === target
        && event.data?.channel === channel && event.data.action === 'ready') {
        try { finish(target.document.querySelector('#documents')); }
        catch { finish(null); }
      }
    }
    window.addEventListener('message', receive);
  });
}
