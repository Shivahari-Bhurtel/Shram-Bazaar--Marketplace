import { useEffect, useRef } from "react"
import L from "leaflet"
import { MapContainer, Marker, Popup, ScaleControl, TileLayer, Tooltip, useMap } from "react-leaflet"
import { DEFAULT_JOB_MAP_CENTER, DEFAULT_JOB_MAP_ZOOM, JOB_MAP_AREAS } from "../../data/jobMapConfig"
import "leaflet/dist/leaflet.css"

type Props = {
  onBoundsChange?: (bounds: [number, number, number, number]) => void
  showcaseAreas?: ShowcaseAreaMarker[]
  onSelectShowcaseArea?: (area: ShowcaseAreaMarker) => void
  fitToJobs?: boolean
  focusArea?: string
  searchCurrentArea?: boolean
}

export type ShowcaseAreaMarker = { name: string; count: number; latitude: number; longitude: number }

const makeJobAreaIcon = (count: number) => {
  const size = Math.min(60, 48 + Math.round(Math.log2(count + 1) * 2))
  return L.divIcon({
    className: "job-map-marker-icon",
    html: `<span class="job-map-marker-letter" style="--job-marker-size:${size}px">J</span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  })
}

function FitDiscoveryJobs({ areas, enabled }: { areas: ShowcaseAreaMarker[]; enabled: boolean }) {
  const map = useMap()
  const hasFitRef = useRef(false)
  const signature = areas.map((area) => `${area.name}:${area.count}:${area.latitude}:${area.longitude}`).join("|")

  useEffect(() => {
    if (!enabled) {
      hasFitRef.current = false
      return
    }
    if (hasFitRef.current || !areas.length) return
    const points: L.LatLngExpression[] = areas.map((area): [number, number] => [area.latitude, area.longitude])
    if (points.length === 1) map.flyTo(points[0], Math.max(map.getZoom(), 12), { duration: 0.65 })
    else map.fitBounds(L.latLngBounds(points), { padding: [70, 70], maxZoom: 12, animate: true, duration: 0.7 })
    hasFitRef.current = true
  }, [enabled, signature, map])
  return null
}

function MapBoundsReporter({ enabled, onBoundsChange }: { enabled: boolean; onBoundsChange?: Props["onBoundsChange"] }) {
  const map = useMap()
  useEffect(() => {
    if (!enabled || !onBoundsChange) return
    const report = () => {
      const bounds = map.getBounds()
      onBoundsChange([bounds.getSouth(), bounds.getWest(), bounds.getNorth(), bounds.getEast()])
    }
    report()
    map.on("moveend", report)
    return () => { map.off("moveend", report) }
  }, [enabled, map, onBoundsChange])
  return null
}

function LocateControl() {
  const map = useMap()
  useEffect(() => {
    const control = new L.Control({ position: "topright" })
    control.onAdd = () => {
      const button = L.DomUtil.create("button", "leaflet-control-locate")
      button.type = "button"
      button.title = "Show my location"
      button.setAttribute("aria-label", "Show my location")
      button.innerHTML = "◎"
      L.DomEvent.disableClickPropagation(button)
      L.DomEvent.on(button, "click", () => {
        map.locate({ setView: false, enableHighAccuracy: true })
        map.once("locationfound", (event) => map.flyTo(event.latlng, Math.max(map.getZoom(), 14), { duration: 0.6 }))
      })
      return button
    }
    control.addTo(map)
    return () => { control.remove() }
  }, [map])
  return null
}

export default function JobDiscoveryMap({ onBoundsChange, showcaseAreas = [], onSelectShowcaseArea, fitToJobs = true, focusArea, searchCurrentArea = false }: Props) {
  return (
    <div className="h-full min-h-0 w-full overflow-hidden">
      <MapContainer
        center={[DEFAULT_JOB_MAP_CENTER[1], DEFAULT_JOB_MAP_CENTER[0]]}
        zoom={DEFAULT_JOB_MAP_ZOOM}
        minZoom={4}
        maxZoom={18}
        scrollWheelZoom
        dragging
        zoomControl
        className="h-full min-h-0 w-full"
        aria-label="Map showing approximate job listing areas"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />
        <ScaleControl position="bottomleft" metric imperial={false} />
        <LocateControl />
        <FitDiscoveryJobs areas={showcaseAreas} enabled={fitToJobs} />
        <MapBoundsReporter enabled={searchCurrentArea} onBoundsChange={onBoundsChange} />
        {showcaseAreas.map((area) => <Marker
          key={`showcase-area-${area.name}`}
          position={[area.latitude, area.longitude]}
          icon={makeJobAreaIcon(area.count)}
          eventHandlers={{ click: () => onSelectShowcaseArea?.(area) }}
        >
          <Tooltip direction="top" offset={[0, -20]}>{area.name} · {area.count} listings · approximate area</Tooltip>
          <Popup minWidth={190}><div className="job-map-preview"><p className="job-map-preview-category">Historical listings · unverified</p><strong>{area.name}</strong><span>{area.count} listings · approximate area</span><button type="button" onClick={() => onSelectShowcaseArea?.(area)}>Show {area.name} listings</button></div></Popup>
        </Marker>)}
        <FocusMapArea focusArea={focusArea} />
      </MapContainer>
    </div>
  )
}

function FocusMapArea({ focusArea }: { focusArea?: string }) {
  const map = useMap()
  useEffect(() => {
    if (!focusArea) return
    const area = JOB_MAP_AREAS[focusArea.trim().toLowerCase()]
    if (area) map.flyTo([area.center[1], area.center[0]], area.zoom, { duration: 0.65 })
  }, [focusArea, map])
  return null
}
