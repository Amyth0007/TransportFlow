import { useEffect, useState, useRef, Suspense, lazy } from 'react';
import api, { type Route, type Stop } from '../lib/api';
import { defaultStop, HAS_MAPS_API_KEY, requestBrowserLocationInIndia } from '../lib/routeMapTypes';
import PlaceSearch from '../components/PlaceSearch';

const RouteMap = lazy(() => import('../components/RouteMap'));

function emptyForm() {
  return { name: '', stops: [defaultStop(1)] };
}

export default function RoutesPage() {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [form, setForm] = useState(emptyForm());
  const [editId, setEditId] = useState<string | null>(null);
  const [editRoadPath, setEditRoadPath] = useState<Route['roadPath']>(null);
  const [selectedStopIndex, setSelectedStopIndex] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [listError, setListError] = useState('');
  const [listLoading, setListLoading] = useState(true);
  const [locationHint, setLocationHint] = useState('');
  const editIdRef = useRef(editId);
  editIdRef.current = editId;

  async function applyCurrentLocationToFirstStop() {
    setLocationHint('Waiting for location permission…');
    const pos = await requestBrowserLocationInIndia();
    if (editIdRef.current) {
      setLocationHint('');
      return;
    }
    if (!pos) {
      setLocationHint('Location unavailable or outside India — drop stop 1 on the map or type lat/lng.');
      return;
    }
    setForm((f) => {
      const rest = f.stops.slice(1);
      const first = f.stops[0] ?? defaultStop(1);
      return {
        ...f,
        stops: [{ ...first, order: 1, lat: pos.lat, lng: pos.lng, label: first.label || 'Current location' }, ...rest],
      };
    });
    setSelectedStopIndex(0);
    setEditRoadPath(null);
    setLocationHint('Stop 1 is your current location.');
  }

  useEffect(() => {
    if (editId) return;
    void applyCurrentLocationToFirstStop();
    // Ask once when starting a new route (not while editing an existing one).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  async function load() {
    setListLoading(true);
    try {
      const res = await api.get<{ data: Route[] }>('/routes');
      setRoutes(res.data.data);
      setListError('');
    } catch {
      setListError('Could not load routes');
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function startEdit(r: Route) {
    setEditId(r._id);
    setForm({ name: r.name, stops: r.stops.map(s => ({ ...s })) });
    setEditRoadPath(r.roadPath);
    setSelectedStopIndex(null);
    setLocationHint('');
  }

  function cancelEdit() {
    setEditId(null);
    setForm(emptyForm());
    setEditRoadPath(null);
    setSelectedStopIndex(null);
    setError('');
  }

  function setStop(i: number, field: keyof Stop, value: string) {
    setForm(f => {
      const stops = f.stops.map((s, idx) =>
        idx === i ? { ...s, [field]: field === 'label' ? value : Number(value) } : s
      );
      return { ...f, stops };
    });
    // Straight-line preview while editing; road path recomputed on save
    setEditRoadPath(null);
  }

  function addStop() {
    setForm(f => ({
      ...f,
      stops: [...f.stops, defaultStop(f.stops.length + 1)],
    }));
    setEditRoadPath(null);
  }

  function addStopFromSearch(place: { label: string; lat: number; lng: number }) {
    const selected = selectedStopIndex;
    const fillingFirst = form.stops.length === 1 && !form.stops[0]?.label.trim();
    const appending = selected == null && !fillingFirst;

    setEditRoadPath(null);
    setForm((f) => {
      if (selected != null && f.stops[selected]) {
        return {
          ...f,
          stops: f.stops.map((s, i) =>
            i === selected ? { ...s, label: place.label, lat: place.lat, lng: place.lng } : s
          ),
        };
      }
      if (f.stops.length === 1 && f.stops[0] && !f.stops[0].label.trim()) {
        return { ...f, stops: [{ ...f.stops[0], label: place.label, lat: place.lat, lng: place.lng }] };
      }
      return {
        ...f,
        stops: [...f.stops, { order: f.stops.length + 1, label: place.label, lat: place.lat, lng: place.lng }],
      };
    });
    if (fillingFirst) setSelectedStopIndex(0);
    else if (appending) setSelectedStopIndex(form.stops.length);
  }

  function removeStop(i: number) {
    setForm(f => ({
      ...f,
      stops: f.stops.filter((_, idx) => idx !== i).map((s, idx) => ({ ...s, order: idx + 1 })),
    }));
    setSelectedStopIndex(null);
    setEditRoadPath(null);
  }

  function moveStop(i: number, direction: 'up' | 'down') {
    setForm(f => {
      const stops = [...f.stops];
      const target = direction === 'up' ? i - 1 : i + 1;
      if (target < 0 || target >= stops.length) return f;
      [stops[i], stops[target]] = [stops[target], stops[i]];
      return { ...f, stops: stops.map((s, idx) => ({ ...s, order: idx + 1 })) };
    });
    setSelectedStopIndex(null);
    setEditRoadPath(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      if (editId) {
        const res = await api.patch<{ data: Route }>(`/routes/${editId}`, form);
        setEditRoadPath(res.data.data.roadPath);
      } else {
        await api.post('/routes', form);
      }
      cancelEdit();
      load();
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Something went wrong');
    }
  }

  async function deleteRoute(id: string) {
    try {
      await api.delete(`/routes/${id}`);
      load();
    } catch (err: any) {
      alert(err.response?.data?.error ?? 'Cannot delete route');
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="tf-kicker">Network</p>
        <h1 className="tf-title text-2xl mt-1">Routes</h1>
      </div>
      {listError && <p className="text-sm text-coral">{listError}</p>}
      {!HAS_MAPS_API_KEY && (
        <p className="text-sm text-amber tf-card px-3 py-2">
          MAPS_API_KEY is not set in web/.env — the map will not load. You can still add
          stops with lat/lng; the backend stores a straight-line path if Directions is unavailable.
        </p>
      )}

      <form onSubmit={handleSubmit} className="tf-card p-5 space-y-3 max-w-4xl">
        <h2 className="font-semibold text-sm text-sand">{editId ? 'Edit route' : 'Add route'}</h2>
        {error && <p className="text-sm text-coral">{error}</p>}
        <input placeholder="Route name *" required value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="tf-field" />

        <div className="space-y-2">
          <p className="tf-kicker">Stops</p>
          <p className="text-xs text-mute">
            The browser will ask for location. If you allow it, stop 1 becomes where you are
            (India only). Scroll and pinch the satellite map, click to add stops, drag to move.
          </p>
          {locationHint && <p className="text-xs text-cyan">{locationHint}</p>}
          {!editId && (
            <button type="button" onClick={() => void applyCurrentLocationToFirstStop()} className="tf-link text-sm">
              Use my current location for stop 1
            </button>
          )}
          <PlaceSearch disabled={!HAS_MAPS_API_KEY} onPlace={addStopFromSearch} />
          <p className="text-xs text-mute">
            Type a place name and pick from the list (India). With a stop row selected, search
            replaces that stop; otherwise it adds a new one.
          </p>
          {form.stops.map((stop, i) => (
            <div
              key={i}
              onClick={() => setSelectedStopIndex(i)}
              className={`grid grid-cols-12 gap-2 items-center rounded-lg px-1 py-1 cursor-pointer transition-colors ${
                selectedStopIndex === i ? 'bg-amber/10 ring-1 ring-amber' : 'hover:bg-surface-2'
              }`}
            >
              <span className="col-span-1 text-xs text-mute text-center font-bold">{i + 1}</span>

              <input placeholder="Label *" required value={stop.label}
                onChange={e => setStop(i, 'label', e.target.value)}
                onClick={e => e.stopPropagation()}
                className="tf-field col-span-3 !py-1.5" />

              <input placeholder="Lat *" required type="number" step="any" value={stop.lat || ''}
                onChange={e => setStop(i, 'lat', e.target.value)}
                onClick={e => e.stopPropagation()}
                className="tf-field col-span-3 !py-1.5" />

              <input placeholder="Lng *" required type="number" step="any" value={stop.lng || ''}
                onChange={e => setStop(i, 'lng', e.target.value)}
                onClick={e => e.stopPropagation()}
                className="tf-field col-span-2 !py-1.5" />

              <div className="col-span-2 flex gap-1">
                <button type="button" onClick={(e) => { e.stopPropagation(); moveStop(i, 'up'); }}
                  disabled={i === 0}
                  title="Move up"
                  className="tf-btn tf-btn-ghost !px-2 !py-1 text-xs disabled:opacity-30">
                  ↑
                </button>
                <button type="button" onClick={(e) => { e.stopPropagation(); moveStop(i, 'down'); }}
                  disabled={i === form.stops.length - 1}
                  title="Move down"
                  className="tf-btn tf-btn-ghost !px-2 !py-1 text-xs disabled:opacity-30">
                  ↓
                </button>
              </div>

              {form.stops.length > 1 && (
                <button type="button" onClick={(e) => { e.stopPropagation(); removeStop(i); }}
                  className="col-span-1 text-coral text-lg leading-none">×</button>
              )}
            </div>
          ))}
          <button type="button" onClick={addStop} className="tf-link text-sm">+ Add stop</button>
        </div>

        <div className="tf-map-frame" style={{ height: '420px' }}>
          <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-sm text-mute">Loading map…</div>}>
            <RouteMap
              stops={form.stops}
              roadPath={editRoadPath}
              interactive
              selectedStopIndex={selectedStopIndex}
              onStopSelect={setSelectedStopIndex}
              onStopsChange={(updatedStops) => {
                setForm(f => ({ ...f, stops: updatedStops }));
                setEditRoadPath(null);
              }}
            />
          </Suspense>
        </div>

        <div className="flex gap-2">
          <button type="submit" className="tf-btn tf-btn-primary">
            {editId ? 'Save' : 'Add'}
          </button>
          {editId && <button type="button" onClick={cancelEdit} className="tf-btn tf-btn-ghost">Cancel</button>}
        </div>
      </form>

      <div className="tf-card tf-table-wrap">
        <table>
          <thead>
            <tr>
              {['Name', 'Stops', ''].map(h => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {listLoading && (
              <tr><td colSpan={3} className="text-center text-mute">Loading…</td></tr>
            )}
            {!listLoading && routes.map(r => (
              <tr key={r._id}>
                <td className="text-sand">{r.name}</td>
                <td>{r.stops.length}</td>
                <td className="flex gap-3">
                  <button onClick={() => startEdit(r)} className="tf-link text-sm">Edit</button>
                  <button onClick={() => deleteRoute(r._id)} className="text-coral text-sm hover:underline">Delete</button>
                </td>
              </tr>
            ))}
            {!listLoading && routes.length === 0 && (
              <tr><td colSpan={3} className="text-center text-mute">No routes yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
