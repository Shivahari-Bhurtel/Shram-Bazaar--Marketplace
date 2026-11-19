/** Stored as [longitude, latitude]; Leaflet uses the reversed order at render time. */
export const DEFAULT_JOB_MAP_CENTER: [number, number] = [85.324, 27.7172]
export const DEFAULT_JOB_MAP_ZOOM = 12
export const OPENFREEMAP_LIBERTY_STYLE = "https://tiles.openfreemap.org/styles/liberty"

export const JOB_MAP_AREAS: Record<string, { center: [number, number]; zoom: number; aliases: string[] }> = {
  kathmandu: { center: [85.324, 27.7172], zoom: 12, aliases: ["kathmandu", "new baneshwor", "sinamangal", "thamel", "naxal", "koteshwor", "chabahil", "tripureshwor", "baneshwor", "boudha", "baluwatar", "pepsicola", "basundhara", "kalanki", "kirtipur", "tokha"] },
  "kathmandu valley": { center: [85.324, 27.7172], zoom: 11, aliases: ["kathmandu valley"] },
  lalitpur: { center: [85.3247, 27.6588], zoom: 12, aliases: ["lalitpur", "jawalakhel", "patan", "kupondole", "lagankhel", "sanepa", "kumaripati", "lubhu", "sunakothi", "bagdole"] },
  patan: { center: [85.3247, 27.6588], zoom: 14, aliases: ["patan"] },
  bhaktapur: { center: [85.4298, 27.671], zoom: 12, aliases: ["bhaktapur", "suryabinayak", "thimi", "byasi"] },
  pokhara: { center: [83.9856, 28.2096], zoom: 12, aliases: ["pokhara", "kaski"] },
  chitwan: { center: [84.3542, 27.5291], zoom: 11, aliases: ["chitwan", "bharatpur"] },
  biratnagar: { center: [87.3111, 26.6588], zoom: 12, aliases: ["biratnagar", "morang"] },
  dhangadhi: { center: [80.6, 28.7], zoom: 12, aliases: ["dhangadhi", "kailali"] },
  hetauda: { center: [85.0333, 27.4167], zoom: 11, aliases: ["hetauda", "makwanpur"] },
  bharatpur: { center: [84.3542, 27.5291], zoom: 12, aliases: ["bharatpur", "chitwan"] },
  butwal: { center: [83.4500, 27.5000], zoom: 12, aliases: ["butwal", "rupandehi", "bhairahawa"] },
  birgunj: { center: [84.87, 27.0], zoom: 12, aliases: ["birgunj", "parsa"] },
  janakpur: { center: [85.9263, 26.7288], zoom: 12, aliases: ["janakpur", "dhanusha"] },
  birendranagar: { center: [81.6, 28.6], zoom: 12, aliases: ["surkhet", "birendranagar"] },
}

export function findJobMapArea(location: string | null | undefined) {
  const normalized = location?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() || ""
  return Object.entries(JOB_MAP_AREAS).find(([, area]) => area.aliases.some((alias) => normalized.includes(alias)))
}
