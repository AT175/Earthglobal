// GPS Survey Utilities
// Implements: fix quality detection, point averaging, outlier removal,
// time-spaced readings, accuracy thresholds, and dimension cross-checking.

export const ACCURACY_THRESHOLD_M = 10; // reject readings worse than this
export const MIN_READINGS = 4; // minimum readings per station
export const MAX_READINGS = 12; // cap to prevent over-collection
export const STATION_INTERVAL_MS = 30000; // minimum 30s between station starts
export const READING_INTERVAL_MS = 5000; // 5s between individual readings at a station

// ── Fix Quality Detection ──

export function getFixQuality(accuracy) {
  if (accuracy == null) return { label: 'No Signal', color: '#ef4444', locked: false };
  if (accuracy <= 3) return { label: 'Excellent (3D Fix)', color: '#22c55e', locked: true };
  if (accuracy <= 5) return { label: 'Good (3D Fix)', color: '#4ade80', locked: true };
  if (accuracy <= 10) return { label: 'Fair (2D Fix)', color: '#fbbf24', locked: false };
  if (accuracy <= 20) return { label: 'Poor', color: '#f97316', locked: false };
  return { label: 'Bad', color: '#ef4444', locked: false };
}

// ── Outlier Removal & Averaging ──

// Removes outlier points using median absolute deviation (MAD)
// Returns the filtered set and the averaged center point.
export function processStationReadings(readings) {
  if (!readings || readings.length === 0) return { filtered: [], center: null };

  // Sort by accuracy — keep the best readings
  const sorted = [...readings].sort((a, b) => (a.accuracy || 999) - (b.accuracy || 999));

  // If we have fewer than 3 readings, just take the best one's location
  if (sorted.length < 3) {
    const best = sorted[0];
    return {
      filtered: sorted,
      center: { lat: best.lat, lng: best.lng, accuracy: best.accuracy },
    };
  }

  // Compute median lat/lng
  const lats = sorted.map((r) => r.lat).sort((a, b) => a - b);
  const lngs = sorted.map((r) => r.lng).sort((a, b) => a - b);
  const medLat = lats[Math.floor(lats.length / 2)];
  const medLng = lngs[Math.floor(lngs.length / 2)];

  // Compute distances from median for each point
  const withDist = sorted.map((r) => ({
    ...r,
    dist: haversine(r.lat, r.lng, medLat, medLng),
  }));

  // Compute MAD (median absolute deviation)
  const dists = withDist.map((r) => r.dist).sort((a, b) => a - b);
  const medDist = dists[Math.floor(dists.length / 2)];

  // Filter: keep points within 3x MAD of the median (or all if MAD is 0)
  const threshold = medDist > 0 ? medDist * 3 : Infinity;
  const filtered = medDist > 0 ? withDist.filter((r) => r.dist <= threshold) : withDist;

  // If filtering removed too many, fall back to the best 60%
  const finalSet = filtered.length >= Math.ceil(sorted.length * 0.6)
    ? filtered
    : sorted.slice(0, Math.ceil(sorted.length * 0.6));

  // Weighted average (weight by inverse accuracy — lower accuracy value = higher weight)
  let totalWeight = 0;
  let weightedLat = 0;
  let weightedLng = 0;

  for (const r of finalSet) {
    const weight = 1 / (r.accuracy || 10);
    weightedLat += r.lat * weight;
    weightedLng += r.lng * weight;
    totalWeight += weight;
  }

  const center = {
    lat: weightedLat / totalWeight,
    lng: weightedLng / totalWeight,
    accuracy: Math.min(...finalSet.map((r) => r.accuracy || 999)),
    readingsUsed: finalSet.length,
    readingsDropped: readings.length - finalSet.length,
  };

  return { filtered: finalSet, center };
}

// ── Haversine distance (meters) ──

export function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Dimension Cross-Check ──

// Given a set of station centers (the polygon vertices), compute the area
// and compare it to the user-provided expected dimensions.
// expectedDims: { widthFt, heightFt } or { widthM, heightM }
export function crossCheckArea(stations, expectedDims) {
  if (!stations || stations.length < 3) return { valid: true, skip: true };
  if (!expectedDims || (!expectedDims.widthM && !expectedDims.widthFt)) {
    return { valid: true, skip: true };
  }

  // Convert expected dimensions to sq meters
  const widthM = expectedDims.widthM || expectedDims.widthFt * 0.3048;
  const heightM = expectedDims.heightM || expectedDims.heightFt * 0.3048;
  const expectedSqm = widthM * heightM;

  // Compute actual area using shoelace formula on the station centers
  const coords = stations.map((s) => ({ lat: s.center.lat, lng: s.center.lng }));
  coords.push(coords[0]); // close the ring
  let actualSqm = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const p1 = coords[i];
    const p2 = coords[i + 1];
    actualSqm += toRad(p2.lng - p1.lng) * (2 + Math.sin(toRad(p1.lat)) + Math.sin(toRad(p2.lat)));
  }
  actualSqm = Math.abs(actualSqm * 6371000 * 6371000 / 2);

  const ratio = actualSqm / expectedSqm;
  const percentDiff = Math.abs(ratio - 1) * 100;

  return {
    valid: percentDiff <= 25, // allow 25% tolerance
    expectedSqm,
    actualSqm,
    percentDiff: Math.round(percentDiff),
    message:
      percentDiff <= 25
        ? `Area matches expected size (${Math.round(actualSqm)} m² vs ${Math.round(expectedSqm)} m² expected)`
        : `Area mismatch: measured ${Math.round(actualSqm)} m² but expected ~${Math.round(expectedSqm)} m² (${Math.round(percentDiff)}% difference). Consider retaking readings.`,
  };
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

// ── Time Formatting ──

export function formatCountdown(ms) {
  const seconds = Math.ceil(ms / 1000);
  if (seconds >= 60) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  }
  return `${seconds}s`;
}

// ═══════════════════════════════════════════════════════════
// GPS Boundary Verification
// ═══════════════════════════════════════════════════════════

/**
 * Point-in-polygon test (ray casting algorithm).
 * @param {number} lat - Point latitude
 * @param {number} lng - Point longitude
 * @param {Array<{lat:number,lng:number}>} polygon - Polygon vertices
 * @returns {boolean} True if point is inside polygon
 */
export function pointInPolygon(lat, lng, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng, yi = polygon[i].lat;
    const xj = polygon[j].lng, yj = polygon[j].lat;
    const intersect = ((yi > lat) !== (yj > lat)) &&
      (lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Minimum distance from a point to a line segment (in meters).
 */
function distanceToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return haversine(px, py, ax, ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projLat = ax + t * dx;
  const projLng = ay + t * dy;
  return haversine(px, py, projLat, projLng);
}

/**
 * Compare a walked GPS track with the registered parcel boundary.
 * Returns deviation analysis for each GPS point.
 * @param {Array<{lat:number,lng:number,accuracy?:number}>} track - Walked GPS points
 * @param {Array<{lat:number,lng:number}>} boundary - Registered boundary vertices
 * @returns {Object} Verification result with deviations and summary
 */
export function verifyBoundary(track, boundary) {
  if (!track || track.length < 3 || !boundary || boundary.length < 3) {
    return { valid: false, message: 'Insufficient data for verification' };
  }

  const deviations = track.map((point, i) => {
    // Find minimum distance to any boundary segment
    let minDist = Infinity;
    let nearestSegment = -1;
    for (let j = 0; j < boundary.length; j++) {
      const next = (j + 1) % boundary.length;
      const dist = distanceToSegment(
        point.lat, point.lng,
        boundary[j].lat, boundary[j].lng,
        boundary[next].lat, boundary[next].lng
      );
      if (dist < minDist) {
        minDist = dist;
        nearestSegment = j;
      }
    }

    const inside = pointInPolygon(point.lat, point.lng, boundary);
    return {
      pointIndex: i,
      lat: point.lat,
      lng: point.lng,
      accuracy: point.accuracy || null,
      distanceToBoundary: Math.round(minDist * 10) / 10,
      insideBoundary: inside,
      nearestSegment,
      status: minDist <= 5 ? 'matched' : minDist <= 15 ? 'minor_deviation' : 'major_deviation',
    };
  });

  const matched = deviations.filter(d => d.status === 'matched').length;
  const minorDev = deviations.filter(d => d.status === 'minor_deviation').length;
  const majorDev = deviations.filter(d => d.status === 'major_deviation').length;
  const maxDeviation = Math.max(...deviations.map(d => d.distanceToBoundary));
  const avgDeviation = deviations.reduce((sum, d) => sum + d.distanceToBoundary, 0) / deviations.length;

  const matchPct = Math.round((matched / deviations.length) * 100);
  const valid = matchPct >= 70 && maxDeviation <= 20;

  return {
    valid,
    matchPct,
    matched,
    minorDev,
    majorDev,
    maxDeviation: Math.round(maxDeviation * 10) / 10,
    avgDeviation: Math.round(avgDeviation * 10) / 10,
    deviations,
    message: valid
      ? `Boundary verified — ${matchPct}% of GPS points match the registered boundary. Max deviation: ${Math.round(maxDeviation)}m.`
      : `Boundary discrepancy detected — only ${matchPct}% of GPS points match. Max deviation: ${Math.round(maxDeviation)}m. ${majorDev} point(s) show major deviation. Consider resurveying.`,
  };
}

/**
 * Start GPS tracking for boundary walk.
 * Returns an object with start/stop functions and current track state.
 * @param {Function} onUpdate - Callback called when new points are added
 * @returns {Object} Controller with start(), stop(), getTrack() methods
 */
export function createBoundaryTracker(onUpdate) {
  let track = [];
  let watchId = null;
  let active = false;

  return {
    start() {
      if (active) return;
      active = true;
      track = [];
      if (!navigator.geolocation) {
        throw new Error('GPS not supported on this device');
      }
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const point = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
          };
          // Only add points with acceptable accuracy
          if (point.accuracy <= ACCURACY_THRESHOLD_M) {
            // Throttle: only add if > 3m from last point
            const last = track[track.length - 1];
            if (!last || haversine(point.lat, point.lng, last.lat, last.lng) > 3) {
              track.push(point);
              if (onUpdate) onUpdate(track, point);
            }
          }
        },
        (err) => {
          if (onUpdate) onUpdate(track, null, err);
        },
        { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
      );
    },
    stop() {
      active = false;
      if (watchId != null) {
        navigator.geolocation.clearWatch(watchId);
        watchId = null;
      }
      return track;
    },
    getTrack() {
      return [...track];
    },
    isActive() {
      return active;
    },
  };
}
