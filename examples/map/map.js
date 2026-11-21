import '../../dist/metro-ui.js';

const frame = document.querySelector('#frame');
const hub = document.querySelector('#hub');
const map = document.querySelector('#places-map');
const openMap = document.querySelector('#open-map');
const openPlace = document.querySelector('#open-place');
const status = document.querySelector('#location-status');

const initialView = { latitude: 51.505, longitude: -0.095, zoom: 14 };
map.view = initialView;
map.markers = [
  { id: 'library', label: 'Riverside library', latitude: 51.503, longitude: -0.091,
    description: 'Enter through the courtyard.' },
  { id: 'market', label: 'Market square', latitude: 51.51, longitude: -0.105,
    description: 'The Saturday market opens at nine.' },
];
let locationRequest = 0;

function selectedMarker() {
  return map.markers.find(marker => marker.id === map.selected);
}

function updateSummary() {
  const marker = selectedMarker();
  document.querySelector('#summary').hidden = !marker;
  document.querySelector('#summary-title').textContent = marker?.label ?? '';
  document.querySelector('#summary-description').textContent = marker?.description ?? '';
}

openMap.addEventListener('click', () => {
  openMap.focus({ preventScroll: true });
  frame.saveState({ section: hub.value });
  frame.navigate('map', { state: { view: initialView, selected: '' } });
});

map.addEventListener('metro-map-select', updateSummary);
openPlace.addEventListener('click', () => {
  const marker = selectedMarker();
  if (!marker) return;
  openPlace.focus({ preventScroll: true });
  frame.saveState({ view: map.view, selected: marker.id });
  document.querySelector('#place-page').label = marker.label;
  document.querySelector('#place-description').textContent = marker.description;
  frame.navigate('place', { params: { id: marker.id } });
});

frame.addEventListener('metro-navigate', event => {
  const { from, to, direction } = event.detail;
  if (from?.value === 'map') {
    locationRequest++;
    status.textContent = '';
  }
  if (to.value === 'hub') hub.value = to.state?.section ?? 'nearby';
  if (to.value !== 'map') return;
  map.view = to.state?.view ?? initialView;
  const selected = to.state?.selected ?? '';
  map.selected = map.markers.some(marker => marker.id === selected) ? selected : '';
  updateSummary();
  if (direction === 'back' && selected && !map.selected) {
    requestAnimationFrame(() => { if (frame.value === 'map') map.focusSelectedMarker(); });
  }
});

document.querySelectorAll('[data-back]').forEach(button => button.addEventListener('click', () => frame.back()));

map.addEventListener('metro-map-locate', () => {
  const request = ++locationRequest;
  const current = () => request === locationRequest && frame.value === 'map';
  const unavailable = () => {
    if (!current()) return;
    map.userLocation = null;
    status.textContent = 'Location unavailable. Browse the map or choose a place.';
  };
  if (!navigator.geolocation) { unavailable(); return; }
  status.textContent = 'Looking for your location.';
  navigator.geolocation.getCurrentPosition(({ coords }) => {
    if (!current()) return;
    const { latitude, longitude, accuracy } = coords;
    map.userLocation = { latitude, longitude, accuracy, label: 'Your location' };
    map.view = { latitude, longitude, zoom: map.zoom };
    status.textContent = '';
  }, unavailable, { timeout: 8000 });
});
