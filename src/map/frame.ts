import type { FeatureCollection } from 'geojson';
import type { Map as MapLibre, PaddingOptions } from 'maplibre-gl';

const GAP = 16;
type Padding = Required<PaddingOptions>;
const NONE: Padding = { top: 0, bottom: 0, left: 0, right: 0 };

// MapLibre keeps the camera 1.5 viewport heights above the surface (its default
// field of view), so the visible disc is a little smaller than the sphere itself.
const cameraDistance = (viewportHeight: number) => viewportHeight * 1.5;

const sphereRadius = (zoom: number, latitude: number) =>
  (512 * 2 ** zoom) / (2 * Math.PI * Math.cos((latitude * Math.PI) / 180));

// Radius in pixels of the globe as it appears on screen.
export function globeRadius(zoom: number, latitude: number, viewportHeight: number): number {
  const r = sphereRadius(zoom, latitude);
  const c = cameraDistance(viewportHeight);
  return r * Math.sqrt(c / (c + 2 * r));
}

// The zoom at which the globe appears with the given diameter.
export function zoomForDiameter(diameter: number, latitude: number, viewportHeight: number): number {
  const s = diameter / 2;
  const c = cameraDistance(viewportHeight);
  const r = (s * s + Math.sqrt(s ** 4 + s * s * c * c)) / c;
  return Math.log2((r * 2 * Math.PI * Math.cos((latitude * Math.PI) / 180)) / 512);
}

type Edge = 'top' | 'bottom' | 'left' | 'right';

// True when the element, or something it sits in, is taken out of the page flow
// and so can cover the map.
function liesOver(el: HTMLElement): boolean {
  for (let node: HTMLElement | null = el; node && node !== document.body; node = node.parentElement) {
    const { position } = getComputedStyle(node);
    if (position === 'absolute' || position === 'fixed') return true;
    if (node.classList.contains('stage') || node.classList.contains('app')) return false;
  }
  return false;
}

// Surfaces that lie over the map say which edge they sit on with `data-frame`.
function measure(map: MapLibre): Padding {
  const box = map.getContainer().getBoundingClientRect();
  const padding = { ...NONE };
  for (const el of document.querySelectorAll<HTMLElement>('[data-frame]')) {
    if (!liesOver(el)) continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    if (rect.right <= box.left || rect.left >= box.right) continue;
    if (rect.bottom <= box.top || rect.top >= box.bottom) continue;
    const edge = el.dataset.frame as Edge;
    const reach = {
      top: rect.bottom - box.top,
      bottom: box.bottom - rect.top,
      left: rect.right - box.left,
      right: box.right - rect.left,
    }[edge];
    padding[edge] = Math.max(padding[edge], reach + GAP);
  }
  return padding;
}

export interface Frame {
  padding: Padding;
  // Set when the globe has a fixed place to look at, as on the start screen.
  center?: [number, number];
  // The zoom that fits at a latitude. The globe grows towards the poles at the same zoom.
  zoomAt: (latitude: number) => number;
}

// How much of the free space the globe fills. The rest is room for its ring.
const FILL = 0.9;
const START_CENTER: [number, number] = [48, 12];

// The start screen: a very large globe rises from the bottom edge. The map keeps
// its size, so the globe can glide from here to its place.
function startFrame(top: number, width: number, height: number): Frame {
  const crown = top + 30;
  const visible = Math.max(height - crown, 120);
  // The map cannot put its centre below its own bottom edge, so at most half shows.
  const diameter = Math.min(visible * 2, width * 1.5);
  const centre = crown + diameter / 2;
  return {
    padding: { top: Math.max(0, 2 * centre - height), bottom: 0, left: 0, right: 0 },
    center: START_CENTER,
    zoomAt: (latitude) => zoomForDiameter(diameter, latitude, height),
  };
}

// Where the globe sits and how large it is: as large as the space that the
// header, the footer and the two pages leave, and on the centre line of the page.
export function frame(map: MapLibre, started: boolean): Frame {
  const { clientWidth: width, clientHeight: height } = map.getContainer();
  const padding = measure(map);
  if (!started) return startFrame(padding.top, width, height);

  const side = Math.max(padding.left, padding.right);
  if (width - 2 * side >= 240) padding.left = padding.right = side;

  const freeWidth = Math.max(width - padding.left - padding.right, 200);
  const freeHeight = Math.max(height - padding.top - padding.bottom, 200);
  const diameter = Math.min(freeWidth, freeHeight) * FILL;
  return { padding, zoomAt: (latitude) => zoomForDiameter(diameter, latitude, height) };
}

// Lines of latitude and longitude.
export function graticule(step = 20): FeatureCollection {
  const features: FeatureCollection['features'] = [];
  const line = (coordinates: [number, number][]) =>
    features.push({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates } });
  for (let lon = -180; lon < 180; lon += step) {
    const points: [number, number][] = [];
    for (let lat = -80; lat <= 80; lat += 4) points.push([lon, lat]);
    line(points);
  }
  for (let lat = -80; lat <= 80; lat += step) {
    const points: [number, number][] = [];
    for (let lon = -180; lon <= 180; lon += 4) points.push([lon, lat]);
    line(points);
  }
  return { type: 'FeatureCollection', features };
}
