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
import { CATEGORY_LABELS } from '../data/labels.ts';
import { useStore } from '../state/store.ts';
import type { View } from '../state/useView.ts';
import { frame, globeRadius, graticule } from './frame.ts';
import { colorExpression, memberExpression, opacityExpression } from './layers.ts';
import {
  BORDER,
  CATEGORY_COLORS,
  DIFFERENCE_COLORS,
  GRATICULE,
  HATCH_DARK,
  HATCH_LIGHT,
  IDLE,
  MARKER_STROKE,
  NO_DATA_LAND,
  OCEAN,
  OUTLINE,
} from './palette.ts';

maplibregl.setWorkerUrl(workerUrl);

// The ocean is a layer of its own, below, so its colour can change with the state.
const STYLE: StyleSpecification = {
  version: 8,
  sources: {},
  layers: [],
  sky: { 'atmosphere-blend': 0 },
};

const INTERACTIVE = ['markers', 'countries'];
const HATCH = 'hatch';
const LINES = graticule();

// Diagonal stripes drawn over places where the sources disagree.
function hatchImage(): ImageData {
  const size = 8;
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const step = (x + y) % size;
      if (step < 2) data.set(HATCH_LIGHT, (y * size + x) * 4);
      else if (step < 4) data.set(HATCH_DARK, (y * size + x) * 4);
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

// Tells the stylesheet where the globe is, so its ring and glow can sit behind it.
function publish(map: maplibregl.Map): void {
  const container = map.getContainer();
  const { top = 0, bottom = 0, left = 0, right = 0 } = map.getPadding();
  const radius = globeRadius(map.getZoom(), map.getCenter().lat, container.clientHeight);
  const host = container.closest<HTMLElement>('.globe');
  if (!host) return;
  host.style.setProperty('--globe-x', `${(left + (container.clientWidth - left - right) / 2).toFixed(1)}px`);
  host.style.setProperty('--globe-y', `${(top + (container.clientHeight - top - bottom) / 2).toFixed(1)}px`);
  host.style.setProperty('--globe-r', `${radius.toFixed(1)}px`);
}

interface Props {
  view: View | null;
  // False on the start screen, before a passport is chosen.
  started: boolean;
  // Changes whenever a surface the globe must stay clear of changes size.
  reframe?: string;
}

export default function Globe({ view, started, reframe = '' }: Props) {
  const base = useStore((s) => s.base)!;
  const selected = useStore((s) => s.selected);
  const select = useStore((s) => s.select);
  const filter = useStore((s) => s.filter);
  const compareMode = useStore((s) => s.compareMode);
  const passportA = useStore((s) => s.passportA);

  // Until a passport is chosen the globe is an emblem, drawn in the brand colours.
  const idle = !started;

  const hasView = view !== null;
  const mapRef = useRef<MapRef>(null);
  const heading = useRef<[number, number] | null>(null);
  const zoomedByHand = useRef(false);
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
      color: colorExpression(colors, idle ? IDLE.land : NO_DATA_LAND),
      opacity: opacityExpression(filter ? highlighted : null),
      conflicting: memberExpression(conflicting),
    };
  }, [view, filter, showDifference, idle]);

  const moveTo = useCallback(
    (center: [number, number] | undefined, minZoom?: number) => {
      const map = mapRef.current;
      if (!map) return;
      if (!started) {
        // Back on the start screen: forget where the globe was and how it was zoomed.
        center = undefined;
        heading.current = null;
        zoomedByHand.current = false;
      }
      // A move that is still under way keeps its destination when the globe is re-framed.
      if (center) heading.current = center;
      else if (map.isMoving() && heading.current) center = heading.current;

      const { padding, zoomAt, center: fixed } = frame(map.getMap(), started);
      center ??= fixed;
      const fit = zoomAt(center?.[1] ?? map.getCenter().lat);
      // The globe returns to the size that fits, unless the person has zoomed by hand.
      const zoom = zoomedByHand.current
        ? Math.max(map.getZoom(), minZoom ?? fit)
        : Math.max(fit, minZoom ?? fit);
      const target = { ...(center ? { center } : {}), zoom, padding };
      if (reducedMotion()) map.jumpTo(target);
      else map.easeTo({ ...target, duration: 900 });
    },
    // The pages that frame() measures come and go with these two.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [started, hasView],
  );

  // Re-frame when a panel appears or disappears.
  useEffect(() => {
    if (loaded) moveTo(undefined);
  }, [loaded, moveTo, reframe]);

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
    const { padding, zoomAt, center } = frame(map, started);
    const latitude = center?.[1] ?? map.getCenter().lat;
    map.jumpTo({ padding, zoom: zoomAt(latitude), ...(center ? { center } : {}) });
    publish(map);
    map.on('move', () => publish(map));
    map.on('zoom', (e) => {
      if ((e as { originalEvent?: Event }).originalEvent) zoomedByHand.current = true;
    });
    const canvas = map.getCanvas();
    canvas.addEventListener('webglcontextlost', () => setContextLost(true));
    canvas.addEventListener('webglcontextrestored', () => setContextLost(false));
    setLoaded(true);
    // Only runs once, when the map has loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onResize = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return;
    const { padding, zoomAt, center } = frame(map, started);
    const fit = zoomAt(center?.[1] ?? map.getCenter().lat);
    const zoom = zoomedByHand.current ? Math.max(map.getZoom(), fit) : fit;
    map.jumpTo({ zoom, padding, ...(center ? { center } : {}) });
  }, [started]);

  const onMouseMove = useCallback((e: MapLayerMouseEvent) => {
    const p = e.features?.[0]?.properties as
      | { id: string; name: string; code?: string }
      | undefined;
    setHover(p ? { id: p.id, name: p.name, code: p.code, x: e.point.x, y: e.point.y } : null);
  }, []);

  const onClick = useCallback(
    (e: MapLayerMouseEvent) => {
      // Without a passport there is nothing to show for a country, so a click on
      // the globe leads to the first step instead: the passport field.
      if (!hasView) {
        document.querySelector<HTMLInputElement>('.header [role="combobox"]')?.focus();
        return;
      }
      const id = (e.features?.[0]?.properties as { id?: string } | undefined)?.id;
      select(id ?? null);
    },
    [select, hasView],
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
        cursor={hover && hasView ? 'pointer' : 'grab'}
        onLoad={onLoad}
        onResize={onResize}
        onMouseMove={onMouseMove}
        onMouseLeave={() => setHover(null)}
        onClick={onClick}
      >
        <Layer
          id="ocean"
          type="background"
          paint={{ 'background-color': idle ? IDLE.ocean : OCEAN }}
        />
        <Source id="graticule" type="geojson" data={LINES}>
          <Layer
            id="graticule"
            type="line"
            paint={{
              'line-color': GRATICULE.color,
              'line-opacity': GRATICULE.opacity,
              'line-width': GRATICULE.width,
            }}
          />
        </Source>
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
            paint={{
              'line-color': idle ? IDLE.border : BORDER.color,
              'line-width': BORDER.width,
              'line-opacity': idle ? IDLE.borderOpacity : BORDER.opacity,
            }}
          />
          <Layer
            id="outline"
            type="line"
            layout={{ 'line-join': 'round' }}
            paint={{
              'line-color': OUTLINE,
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
              'circle-stroke-color': idle
                ? IDLE.border
                : ['case', paint.conflicting, BORDER.color, MARKER_STROKE],
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
