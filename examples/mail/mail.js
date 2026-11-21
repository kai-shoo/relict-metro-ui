await Promise.all([
  customElements.whenDefined("metro-pivot"),
  customElements.whenDefined("metro-command-bar"),
]);

const pivot = document.querySelector("#mail-pivot");
const commands = document.querySelector("#mail-commands");
const folderView = document.querySelector("#folder-view");
const messageView = document.querySelector("#message-view");
const footer = document.querySelector("#mail-footer");
const status = document.querySelector("#mail-status");
const heading = document.querySelector("#message-title");
const messageBack = document.querySelector("[data-mail-back]");
const rowTemplate = document.querySelector("#message-row");
const folders = new Map([...pivot.querySelectorAll("[data-mail-list]")].map((list) => [
  list.dataset.mailList,
  { list, name: list.closest("metro-pivot-item").getAttribute("label"), oldestFirst: false },
]));

// This sample keeps its messages in memory. A real app can use the same stable IDs from its data source.
const messages = [
  ["radio-check", "Iris Calder", "Radio check at 08:30", "Let's test the relay from the loading yard before setting off.", true],
  ["lane-closure", "Cedar Workshop", "West lane access", "The west lane will be closed until the delivery crew clears the gate.", true],
  ["route-revision", "Mika Reed", "Revised trail route", "Use the gravel path after the second bridge. The lower section is soft after rain.", true],
  ["equipment", "Nora Bell", "Equipment on the north shelf", "The receivers and three spare battery packs are together in the grey pouch.", true],
  ["wind-notes", "Emil Voss", "Wind readings for the valley", "Conditions settled overnight. The strongest readings were just east of the marker.", true],
  ["map-proof", "Cedar Workshop", "Final map proof", "The map proof is ready. Could you check the route numbers along the western edge?", true],
  ["ridge-signal", "Iris Calder", "Ridge signal check", "I have the portable relay. Meet at the cedar gate before we head to the ridge.", true],
  ["trail-markers", "Nora Bell", "Trail markers collected", "I picked up the spare markers and put them beside the equipment log.", true],
  ["field-lunch", "Mika Reed", "Lunch pickup", "I can pick up lunch on the way. Let me know if you're meeting us at the station.", true],
  ["survey-maps", "Emil Voss", "Survey maps are in the drawer", "The printed maps are under the clipboard. Take one with the blue stamp.", true],
  ["gate-code", "Cedar Workshop", "Key at the front desk", "The front desk will have a key with a yellow tag until the workshop closes.", true],
  ["water-level", "Nora Bell", "Water level at the basin", "The north side is still passable. We'll check the boardwalk again tomorrow.", true],
  ["shift-notes", "Mika Reed", "Morning shift notes", "We left the measuring poles at the station so the morning team can collect them."],
  ["tool-hire", "Cedar Workshop", "Tool hire receipt", "Here is the receipt for the hand drill and the extra case we used on Tuesday."],
  ["roof-clear", "Emil Voss", "Roof clear for inspection", "The roof is clear. Please check in at the office before moving the ladder."],
  ["lantern-box", "Iris Calder", "Lanterns returned", "All four lanterns are back in their crate and ready for the next evening shift.", false, true],
  ["bridge-map", "Nora Bell", "Bridge site sketches", "The sketches are now filed with the completed bridge survey.", false, true],
  ["desk-visit", "Cedar Workshop", "Desk visit confirmed", "The volunteer desk confirmed the appointment and sent the entry instructions.", false, true],
  ["station-log", "Mika Reed", "Station log signed", "The last readings are in the log and the enclosure is locked.", false, true],
  ["van-return", "Emil Voss", "Van returned", "I parked the van in the west bay and put the keys in the office locker.", false, true],
  ["frost-review", "Iris Calder", "First frost review", "The review is complete. We'll keep the stations open through the weekend.", false, true],
  ["new-tags", "Cedar Workshop", "Tag shipment closed", "The replacement tags arrived and were counted this morning.", false, true],
  ["old-relay", "Nora Bell", "Old relay and spares", "We donated the old relay with its spare casing and charger.", false, true],
].map(([id, sender, subject, preview, flagged = false, archived = false], index) => ({
  id,
  sender,
  subject,
  preview,
  flagged,
  archived,
  unread: index % 3 === 0,
  date: new Date(Date.UTC(2026, 3, 18 - index, 8, 30)),
}));

const dates = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });
const scrollByFolder = new Map();
let viewRevision = 0;
history.scrollRestoration = "manual";

function entriesFor(folder) {
  const entries = messages.filter((message) => {
    if (folder === "archive") return message.archived;
    return !message.archived && (folder === "inbox" || message.flagged);
  });
  return folders.get(folder).oldestFirst ? entries.reverse() : entries;
}

function findLink(folder, id) {
  return [...folders.get(folder).list.querySelectorAll("[data-message-id]")]
    .find((link) => link.dataset.messageId === id);
}

function folderFrom(value) {
  return folders.has(value) ? value : "inbox";
}

function routeURL(folder, id) {
  const url = new URL(location.href);
  if (folder === "inbox") url.searchParams.delete("folder");
  else url.searchParams.set("folder", folder);
  if (id) url.searchParams.set("message", id);
  else url.searchParams.delete("message");
  return url;
}

function showDate(element, date) {
  element.dateTime = date.toISOString();
  element.textContent = dates.format(date);
}

function nameMessage(link, message) {
  link.toggleAttribute("data-unread", message.unread);
  link.querySelector(".unread-status").hidden = !message.unread;
}

function renderFolders() {
  for (const [folder, { list }] of folders) {
    const entries = entriesFor(folder);
    const rows = entries.map((message) => {
      const row = rowTemplate.content.cloneNode(true);
      const link = row.querySelector("a");
      link.dataset.messageId = message.id;
      link.href = routeURL(folder, message.id);
      nameMessage(link, message);
      row.querySelector(".message-from").textContent = message.sender;
      row.querySelector(".message-subject").textContent = message.subject;
      row.querySelector(".message-preview").textContent = message.preview;
      showDate(row.querySelector("time"), message.date);
      return row;
    });
    list.querySelector("ul").replaceChildren(...rows);
    list.querySelector(".empty-message").hidden = entries.length > 0;
  }
}

function updateCommands(folder) {
  const { name, oldestFirst } = folders.get(folder);
  const entries = entriesFor(folder);
  const contextual = {
    inbox: { id: "archive-read", label: "Archive read messages", disabled: !entries.some((message) => !message.unread) },
    flagged: { id: "clear-flags", label: "Clear these flags", disabled: entries.length === 0 },
    archive: { id: "restore-unread", label: "Restore unread to Inbox", disabled: !entries.some((message) => message.unread) },
  }[folder];

  commands.label = `${name} actions`;
  commands.commands = [
    { id: "next-unread", label: "Open first unread", icon: "↗", disabled: !entries.some((message) => message.unread) },
    { id: "sort", label: oldestFirst ? "Newest first" : "Oldest first", icon: "⇅", disabled: entries.length < 2 },
    { id: "mark-read", label: "Mark folder as read", placement: "secondary", disabled: !entries.some((message) => message.unread) },
    { ...contextual, placement: "secondary" },
  ];
}

function restoreList(folder, scrollTop, focusId, returnFocus = false) {
  const revision = ++viewRevision;
  requestAnimationFrame(() => {
    if (revision !== viewRevision) return;
    const { list } = folders.get(folder);
    list.scrollTop = scrollTop;
    if (returnFocus) {
      const target = findLink(folder, focusId) ?? list.querySelector("[data-message-id]") ?? document.querySelector("#mail-title");
      target.focus({ preventScroll: true });
    }
  });
}

function showRoute(moveFocus = false) {
  const params = new URL(location.href).searchParams;
  const folder = folderFrom(params.get("folder"));
  const message = messages.find(({ id }) => id === params.get("message"));
  commands.open = false;
  status.textContent = "";
  folderView.hidden = Boolean(message);
  footer.hidden = Boolean(message);
  messageView.hidden = !message;
  pivot.value = folder;

  if (message) {
    ++viewRevision;
    message.unread = false;
    for (const key of folders.keys()) {
      const link = findLink(key, message.id);
      if (link) nameMessage(link, message);
    }
    heading.textContent = message.subject;
    document.querySelector("#message-sender").textContent = message.sender;
    showDate(document.querySelector("#message-date"), message.date);
    const body = document.createElement("p");
    body.textContent = message.preview;
    document.querySelector("#message-body").replaceChildren(body);
    messageView.scrollTop = 0;
    if (moveFocus) heading.focus({ preventScroll: true });
    return;
  }

  updateCommands(folder);
  const snapshot = history.state?.dispatchMail;
  const restore = snapshot?.folder === folder ? snapshot : undefined;
  restoreList(folder, restore?.scrollTop ?? scrollByFolder.get(folder) ?? 0, restore?.focusId, moveFocus);
}

function openMessage(folder, id) {
  const scrollTop = folders.get(folder).list.scrollTop;
  scrollByFolder.set(folder, scrollTop);
  history.replaceState({ dispatchMail: { folder, scrollTop, focusId: id } }, "", routeURL(folder));
  history.pushState({ dispatchMail: { previousList: true } }, "", routeURL(folder, id));
  showRoute(true);
}

for (const [folder, { list }] of folders) {
  list.addEventListener("scroll", () => {
    if (!folderView.hidden && pivot.value === folder) scrollByFolder.set(folder, list.scrollTop);
  });
  list.addEventListener("click", (event) => {
    const link = event.target.closest("[data-message-id]");
    if (!link || event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    openMessage(folder, link.dataset.messageId);
  });
}

pivot.addEventListener("metro-change", (event) => {
  if (event.target !== pivot) return;
  const folder = event.detail.value;
  const scrollTop = scrollByFolder.get(folder) ?? 0;
  history.replaceState({ dispatchMail: { folder, scrollTop } }, "", routeURL(folder));
  commands.open = false;
  status.textContent = "";
  updateCommands(folder);
  restoreList(folder, scrollTop);
});

commands.addEventListener("metro-command", ({ detail: { id } }) => {
  const folder = folderFrom(pivot.value);
  const entries = entriesFor(folder);
  const { list, name } = folders.get(folder);
  const scrollTop = list.scrollTop;
  if (id === "next-unread") {
    const message = entries.find(({ unread }) => unread);
    if (message) {
      findLink(folder, message.id)?.scrollIntoView({ block: "nearest" });
      openMessage(folder, message.id);
    }
    return;
  }

  switch (id) {
    case "sort":
      folders.get(folder).oldestFirst = !folders.get(folder).oldestFirst;
      status.textContent = folders.get(folder).oldestFirst ? "Oldest messages first." : "Newest messages first.";
      break;
    case "mark-read":
      for (const message of entries) message.unread = false;
      status.textContent = `${name} marked as read.`;
      break;
    case "archive-read":
      for (const message of entries) if (!message.unread) message.archived = true;
      status.textContent = "Read messages moved to Archive.";
      break;
    case "clear-flags":
      for (const message of entries) message.flagged = false;
      status.textContent = "Flags cleared.";
      break;
    case "restore-unread":
      for (const message of entries) if (message.unread) message.archived = false;
      status.textContent = "Unread messages restored to Inbox.";
      break;
    default:
      return;
  }

  renderFolders();
  updateCommands(folder);
  restoreList(folder, id === "sort" ? 0 : scrollTop);
});

messageBack.addEventListener("click", () => {
  if (history.state?.dispatchMail?.previousList) {
    history.back();
    return;
  }
  const folder = folderFrom(new URL(location.href).searchParams.get("folder"));
  history.replaceState({ dispatchMail: { folder } }, "", routeURL(folder));
  showRoute(true);
});

window.addEventListener("popstate", () => showRoute(true));
const landscape = matchMedia('(orientation: landscape) and (max-height: 32rem)');
function placeBar() { commands.orientation = landscape.matches ? 'vertical' : 'horizontal'; }
landscape.addEventListener('change', placeBar);
placeBar();
renderFolders();
showRoute();
