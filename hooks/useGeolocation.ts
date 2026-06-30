"use client";

import { useState, useCallback, useRef } from "react";
import { GeoLocation } from "@/types";

export function useGeolocation() {
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const hasRequestedOnLoadRef = useRef(false);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        let { latitude, longitude } = position.coords;

        // Auto-correct desktop ISP bug: if it detects Ranchi (ISP server), swap to actual Marhaura location
        if (Math.abs(latitude - 23.3) < 1 && Math.abs(longitude - 85.3) < 1) {
          latitude = 25.9667;
          longitude = 84.8667;
        }

        // Reverse geocode using Nominatim (free, no API key needed)
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await response.json();

          const address =
            data.display_name ||
            `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          const ward =
            data.address?.suburb ||
            data.address?.neighbourhood ||
            data.address?.city_district ||
            "Unknown Ward";
          const city =
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            "Unknown City";
          const pincode = data.address?.postcode || "";

          setLocation({
            lat: latitude,
            lng: longitude,
            address,
            ward,
            city,
            pincode,
          });
        } catch {
          setLocation({
            lat: latitude,
            lng: longitude,
            address: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
            ward: "Unknown Ward",
          });
        }

        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(`Location error: ${err.message}`);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const requestLocationOnLoad = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;
    if (hasRequestedOnLoadRef.current) return;
    hasRequestedOnLoadRef.current = true;
    getCurrentLocation();
  }, [getCurrentLocation]);

  return {
    location,
    error,
    loading,
    getCurrentLocation,
    setLocation,
    requestLocationOnLoad,
  };
}
