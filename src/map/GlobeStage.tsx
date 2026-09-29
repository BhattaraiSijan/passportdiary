import { Component, Suspense, lazy, type ReactNode } from 'react';
import type { View } from '../state/useView.ts';

// MapLibre is the largest dependency, so it loads after the selector and list are usable.
const Globe = lazy(() => import('./Globe.tsx'));

function supportsWebGL2(): boolean {
  try {
    return Boolean(document.createElement('canvas').getContext('webgl2'));
  } catch {
    return false;
  }
}

class GlobeBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <p className="globe-message" role="status">
        The globe could not start on this device. The list has the same information.
      </p>
    );
  }
}

const webgl2 = supportsWebGL2();

export function GlobeStage({ view }: { view: View | null }) {
  if (!webgl2) {
    return (
      <p className="globe-message" role="status">
        This browser cannot draw the globe. The list has the same information.
      </p>
    );
  }
  return (
    <GlobeBoundary>
      <Suspense fallback={<p className="globe-message">Loading the globe…</p>}>
        <Globe view={view} />
      </Suspense>
    </GlobeBoundary>
  );
}
