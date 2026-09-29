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
// `data-frame-shift` moves the globe's centre without making the globe smaller.
function measure(map: MapLibre, attribute: string): Padding {
  const box = map.getContainer().getBoundingClientRect();
  const padding = { ...NONE };
  for (const el of document.querySelectorAll<HTMLElement>(`[${attribute}]`)) {
    if (!liesOver(el)) continue;
    // A surface can opt out in the stylesheet, e.g. when it is meant to lie on the globe.
    if (getComputedStyle(el).getPropertyValue('--frame').trim() === 'none') continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    if (rect.right <= box.left || rect.left >= box.right) continue;
    if (rect.bottom <= box.top || rect.top >= box.bottom) continue;
    const edge = el.getAttribute(attribute) as Edge;
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
  zoom: number;
  padding: Padding;
  center?: [number, number];
  // Degrees to look south of a place, so that it shows above a sheet that
  // covers the lower part of the globe.
  look: number;
  // Padding that moves the globe's centre above that sheet instead. Used when
  // the globe is zoomed in so far that turning it would not help.
  shifted: Padding;
  // Gives the zoom for another latitude, as the globe grows towards the poles.
  zoomAt: (latitude: number) => number;
}

export function designFrame(map: MapLibre, fill: number, latitude = map.getCenter().lat): Frame {
  const container = map.getContainer();
  const { clientWidth: width, clientHeight: height } = container;
  const area = container.closest<HTMLElement>('.globe-area');
  const padding = measure(map, 'data-frame');
  // On the start screen of some designs only the top of a very large globe shows.
  const dome = area?.dataset.dome !== undefined;
  if (dome) padding.bottom = 0;

  // Keep the globe on the centre line of the page when there is room for it.
  const side = Math.max(padding.left, padding.right);
  if (width - 2 * side >= 240) padding.left = padding.right = side;

  const freeWidth = Math.max(width - padding.left - padding.right, 200);
  const freeHeight = Math.max(height - padding.top - padding.bottom, 200);
  const diameter = dome
    ? Math.min(freeHeight, freeWidth * 1.7) * fill
    : Math.min(freeWidth, freeHeight) * fill;

  const shift = measure(map, 'data-frame-shift');
  let look = 0;
  const shifted = { ...padding };
  if (shift.bottom > padding.bottom) {
    const radius = diameter / 2;
    const middle = padding.top + freeHeight / 2;
    const sheetTop = height - shift.bottom;
    const above = (radius + middle - sheetTop) / 2;
    if (above > 0) look = (Math.asin(Math.min(above / radius, 0.85)) * 180) / Math.PI;
    shifted.bottom = Math.min(shift.bottom, height * 0.7);
  }

  const zoomAt = (lat: number) => zoomForDiameter(diameter, lat, height);
  return {
    zoom: zoomAt(dome ? 12 : latitude),
    padding,
    look,
    shifted,
    zoomAt,
    ...(dome ? { center: [48, 12] as [number, number] } : {}),
  };
}

// Lines of latitude and longitude, for the designs that draw them.
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
