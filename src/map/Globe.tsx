import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  Layer,
  Map as MapView,
  NavigationControl,
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
import { useDesign } from '../designs/design.ts';
import { useTheme, type MapTheme } from '../designs/themes.ts';
import { designFrame, globeRadius, graticule } from './frame.ts';
import { colorExpression, memberExpression, opacityExpression } from './layers.ts';

maplibregl.setWorkerUrl(workerUrl);

// The ocean is a layer of its own, below, so its colour can change with the state.
const styleFor = (theme: MapTheme): StyleSpecification => ({
  version: 8,
  sources: {},
  layers: [],
  sky: theme.sky,
});

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
function hatchImage(color: MapTheme['hatch']): ImageData {
  const size = 8;
  const data = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if ((x + y) % size < 2) data.set(color, (y * size + x) * 4);
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

// Tells the stylesheet where the globe is, so a ring or glow can sit behind it.
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
  sideOpen: boolean;
  // Changes whenever a surface the globe must stay clear of changes size.
  reframe?: string;
}

export default function Globe({ view, sideOpen, reframe = '' }: Props) {
  const base = useStore((s) => s.base)!;
  const selected = useStore((s) => s.selected);
  const select = useStore((s) => s.select);
  const filter = useStore((s) => s.filter);
  const compareMode = useStore((s) => s.compareMode);
  const passportA = useStore((s) => s.passportA);

  const design = useDesign();
  const theme = useTheme();
  const style = useMemo(() => styleFor(theme), [theme]);
  const lines = useMemo(() => (theme.graticule ? graticule() : null), [theme]);
  // Where the page scrolls under the globe, the wheel scrolls the page and the buttons zoom.
  // Until a passport is chosen the globe is an emblem, drawn in the brand colours.
  const idle = design !== 0 && !sideOpen;
  const ocean = idle ? theme.idle.ocean : theme.ocean;
  const pageScrolls = design === 2 && sideOpen && window.matchMedia('(min-width: 821px)').matches;

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
        showDifference ? theme.differences[cell.difference!] : theme.categories[cell.category],
      );
      if (filter === key) highlighted.push(code);
      if (cell.conflicting && !showDifference) conflicting.push(code);
    }
    return {
      color: colorExpression(colors, idle ? theme.idle.land : theme.noData),
      opacity: opacityExpression(filter ? highlighted : null),
      conflicting: memberExpression(conflicting),
    };
  }, [view, filter, showDifference, theme, idle]);

  const moveTo = useCallback(
    (center: [number, number] | undefined, minZoom?: number) => {
      const map = mapRef.current;
      if (!map) return;
      // A move that is still under way keeps its destination when the globe is re-framed.
      if (center) heading.current = center;
      else if (map.isMoving() && heading.current) center = heading.current;

      let zoom: number;
      let padding: PaddingOptions;
      if (design === 0) {
        const framed = frame(map);
        zoom = Math.max(map.getZoom(), minZoom ?? framed.zoom);
        padding = framed.padding;
      } else {
        const framed = designFrame(map.getMap(), theme.fill);
        center ??= framed.center;
        // A sheet may cover the lower part of the globe. Turn the globe so the
        // place shows above the sheet, or move the globe up when zoomed in close.
        const close = minZoom !== undefined;
        if (center && !close && framed.look) {
          center = [center[0], Math.max(-80, center[1] - framed.look)];
        }
        padding = close ? framed.shifted : framed.padding;
        const fit = framed.zoomAt(center?.[1] ?? map.getCenter().lat);
        // The globe returns to the size that fits, unless the person has zoomed by hand.
        zoom = zoomedByHand.current
          ? Math.max(map.getZoom(), minZoom ?? fit)
          : Math.max(fit, minZoom ?? fit);
      }
      const target = { ...(center ? { center } : {}), zoom, padding };
      if (reducedMotion()) map.jumpTo(target);
      else map.easeTo({ ...target, duration: 900 });
    },
    // The panels that frame() measures come and go with these two.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sideOpen, hasView, design, theme],
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
    if (!map.hasImage(HATCH)) map.addImage(HATCH, hatchImage(theme.hatch));
    map.jumpTo(design === 0 ? frame(mapRef.current!) : designFrame(map, theme.fill));
    if (design !== 0) {
      publish(map);
      map.on('move', () => publish(map));
      map.on('zoom', (e) => {
        if ((e as { originalEvent?: Event }).originalEvent) zoomedByHand.current = true;
      });
    }
    const canvas = map.getCanvas();
    canvas.addEventListener('webglcontextlost', () => setContextLost(true));
    canvas.addEventListener('webglcontextrestored', () => setContextLost(false));
    setLoaded(true);
  }, [design, theme]);

  const onResize = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    if (design === 0) map.jumpTo(frame(map));
    else {
      const framed = designFrame(map.getMap(), theme.fill);
      const zoom = zoomedByHand.current ? Math.max(map.getZoom(), framed.zoom) : framed.zoom;
      map.jumpTo({ zoom, padding: framed.padding, ...(framed.center ? { center: framed.center } : {}) });
    }
  }, [design, theme]);

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
        mapStyle={style}
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
        cooperativeGestures={pageScrolls}
        interactiveLayerIds={loaded ? INTERACTIVE : []}
        cursor={hover ? 'pointer' : 'grab'}
        onLoad={onLoad}
        onResize={onResize}
        onMouseMove={onMouseMove}
        onMouseLeave={() => setHover(null)}
        onClick={onClick}
      >
        <Layer id="ocean" type="background" paint={{ 'background-color': ocean }} />
        {pageScrolls && <NavigationControl position="top-left" showCompass={false} />}
        {lines && theme.graticule && (
          <Source id="graticule" type="geojson" data={lines}>
            <Layer
              id="graticule"
              type="line"
              paint={{
                'line-color': theme.graticule.color,
                'line-opacity': theme.graticule.opacity,
                'line-width': 0.6,
              }}
            />
          </Source>
        )}
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
              'line-color': idle ? theme.idle.border : theme.border,
              'line-width': theme.borderWidth,
              'line-opacity': idle ? theme.idle.borderOpacity : theme.borderOpacity,
            }}
          />
          <Layer
            id="outline"
            type="line"
            layout={{ 'line-join': 'round' }}
            paint={{
              'line-color': theme.outline,
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
                ? theme.idle.border
                : ['case', paint.conflicting, theme.border, theme.markerStroke],
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
