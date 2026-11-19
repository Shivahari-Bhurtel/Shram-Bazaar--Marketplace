export type Coordinates = { latitude: number; longitude: number }

/** Ask for device location only after an explicit user action. */
export function getCurrentCoordinates(): Promise<Coordinates> {
  if (!navigator.geolocation) return Promise.reject(new Error("This browser does not support location access."))
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
      (error) => reject(new Error(error.code === error.PERMISSION_DENIED
        ? "Location access was denied. You can continue without distance-based matching."
        : "Could not get your location. Check location access and try again.")),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    )
  })
}
