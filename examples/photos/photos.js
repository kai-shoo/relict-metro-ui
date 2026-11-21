import "../../dist/metro-ui.js";

const sections = [
  { id: "collection", label: "Коллекция" },
  { id: "albums", label: "Альбомы" },
];

const albums = [
  { id: "north", title: "На севере" },
  { id: "city", title: "В городе" },
];

const photos = [
  { id: "coast", title: "Маяк на мысе", album: "north", description: "Маяк на скалистом берегу на фоне бледного неба." },
  { id: "station", title: "Утренняя станция", album: "city", description: "Пустая платформа вдоль путей под высоким навесом." },
  { id: "lake", title: "Тихое озеро", album: "north", description: "Сосны на берегу отражаются в холодной воде." },
  { id: "garden", title: "Оранжерея", album: "city", description: "Высокие зелёные листья под стеклянной крышей." },
  { id: "pass", title: "Снежный перевал", album: "north", description: "Полоса снега между серыми вершинами." },
  { id: "bridge", title: "Мост в сумерках", album: "city", description: "Окна на дальнем берегу за тёмными арками моста." },
  { id: "dunes", title: "Дюны после дождя", album: "north", description: "Тёмные травы на песчаных холмах после дождя." },
  { id: "street", title: "Улица после дождя", album: "city", description: "Цветные фасады отражаются на мокрой мостовой." },
];

const frame = document.querySelector("#photos-frame");
const transition = document.querySelector("metro-navigation-transition");
const gallery = document.querySelector("#gallery");
const pivot = document.querySelector("#photo-pivot");
const menu = document.querySelector("#photo-menu");
const detail = document.querySelector("#photo-page");
const viewer = document.querySelector("#photo-image");
const description = document.querySelector("#photo-description");
const cardTemplate = document.querySelector("#photo-card");
const wide = matchMedia("(min-width: 48rem)");
const positions = new Map();
let section = "collection";
let displayedPhoto;
let focusedPhoto;
let restoreRevision = 0;

function routeURL(sectionId, photoId) {
  const url = new URL(location.href);
  if (sectionId === "collection") url.searchParams.delete("section");
  else url.searchParams.set("section", sectionId);
  if (photoId) url.searchParams.set("photo", photoId);
  else url.searchParams.delete("photo");
  return url;
}

function photoGrid(items, sectionId) {
  const list = document.createElement("ul");
  list.className = "photo-grid";
  list.setAttribute("role", "list");
  for (const photo of items) {
    const card = cardTemplate.content.cloneNode(true);
    const link = card.querySelector("a");
    link.href = routeURL(sectionId, photo.id);
    link.dataset.photo = photo.id;
    link.dataset.metroFocus = photo.id;
    card.querySelector("img").dataset.metroConnected = photo.id;
    card.querySelector("img").src = `./assets/${photo.id}.svg`;
    card.querySelector("span").textContent = photo.title;
    list.append(card);
  }
  return list;
}

function currentFeed() {
  return (wide.matches ? menu : pivot).querySelector(`[data-feed="${section}"]`);
}

function positionOf(feed, link) {
  const bounds = feed.getBoundingClientRect();
  const firstVisible = link ?? [...feed.querySelectorAll("[data-photo]")].find((card) => {
    const rect = card.getBoundingClientRect();
    return rect.bottom > bounds.top && rect.top < bounds.bottom;
  });
  return {
    id: firstVisible?.dataset.photo,
    offset: firstVisible ? firstVisible.getBoundingClientRect().top - bounds.top : 0,
    scrollTop: feed.scrollTop,
  };
}

async function restoreFeed(position, focusId) {
  const revision = ++restoreRevision;
  await Promise.all([frame.updateComplete, gallery.updateComplete, pivot.updateComplete, menu.updateComplete]);
  await new Promise((resolve) => requestAnimationFrame(resolve));
  if (revision !== restoreRevision || frame.value !== "gallery") return;

  const feed = currentFeed();
  const find = (id) => [...feed.querySelectorAll("[data-photo]")].find((link) => link.dataset.photo === id);
  const anchor = find(position?.id);
  // A card's row can move after a resize or a change in caption height.
  if (position && anchor) {
    feed.scrollTop += anchor.getBoundingClientRect().top - feed.getBoundingClientRect().top - position.offset;
  } else {
    feed.scrollTop = position?.scrollTop ?? 0;
  }
  if (!focusId) return;

  const link = find(focusId);
  if (!link) {
    gallery.focus({ preventScroll: true });
    return;
  }
  const bounds = feed.getBoundingClientRect();
  const rect = link.getBoundingClientRect();
  if (rect.top >= bounds.bottom || rect.bottom <= bounds.top) {
    feed.scrollTop += rect.top - bounds.top;
  }
  link.focus({ preventScroll: true });
}

function syncSelection() {
  pivot.value = section;
  menu.value = section;
  for (const feed of menu.querySelectorAll("[data-feed]")) feed.hidden = feed.dataset.feed !== section;
}

function chooseSection(id) {
  if (section === id || !sections.some((item) => item.id === id)) return;
  section = id;
  focusedPhoto = undefined;
  syncSelection();
  // Sections share the gallery visit. Opening a photo adds a visit.
  history.replaceState({ photos: {} }, "", routeURL(section));
  void restoreFeed(positions.get(section));
}

function showLocation(returnFocus = false) {
  const params = new URL(location.href).searchParams;
  section = sections.find(({ id }) => id === params.get("section"))?.id ?? "collection";
  const photo = photos.find(({ id }) => id === params.get("photo"));
  const entry = history.state?.photos;
  syncSelection();

  if (photo) {
    if (displayedPhoto !== photo.id) {
      transition.connectedKey = photo.id;
      viewer.dataset.metroConnected = photo.id;
      detail.label = photo.title;
      viewer.label = `Просмотр «${photo.title}»`;
      viewer.alt = photo.description;
      viewer.src = `./assets/${photo.id}.svg`;
      viewer.view = { zoom: 1, x: 0, y: 0 };
      description.textContent = `Альбом «${albums.find(({ id }) => id === photo.album).title}»`;
      displayedPhoto = photo.id;
    }
    if (frame.value !== "photo") {
      frame.saveState({ section, position: positions.get(section), focusId: photo.id });
      frame.navigate("photo", { params: { id: photo.id }, replace: !entry?.fromGallery });
    }
    return;
  }

  if (frame.value === "photo" && !frame.back()) frame.navigate("gallery", { replace: true });
  const saved = frame.visit?.state?.section === section ? frame.visit.state : undefined;
  void restoreFeed(entry?.position ?? saved?.position ?? positions.get(section),
    returnFocus ? entry?.focusId ?? saved?.focusId ?? displayedPhoto : undefined);
  displayedPhoto = undefined;
}

menu.items = sections.map((item) => ({ ...item, href: routeURL(item.id).href }));

for (const feed of gallery.querySelectorAll("[data-feed]")) {
  const id = feed.dataset.feed;
  if (id === "collection") feed.append(photoGrid(photos, id));
  else {
    for (const album of albums) {
      const heading = document.createElement("h2");
      heading.textContent = album.title;
      feed.append(heading, photoGrid(photos.filter((photo) => photo.album === album.id), id));
    }
  }

  feed.addEventListener("scroll", () => {
    if (frame.value === "gallery" && feed === currentFeed() && feed.clientWidth) {
      positions.set(section, positionOf(feed));
    }
  });

  feed.addEventListener("click", (event) => {
    const link = event.target.closest("[data-photo]");
    if (!link || event.defaultPrevented || event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    event.preventDefault();
    const focusId = link.dataset.photo;
    const position = positionOf(feed, link);
    positions.set(id, position);
    history.replaceState({ photos: { position, focusId } }, "", routeURL(id));
    history.pushState({ photos: { fromGallery: true } }, "", routeURL(id, focusId));
    showLocation();
  });
}

document.addEventListener("focusin", (event) => {
  focusedPhoto = event.target.closest("[data-photo]")?.dataset.photo;
});

pivot.addEventListener("metro-change", (event) => {
  if (event.target === pivot) chooseSection(event.detail.value);
});

menu.addEventListener("metro-navigation", (event) => {
  event.preventDefault();
  chooseSection(event.detail.id);
});

document.querySelector("#photo-back").addEventListener("click", () => {
  if (history.state?.photos?.fromGallery) history.back();
  else {
    history.replaceState({ photos: {} }, "", routeURL(section));
    showLocation(true);
  }
});

wide.addEventListener("change", () => {
  if (frame.value === "gallery") void restoreFeed(positions.get(section), focusedPhoto);
});
window.addEventListener("popstate", () => showLocation(true));

await frame.updateComplete;
showLocation();
