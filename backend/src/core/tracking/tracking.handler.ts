import { Server, Socket } from 'socket.io';
import { Trip } from '../../shared/models';
import { Route } from '../../shared/models';

// All event payload shapes match docs/DATA-MODELS.md exactly.

interface TripRoomPayload {
  tripId: string;
}

interface LocationUpdatePayload {
  tripId: string;
  lat: number;
  lng: number;
  timestamp: string;
  speed?: number;
}

export function registerTrackingHandlers(io: Server, socket: Socket): void {
  // ── trip:join ─────────────────────────────────────────────────────────────
  socket.on('trip:join', ({ tripId }: TripRoomPayload) => {
    if (!tripId) return;
    socket.join(`trip_${tripId}`);
  });

  // ── trip:leave ────────────────────────────────────────────────────────────
  socket.on('trip:leave', ({ tripId }: TripRoomPayload) => {
    if (!tripId) return;
    socket.leave(`trip_${tripId}`);
  });

  // ── location:update ───────────────────────────────────────────────────────
  // Persists lastKnownLocation to the Trip document, then broadcasts to the
  // room so the dashboard and public tracking page receive it.
  socket.on('location:update', async (payload: LocationUpdatePayload) => {
    const { tripId, lat, lng, timestamp } = payload;
    if (!tripId || lat == null || lng == null || !timestamp) return;

    try {
      // Persist to DB — simple overwrite, no history needed for Phase 0
      await Trip.findByIdAndUpdate(tripId, {
        $set: {
          lastKnownLocation: { lat, lng, updatedAt: new Date(timestamp) },
        },
      });

      // Broadcast to everyone in the room (including the sender's other tabs,
      // excluding the sender socket itself via .to())
      const driverId = socket.data.driverId as string | undefined;
      io.to(`trip_${tripId}`).emit('location:broadcast', {
        tripId,
        driverId: driverId ?? '',
        lat,
        lng,
        timestamp,
      });
    } catch {
      // Silently swallow DB errors — a missed location ping is acceptable;
      // crashing the socket connection is not.
    }
  });

  // ── trip:status_changed ───────────────────────────────────────────────────
  // Emitted by the server (from REST start/end endpoints) to notify connected
  // clients. The socket handler here allows the driver app to also emit it
  // directly if needed (e.g. reconnect scenario).
  // ── stop:reached ───────────────────────────────────────────────────────
  // Client notifies server that driver reached a stop.
  // Server validates progression and updates currentStopIndex.
  socket.on('stop:reached', async (payload: { tripId: string; stopIndex: number }) => {
    const { tripId, stopIndex } = payload;
    if (!tripId || stopIndex === undefined || stopIndex === null) return;
    try {
      // Load Trip and Route
      const trip = await Trip.findById(tripId).lean();
      if (!trip) return;
      const route = await Route.findById(trip.routeId).lean();
      if (!route) return;
      const stopsCount = route.stops.length;
      // Validate stop index range
      if (stopIndex < 0 || stopIndex >= stopsCount) {
        socket.emit('error', `Invalid stop index: route only has ${stopsCount} stops.`);
        return;
      }
      // Enforce forward progression
      if (stopIndex <= (trip as any).currentStopIndex) {
        socket.emit('error', `Invalid stop index: cannot move backwards or repeat.`);
        return;
      }
      // Update currentStopIndex
      await Trip.findByIdAndUpdate(tripId, { $set: { currentStopIndex: stopIndex } });
      const driverId = socket.data.driverId as string | undefined;
      io.to(`trip_${tripId}`).emit('stop:reached_broadcast', {
        tripId,
        driverId: driverId ?? '',
        stopIndex,
      });
    } catch (e) {
      // swallow errors
    }
  });
}
