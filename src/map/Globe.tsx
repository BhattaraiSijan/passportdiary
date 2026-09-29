import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Layer,
  Map as MapView,
  Source,
  type MapLayerMouseEvent,
  type MapRef,
  type StyleSpecification,
} from '@vis.gl/react-maplibre';
import type { FeatureCollection } from 'geojson';
import type { PaddingOptions } from 'maplibre-gl';
import { CATEGORY_LABELS } from '../data/labels.ts';
import { useStore } from '../state/store.ts';
import type { View } from '../state/useView.ts';
import { BORDER, CATEGORY_COLORS, DIFFERENCE_COLORS, NO_DATA_LAND, OCEAN } from './colors.ts';
import { colorExpression, memberExpression, opacityExpression } from './layers.ts';

maplibregl.setWorkerUrl(workerUrl);

const STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [{ id: 'ocean', type: 'background', paint: { 'background-color': OCEAN } }],
  sky: { 'atmosphere-blend': 0 },
};

const INTERACTIVE = ['markers', 'countries'];
const HATCH = 'hatch';
const OVERLAY_GAP = 16;

// Zoom at which the whole globe fits the container, so phones are not cropped.
function fitZoom(diameter: number): number {
  return Math.max(0.6, Math.log2((diameter * 0.97 * Math.PI) / 512));
}

// Where the globe sits. It stays centred on the page whenever the space beside the
// side panel allows a large globe; on narrower screens it moves into the free area.
function frame(map: MapRef): { zoom: number; padding: PaddingOptions } {
  const container = map.getContainer();
  const { clientWidth: width, clientHeight: height } = container;
  const box = container.getBoundingClientRect();
  // Panels lie over the edges of the map on wide screens only.
  const overlays = [...(container.closest('.stage')?.querySelectorAll<HTMLElement>('.legend, .intro, .side') ?? [])]
    .filter((el) => getComputedStyle(el).position === 'absolute')
    .map((el) => ({ el, rect: el.getBoundingClientRect() }));
  let left = 0;
  let right = 0;
  for (const { el, rect } of overlays) {
    if (el.classList.contains('side')) right = Math.max(right, box.right - rect.left + OVERLAY_GAP);
    else left = Math.max(left, rect.right - box.left + OVERLAY_GAP);
  }
  const centred = width - 2 * Math.max(left, right);
  if (centred >= height * 0.85) {
    return { zoom: fitZoom(Math.min(height, centred)), padding: { top: 0, bottom: 0, left: 0, right: 0 } };
  }
  const free = Math.max(width - left - right, 240);
  return { zoom: fitZoom(Math.min(height, free)), padding: { top: 0, bottom: 0, left, right } };
}

// Diagonal stripes drawn over places where the sources disagree.
function hatchImage(): ImageData {
  const size = 8;
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if ((x + y) % size < 2) data.set([22, 58, 117, 190], (y * size + x) * 4);
    }
  }
  return new ImageData(data, size, size);
}

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface Hover {
  id: string;
  name: string;
  code?: string;
  x: number;
  y: number;
}

export default function Globe({ view, sideOpen }: { view: View | null; sideOpen: boolean }) {
  const base = useStore((s) => s.base)!;
  const selected = useStore((s) => s.selected);
  const select = useStore((s) => s.select);
  const filter = useStore((s) => s.filter);
  const compareMode = useStore((s) => s.compareMode);
  const passportA = useStore((s) => s.passportA);

  const hasView = view !== null;
  const mapRef = useRef<MapRef>(null);
  const [loaded, setLoaded] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [hover, setHover] = useState<Hover | null>(null);

  const showDifference = Boolean(view?.comparing) && compareMode === 'difference';

  const markers = useMemo<FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: base.countries
        .filter((c) => c.isTiny && c.isDestination)
        .map((c) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: c.centroid },
          properties: { id: c.id, code: c.id, name: c.name },
        })),
    }),
    [base],
  );

  const paint = useMemo(() => {
    const colors = new Map<string, string>();
    const highlighted: string[] = [];
    const conflicting: string[] = [];
    for (const [code, cell] of view?.cells ?? []) {
      const key = showDifference ? cell.difference! : cell.category;
      colors.set(
        code,
        showDifference ? DIFFERENCE_COLORS[cell.difference!] : CATEGORY_COLORS[cell.category],
      );
      if (filter === key) highlighted.push(code);
      if (cell.conflicting && !showDifference) conflicting.push(code);
    }
    return {
      color: colorExpression(colors, NO_DATA_LAND),
      opacity: opacityExpression(filter ? highlighted : null),
      conflicting: memberExpression(conflicting),
    };
  }, [view, filter, showDifference]);

  const moveTo = useCallback(
    (center: [number, number] | undefined, minZoom?: number) => {
      const map = mapRef.current;
      if (!map) return;
      const { zoom: fit, padding } = frame(map);
      const zoom = Math.max(map.getZoom(), minZoom ?? fit);
      const target = { ...(center ? { center } : {}), zoom, padding };
      if (reducedMotion()) map.jumpTo(target);
      else map.easeTo({ ...target, duration: 900 });
    },
    // The panels that frame() measures come and go with these two.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sideOpen, hasView],
  );

  // Re-frame when a panel appears or disappears.
  useEffect(() => {
    if (loaded) moveTo(undefined);
  }, [loaded, moveTo]);

  useEffect(() => {
    const country = passportA ? base.byId.get(passportA) : undefined;
    if (loaded && country) moveTo(country.centroid);
  }, [loaded, passportA, base, moveTo]);

  useEffect(() => {
    const country = selected ? base.byId.get(selected) : undefined;
    if (loaded && country) moveTo(country.centroid, country.isTiny ? 4 : undefined);
  }, [loaded, selected, base, moveTo]);

  // Selection and hover outlines use feature-state, which restyles without rebuilding geometry.
  const marked = useRef<{ selected?: string; hover?: string }>({});
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) return;
    const apply = (key: 'selected' | 'hover', id: string | undefined) => {
      const previous = marked.current[key];
      if (previous === id) return;
      if (previous) map.setFeatureState({ source: 'world', id: previous }, { [key]: false });
      if (id) map.setFeatureState({ source: 'world', id }, { [key]: true });
      marked.current[key] = id;
    };
    apply('selected', selected ?? undefined);
    apply('hover', hover?.id);
  }, [loaded, selected, hover]);

  const onLoad = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    if (import.meta.env.DEV) (window as unknown as { __map: unknown }).__map = map;
    if (!map.hasImage(HATCH)) map.addImage(HATCH, hatchImage());
    map.jumpTo(frame(mapRef.current!));
    const canvas = map.getCanvas();
    canvas.addEventListener('webglcontextlost', () => setContextLost(true));
    canvas.addEventListener('webglcontextrestored', () => setContextLost(false));
    setLoaded(true);
  }, []);

  const onResize = useCallback(() => {
    if (mapRef.current) mapRef.current.jumpTo(frame(mapRef.current));
  }, []);

  const onMouseMove = useCallback((e: MapLayerMouseEvent) => {
    const p = e.features?.[0]?.properties as
      | { id: string; name: string; code?: string }
      | undefined;
    setHover(p ? { id: p.id, name: p.name, code: p.code, x: e.point.x, y: e.point.y } : null);
  }, []);

  const onClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const id = (e.features?.[0]?.properties as { id?: string } | undefined)?.id;
      select(id ?? null);
    },
    [select],
  );

  const hoverCell = hover?.code ? view?.cells.get(hover.code) : undefined;

  return (
    <div className="globe">
      <MapView
        ref={mapRef}
        mapLib={maplibregl}
        mapStyle={STYLE}
        projection="globe"
        initialViewState={{ longitude: 60, latitude: 20, zoom: 1 }}
        minZoom={0.6}
        maxZoom={7}
        maxPitch={0}
        dragRotate={false}
        pitchWithRotate={false}
        touchPitch={false}
        pixelRatio={Math.min(window.devicePixelRatio, 2)}
        attributionControl={false}
        interactiveLayerIds={loaded ? INTERACTIVE : []}
        cursor={hover ? 'pointer' : 'grab'}
        onLoad={onLoad}
        onResize={onResize}
        onMouseMove={onMouseMove}
        onMouseLeave={() => setHover(null)}
        onClick={onClick}
      >
        <Source id="world" type="geojson" data={base.world} promoteId="id">
          <Layer
            id="countries"
            type="fill"
            paint={{ 'fill-color': paint.color, 'fill-opacity': paint.opacity }}
          />
          {loaded && (
            <Layer
              id="conflicting"
              type="fill"
              filter={paint.conflicting}
              paint={{ 'fill-pattern': HATCH, 'fill-opacity': filter ? 0.25 : 1 }}
            />
          )}
          <Layer
            id="borders"
            type="line"
            paint={{ 'line-color': BORDER, 'line-width': 0.6, 'line-opacity': 0.55 }}
          />
          <Layer
            id="outline"
            type="line"
            layout={{ 'line-join': 'round' }}
            paint={{
              'line-color': '#ffffff',
              'line-width': [
                'case',
                ['boolean', ['feature-state', 'selected'], false],
                2.5,
                ['boolean', ['feature-state', 'hover'], false],
                1.5,
                0,
              ],
            }}
          />
        </Source>
        <Source id="markers" type="geojson" data={markers} promoteId="id">
          <Layer
            id="markers"
            type="circle"
            maxzoom={5}
            paint={{
              'circle-color': paint.color,
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 3.5, 4, 7],
              'circle-stroke-color': ['case', paint.conflicting, BORDER, '#ffffff'],
              'circle-stroke-width': ['case', paint.conflicting, 2, 1],
              'circle-opacity': ['interpolate', ['linear'], ['zoom'], 3.5, 1, 5, 0],
              'circle-stroke-opacity': ['interpolate', ['linear'], ['zoom'], 3.5, 1, 5, 0],
            }}
          />
        </Source>
      </MapView>

      {hover && (
        <div className="tooltip" style={{ left: hover.x, top: hover.y }}>
          <strong>{hover.name}</strong>
          {view && <span>{CATEGORY_LABELS[hoverCell?.category ?? 'unknown']}</span>}
          {hoverCell?.conflicting && <span>Sources disagree</span>}
        </div>
      )}
      {contextLost && (
        <p className="globe-message" role="status">
          The globe stopped drawing. Reload the page to bring it back. The list still works.
        </p>
      )}
    </div>
  );
}
