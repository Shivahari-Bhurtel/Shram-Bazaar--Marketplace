import { useEffect, useMemo, useRef, useState } from "react"
import L from "leaflet"
import { Circle, CircleMarker, MapContainer, Marker, Pane, Polyline, ScaleControl, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet"
import type { DemoJob } from "../../services/demoJobs"
import { distanceBetweenKm } from "../../services/demoJobs"
import { DEFAULT_JOB_MAP_CENTER, DEFAULT_JOB_MAP_ZOOM } from "../../data/jobMapConfig"
import "leaflet/dist/leaflet.css"

type Coordinates = { latitude: number; longitude: number; accuracy?: number }
type Props = {
  jobs: DemoJob[]
  selectedJobId?: string
  routeJob?: DemoJob
  userLocation: Coordinates | null
  focusLocation?: Coordinates | null
  onSelectJob: (job: DemoJob) => void
  onCloseRoute: () => void
  onRequestLocation: () => void
  locating?: boolean
  locationMessage?: string
  onBoundsChange?: (bounds: [number, number, number, number]) => void
  onMapInteraction?: () => void
  fitToJobs?: boolean
  searchCurrentArea?: boolean
  active?: boolean
}

type JobCluster = { jobs: DemoJob[]; latitude: number; longitude: number }
type RoutePath = { positions: [number, number][]; distanceKm: number; durationMinutes: number | null; source: "road" | "straight" }

let lastOsrmRequestAt = 0
let osrmRequestQueue: Promise<void> = Promise.resolve()

function compactSalary(job: DemoJob) {
  if (!(job.salary_min > 0) || !(job.salary_max > 0)) return "Rs —"
  const compact = (amount: number) => amount >= 1000 ? `${Number((amount / 1000).toFixed(1))}k` : amount.toLocaleString()
  const range = job.salary_min === job.salary_max ? compact(job.salary_min) : `${compact(job.salary_min)}–${compact(job.salary_max)}`
  return `Rs ${range}`
}

const makeJobIcon = (job: DemoJob, selected = false) => {
  return L.divIcon({
    className: `job-map-marker-icon${selected ? " is-selected" : ""}`,
    html: `<span class="job-map-salary-bubble${selected ? " is-selected" : ""}">${compactSalary(job)}</span>`,
  })
}

const makeClusterIcon = (count: number, selected = false) => {
  const size = Math.min(48, 34 + Math.round(Math.log2(count) * 3))
  return L.divIcon({
    className: "job-map-marker-icon",
    html: `<span class="job-map-cluster${selected ? " is-selected" : ""}" style="--job-cluster-size:${size}px">${count}</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function clusterRadiusKm(zoom: number) {
  if (zoom >= 16) return 0
  if (zoom >= 15) return 0.12
  if (zoom >= 14) return 0.3
  if (zoom >= 13) return 0.65
  if (zoom >= 12) return 1.2
  return 3
}

function hasCoordinates(value: { latitude?: number; longitude?: number } | undefined): value is { latitude: number; longitude: number } {
  return !!value
    && Number.isFinite(value.latitude) && value.latitude! >= -90 && value.latitude! <= 90
    && Number.isFinite(value.longitude) && value.longitude! >= -180 && value.longitude! <= 180
}

function makeClusters(jobs: DemoJob[], zoom: number, selectedJobId?: string): JobCluster[] {
  const radius = clusterRadiusKm(zoom)
  const clusters: JobCluster[] = []
  const mappableJobs = jobs.filter((job) => hasCoordinates(job))
  const selectedJob = mappableJobs.find((job) => job.id === selectedJobId)
  for (const job of mappableJobs) {
    if (job.id === selectedJobId) continue
    const closest = radius === 0 ? undefined : clusters.find((cluster) => distanceBetweenKm(cluster, job) <= radius)
    if (closest) {
      closest.jobs.push(job)
      closest.latitude = closest.jobs.reduce((total, item) => total + item.latitude, 0) / closest.jobs.length
      closest.longitude = closest.jobs.reduce((total, item) => total + item.longitude, 0) / closest.jobs.length
    } else {
      clusters.push({ jobs: [job], latitude: job.latitude, longitude: job.longitude })
    }
  }
  if (selectedJob) clusters.push({ jobs: [selectedJob], latitude: selectedJob.latitude, longitude: selectedJob.longitude })
  return clusters
}

function FitJobs({ jobs, enabled }: { jobs: DemoJob[]; enabled: boolean }) {
  const map = useMap()
  const lastFitSignature = useRef("")
  const signature = jobs.map((job) => job.id).sort().join("|")
  useEffect(() => {
    if (!enabled) {
      lastFitSignature.current = ""
      return
    }
    if (!jobs.length) {
      lastFitSignature.current = ""
      return
    }
    if (lastFitSignature.current === signature) return
    if (jobs.length === 1) map.flyTo([jobs[0].latitude, jobs[0].longitude], 14, { duration: 0.5 })
    else map.fitBounds(L.latLngBounds(jobs.map((job): [number, number] => [job.latitude, job.longitude])), { padding: [60, 60], maxZoom: 12, animate: true, duration: 0.5 })
    lastFitSignature.current = signature
  }, [enabled, jobs, signature, map])
  return null
}

function MapEvents({ enabled, onBoundsChange }: Pick<Props, "searchCurrentArea" | "onBoundsChange"> & { enabled: boolean }) {
  const map = useMapEvents({
    moveend: () => {
      if (!enabled) return
      const bounds = map.getBounds()
      onBoundsChange?.([bounds.getSouth(), bounds.getWest(), bounds.getNorth(), bounds.getEast()])
    },
  })
  useEffect(() => {
    if (!enabled) return
    const bounds = map.getBounds()
    onBoundsChange?.([bounds.getSouth(), bounds.getWest(), bounds.getNorth(), bounds.getEast()])
  }, [enabled, map, onBoundsChange])
  return null
}

function MapInteractionReporter({ onInteraction }: { onInteraction?: () => void }) {
  const map = useMap()
  useEffect(() => {
    const container = map.getContainer()
    const reportInteraction = () => onInteraction?.()
    container.addEventListener("pointerdown", reportInteraction, { passive: true })
    container.addEventListener("wheel", reportInteraction, { passive: true })
    container.addEventListener("keydown", reportInteraction)
    return () => {
      container.removeEventListener("pointerdown", reportInteraction)
      container.removeEventListener("wheel", reportInteraction)
      container.removeEventListener("keydown", reportInteraction)
    }
  }, [map, onInteraction])
  return null
}

function FocusSelectedJob({ job, enabled }: { job?: DemoJob; enabled: boolean }) {
  const map = useMap()
  useEffect(() => {
    if (enabled && job && hasCoordinates(job)) map.flyTo([job.latitude, job.longitude], Math.max(map.getZoom(), 15), { duration: 0.55 })
  }, [enabled, job?.id, map])
  return null
}

function FocusUserLocation({ location, enabled }: { location: Coordinates | null; enabled: boolean }) {
  const map = useMap()
  useEffect(() => {
    if (enabled && location && hasCoordinates(location)) map.flyTo([location.latitude, location.longitude], 14, { duration: 0.7 })
  }, [enabled, location?.latitude, location?.longitude, map])
  return null
}

function FocusManualLocation({ location }: { location: Coordinates | null | undefined }) {
  const map = useMap()
  useEffect(() => {
    if (location) map.flyTo([location.latitude, location.longitude], Math.max(map.getZoom(), 14), { duration: 0.55 })
  }, [location?.latitude, location?.longitude, map])
  return null
}

function ResizeMapOnShow({ active }: { active: boolean }) {
  const map = useMap()
  useEffect(() => {
    if (!active) return
    const frame = requestAnimationFrame(() => map.invalidateSize({ pan: false }))
    return () => cancelAnimationFrame(frame)
  }, [active, map])
  return null
}

function RouteViewport({ origin, destination, active }: { origin: Coordinates; destination: DemoJob; active: boolean }) {
  const map = useMap()
  const signature = `${origin.latitude},${origin.longitude}:${destination.id}:${destination.latitude},${destination.longitude}`
  const lastFit = useRef("")
  useEffect(() => {
    if (!active || !hasCoordinates(origin) || !hasCoordinates(destination) || lastFit.current === signature) return
    if (origin.latitude === destination.latitude && origin.longitude === destination.longitude) {
      map.flyTo([destination.latitude, destination.longitude], Math.min(16, Math.max(map.getZoom(), 14)), { duration: 0.55 })
    } else {
      map.fitBounds(L.latLngBounds([origin.latitude, origin.longitude], [destination.latitude, destination.longitude]), {
        padding: [100, 100],
        maxZoom: 15,
        animate: true,
        duration: 0.55,
      })
    }
    lastFit.current = signature
  }, [active, destination, map, origin, signature])
  return null
}

async function waitForOsrmSlot(signal: AbortSignal) {
  const previousRequest = osrmRequestQueue
  let releaseQueue!: () => void
  osrmRequestQueue = new Promise<void>((resolve) => { releaseQueue = resolve })
  await previousRequest
  try {
    if (signal.aborted) throw new DOMException("Route request cancelled.", "AbortError")
    const delay = Math.max(0, lastOsrmRequestAt + 1100 - Date.now())
    if (delay) await new Promise<void>((resolve, reject) => {
      const onAbort = () => {
        clearTimeout(timer)
        reject(new DOMException("Route request cancelled.", "AbortError"))
      }
      const timer = setTimeout(() => {
        signal.removeEventListener("abort", onAbort)
        resolve()
      }, delay)
      signal.addEventListener("abort", onAbort, { once: true })
    })
    if (signal.aborted) throw new DOMException("Route request cancelled.", "AbortError")
    lastOsrmRequestAt = Date.now()
  } finally {
    releaseQueue()
  }
}

async function fetchRoadRoute(origin: Coordinates, destination: DemoJob, signal: AbortSignal): Promise<RoutePath> {
  await waitForOsrmSlot(signal)

  const coordinates = `${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}`
  const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson&steps=false`
  const response = await fetch(url, { signal, headers: { Accept: "application/json" } })
  if (!response.ok) throw new Error(`Road routing failed (${response.status}).`)

  const result = await response.json() as {
    code?: string
    routes?: Array<{
      distance?: number
      duration?: number
      geometry?: { coordinates?: unknown }
    }>
  }
  const route = result.routes?.[0]
  const rawCoordinates = route?.geometry?.coordinates
  if (result.code !== "Ok" || !route || !Array.isArray(rawCoordinates) || rawCoordinates.length < 2) {
    throw new Error("No road route is available for this job.")
  }

  const positions = rawCoordinates.map((point): [number, number] | null => {
    if (!Array.isArray(point) || point.length < 2) return null
    const [longitude, latitude] = point
    if (typeof latitude !== "number" || typeof longitude !== "number" || !hasCoordinates({ latitude, longitude })) return null
    return [latitude, longitude]
  })
  if (positions.some((point) => point === null)) throw new Error("The road service returned invalid route coordinates.")

  return {
    positions: positions as [number, number][],
    distanceKm: typeof route.distance === "number" && Number.isFinite(route.distance) ? route.distance / 1000 : distanceBetweenKm(origin, destination),
    durationMinutes: typeof route.duration === "number" && Number.isFinite(route.duration) ? Math.max(1, Math.round(route.duration / 60)) : null,
    source: "road",
  }
}

function RouteVisualization({ origin, destination, onCloseRoute }: { origin: Coordinates; destination: DemoJob; onCloseRoute: () => void }) {
  const signature = `${destination.id}:${origin.latitude},${origin.longitude}:${destination.latitude},${destination.longitude}`
  const straightRoute = useMemo<RoutePath>(() => ({
    positions: [[origin.latitude, origin.longitude], [destination.latitude, destination.longitude]],
    distanceKm: distanceBetweenKm(origin, destination),
    durationMinutes: null,
    source: "straight",
  }), [destination.latitude, destination.longitude, origin.latitude, origin.longitude])
  const [routeState, setRouteState] = useState<{ signature: string; route: RoutePath | null; loading: boolean; failed: boolean }>({ signature: "", route: null, loading: true, failed: false })

  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false
    const timeout = setTimeout(() => controller.abort(), 9000)
    setRouteState({ signature, route: null, loading: true, failed: false })
    void fetchRoadRoute(origin, destination, controller.signal)
      .then((route) => {
        if (!cancelled) setRouteState({ signature, route, loading: false, failed: false })
      })
      .catch(() => {
        if (!cancelled) setRouteState({ signature, route: null, loading: false, failed: true })
      })
      .finally(() => clearTimeout(timeout))
    return () => {
      cancelled = true
      controller.abort()
      clearTimeout(timeout)
    }
  }, [destination, origin.latitude, origin.longitude, signature])

  const stateIsCurrent = routeState.signature === signature
  const route = stateIsCurrent && routeState.route ? routeState.route : straightRoute
  const loading = !stateIsCurrent || routeState.loading
  const failed = stateIsCurrent && routeState.failed

  return <>
    <RouteViewport origin={origin} destination={destination} active />
    <Pane name="job-route-pane" style={{ zIndex: 420, pointerEvents: "none" }}>
      <Polyline positions={route.positions} pathOptions={{ color: "#fff", weight: 10, opacity: 0.95, lineCap: "round", lineJoin: "round" }} interactive={false} />
      <Polyline positions={route.positions} pathOptions={{
        color: "#4285F4",
        weight: route.source === "road" ? 6 : 5,
        opacity: 0.98,
        lineCap: "round",
        lineJoin: "round",
        ...(route.source === "straight" ? { dashArray: "9 8" } : {}),
      }} interactive={false} />
    </Pane>
    <RoutePanel job={destination} route={route} loading={loading} failed={failed} onCloseRoute={onCloseRoute} />
  </>
}

function RoutePanel({ job, route, loading, failed, onCloseRoute }: { job: DemoJob; route: RoutePath; loading: boolean; failed: boolean; onCloseRoute: () => void }) {
  return <div className="absolute bottom-16 right-4 z-[650] w-[min(92%,340px)] rounded-xl border border-stone-200 bg-white/95 p-3.5 shadow-[0_12px_32px_-18px_rgba(26,45,70,.45)] backdrop-blur">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-[#4285F4]">{route.source === "road" ? "Driving route" : "Straight-line estimate"}</p>
    <p className="mt-1 truncate text-sm font-semibold text-stone-900">{job.title}</p>
    <p className="truncate text-xs text-stone-600">{job.location}, {job.city}</p></div><button type="button" onClick={onCloseRoute} aria-label="Close route" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-lg leading-none text-stone-500 hover:bg-stone-100">×</button></div>
    <div className="mt-2 flex items-baseline justify-between gap-3">
      <p className="text-sm font-semibold text-stone-900">{formatRouteDistance(route.distanceKm)}{route.source === "straight" ? " direct" : ""}</p>
      {route.durationMinutes != null && <p className="text-xs text-stone-600">About {route.durationMinutes} min</p>}
    </div>
    {loading && <p role="status" className="mt-1 text-[11px] text-stone-500">Finding a road route… showing the direct estimate meanwhile.</p>}
    {!loading && failed && <p className="mt-1 text-[11px] text-stone-500">Road routing is unavailable; this is a direct estimate, not a road route.</p>}
  </div>
}

function formatRouteDistance(distanceKm: number) {
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m`
  return `${distanceKm.toFixed(1)} km`
}

function RouteLocationPrompt({ job, locationMessage, locating, onRequestLocation, onCloseRoute }: {
  job: DemoJob
  locationMessage?: string
  locating: boolean
  onRequestLocation: () => void
  onCloseRoute: () => void
}) {
  const message = locationMessage?.toLowerCase().includes("denied")
    ? "Location permission is off. Enable it in your browser settings, then retry."
    : locationMessage?.toLowerCase().includes("unavailable") || locationMessage?.toLowerCase().includes("cannot") || locationMessage?.toLowerCase().includes("could not")
      ? "Your current location could not be read. Check GPS access and retry."
      : "Enable current location to see a route to this job."
  return <div className="absolute bottom-16 right-4 z-[650] w-[min(92%,340px)] rounded-xl border border-stone-200 bg-white/95 p-3.5 shadow-[0_12px_32px_-18px_rgba(26,45,70,.45)] backdrop-blur">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-[#4285F4]">Route to job</p><p className="mt-1 truncate text-sm font-semibold text-stone-900">{job.title}</p><p className="truncate text-xs text-stone-600">{job.location}, {job.city}</p></div>
      <button type="button" onClick={onCloseRoute} aria-label="Close route" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-lg leading-none text-stone-500 hover:bg-stone-100">×</button>
    </div>
    <p className="mt-2 text-xs leading-relaxed text-stone-600">{message}</p>
    <button type="button" onClick={onRequestLocation} disabled={locating} className="mt-3 rounded-lg bg-[#4285F4] px-3 py-2 text-xs font-semibold text-white hover:bg-[#2f6fd4] disabled:opacity-60">{locating ? "Finding your location…" : "Enable location"}</button>
  </div>
}

function RouteUnavailablePanel({ job, onCloseRoute }: { job: DemoJob; onCloseRoute: () => void }) {
  return <div className="absolute bottom-16 right-4 z-[650] w-[min(92%,340px)] rounded-xl border border-stone-200 bg-white/95 p-3.5 shadow-lg backdrop-blur">
    <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-[#4285F4]">Route unavailable</p><p className="mt-1 truncate text-sm font-semibold text-stone-900">{job.title}</p></div><button type="button" onClick={onCloseRoute} aria-label="Close route" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-lg leading-none text-stone-500 hover:bg-stone-100">×</button></div>
    <p className="mt-2 text-xs text-stone-600">This job has no valid map coordinates.</p>
  </div>
}

export default function JobDiscoveryMap({ jobs, selectedJobId, routeJob, userLocation, focusLocation, onSelectJob, onCloseRoute, onRequestLocation, locating = false, locationMessage, onBoundsChange, onMapInteraction, fitToJobs = true, searchCurrentArea = false, active = true }: Props) {
  const [zoom, setZoom] = useState(DEFAULT_JOB_MAP_ZOOM)
  const [tileError, setTileError] = useState(false)
  const [tileRetry, setTileRetry] = useState(0)
  const mappableJobs = useMemo(() => jobs.filter((job) => hasCoordinates(job)), [jobs])
  const map = useMemo(() => makeClusters(mappableJobs, zoom, selectedJobId), [mappableJobs, selectedJobId, zoom])
  const routeActive = Boolean(routeJob)
  const validOrigin = userLocation && hasCoordinates(userLocation) ? userLocation : null
  const validDestination = routeJob && hasCoordinates(routeJob)

  return (
    <div className="relative h-full min-h-0 w-full overflow-hidden">
      <MapContainer center={[DEFAULT_JOB_MAP_CENTER[1], DEFAULT_JOB_MAP_CENTER[0]]} zoom={DEFAULT_JOB_MAP_ZOOM} minZoom={8} maxZoom={19} scrollWheelZoom dragging zoomControl className="h-full min-h-0 w-full" aria-label="Map of Kathmandu Valley jobs">
        <TileLayer key={tileRetry} attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} eventHandlers={{
          tileerror: () => setTileError(true),
          load: () => setTileError(false),
        }} />
        <ScaleControl position="bottomleft" metric imperial={false} />
        <ResizeMapOnShow active={active} />
        <MapZoomReporter onZoom={setZoom} />
        <MapInteractionReporter onInteraction={onMapInteraction} />
        <FitJobs jobs={mappableJobs} enabled={active && fitToJobs && !userLocation && !routeActive} />
        <MapEvents enabled={searchCurrentArea} searchCurrentArea={searchCurrentArea} onBoundsChange={onBoundsChange} />
        <FocusSelectedJob job={mappableJobs.find((job) => job.id === selectedJobId)} enabled={!routeActive} />
        <FocusManualLocation location={focusLocation} />
        <FocusUserLocation location={validOrigin} enabled={!routeActive} />
        {validOrigin && <><Circle center={[validOrigin.latitude, validOrigin.longitude]} radius={Math.max(15, validOrigin.accuracy || 0)} pathOptions={{ color: "#4285F4", weight: 1, fillColor: "#4285F4", fillOpacity: 0.12 }} /><CircleMarker center={[validOrigin.latitude, validOrigin.longitude]} radius={13} pathOptions={{ color: "#4285F4", weight: 2, fillColor: "#4285F4", fillOpacity: 0.2 }} /><CircleMarker center={[validOrigin.latitude, validOrigin.longitude]} radius={5} pathOptions={{ color: "white", weight: 2, fillColor: "#4285F4", fillOpacity: 1 }}><Tooltip direction="top">Your current location{validOrigin.accuracy ? ` · ±${Math.round(validOrigin.accuracy)} m` : ""}</Tooltip></CircleMarker></>}
        {routeActive && validOrigin && validDestination && <RouteVisualization origin={validOrigin} destination={routeJob} onCloseRoute={onCloseRoute} />}
        {map.map((cluster) => {
          const clustered = cluster.jobs.length > 1
          const selected = cluster.jobs.some((job) => job.id === selectedJobId)
          const job = cluster.jobs[0]
          return <Marker
            key={cluster.jobs.map((item) => item.id).join(":")}
            position={[cluster.latitude, cluster.longitude]}
            icon={clustered ? makeClusterIcon(cluster.jobs.length, selected) : makeJobIcon(job, selected)}
            zIndexOffset={selected ? 1000 : clustered ? 100 : 0}
            riseOnHover
            eventHandlers={{ click: (event) => {
              if (clustered) {
                const mapInstance = event.target._map as L.Map
                mapInstance.flyTo([cluster.latitude, cluster.longitude], Math.min(mapInstance.getZoom() + 2, 16), { duration: 0.45 })
              } else onSelectJob(job)
            } }}
          >
            <Tooltip direction="top" offset={[0, -18]}>{clustered ? `${cluster.jobs.length} jobs · zoom in to explore` : `${job.title} · approximate workplace`}</Tooltip>
          </Marker>
        })}
      </MapContainer>
      {routeJob && !validOrigin && <RouteLocationPrompt job={routeJob} locationMessage={locationMessage} locating={locating} onRequestLocation={onRequestLocation} onCloseRoute={onCloseRoute} />}
      {routeJob && validOrigin && !validDestination && <RouteUnavailablePanel job={routeJob} onCloseRoute={onCloseRoute} />}
      {tileError && <div role="status" className="absolute bottom-14 left-1/2 z-[600] flex w-[min(92%,440px)] -translate-x-1/2 items-center gap-3 rounded-xl border border-stone-200 bg-white/95 px-4 py-3 text-xs text-stone-700 shadow-lg backdrop-blur">
        <span className="flex-1">Map tiles are temporarily unavailable. Jobs are still available in the list.</span>
        <button type="button" onClick={() => { setTileError(false); setTileRetry((retry) => retry + 1) }} className="shrink-0 rounded-lg bg-[#80502F] px-3 py-2 font-semibold text-white hover:bg-[#553421]">Retry map</button>
      </div>}
    </div>
  )
}

function MapZoomReporter({ onZoom }: { onZoom: (zoom: number) => void }) {
  useMapEvents({
    zoomend: (event) => onZoom(event.target.getZoom()),
  })
  return null
}
