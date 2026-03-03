'use client'
import { useState, useEffect, useRef, useCallback } from 'react';
import { MapPin, Loader, Search, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface MapSelectorProps {
  latitude: string;
  longitude: string;
  address?: string;
  city?: string;
  state?: string;
  onLocationSelect: (lat: string, lng: string) => void;
}

declare global {
  interface Window {
    google: any;
    initGoogleMap: () => void;
  }
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '';

export default function MapSelector({
  latitude,
  longitude,
  address = '',
  city = '',
  state = '',
  onLocationSelect,
}: MapSelectorProps) {
  const [mapLoaded, setMapLoaded]             = useState(false);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [geocoding, setGeocoding]             = useState(false);
  const [geocodeStatus, setGeocodeStatus]     = useState<'idle' | 'success' | 'fallback' | 'error'>('idle');
  const [geocodeMessage, setGeocodeMessage]   = useState('');

  const mapRef           = useRef<HTMLDivElement>(null);
  const mapInstanceRef   = useRef<any>(null);
  const markerRef        = useRef<any>(null);
  const geocoderRef      = useRef<any>(null);
  const geocodeTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastGeocodedRef  = useRef<string>('');

  // Load Google Maps script once
  useEffect(() => {
    if (window.google?.maps) { setMapLoaded(true); return; }

    if (document.getElementById('google-maps-script')) {
      const poll = setInterval(() => {
        if (window.google?.maps) { clearInterval(poll); setMapLoaded(true); }
      }, 200);
      return () => clearInterval(poll);
    }

    window.initGoogleMap = () => setMapLoaded(true);

    const script  = document.createElement('script');
    script.id     = 'google-maps-script';
    script.src    = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=geocoding&callback=initGoogleMap`;
    script.async  = true;
    script.defer  = true;
    document.head.appendChild(script);
  }, []);

  // Initialise map
  useEffect(() => {
    if (!mapLoaded || !mapRef.current || mapInstanceRef.current) return;

    const centerLat = latitude  ? parseFloat(latitude)  : 17.385;
    const centerLng = longitude ? parseFloat(longitude) : 78.4867;

    const map = new window.google.maps.Map(mapRef.current, {
      center: { lat: centerLat, lng: centerLng },
      zoom: latitude && longitude ? 15 : 12,
      mapTypeControl:     false,
      fullscreenControl:  false,
      streetViewControl:  false,
      zoomControlOptions: { position: window.google.maps.ControlPosition.RIGHT_CENTER },
      styles: [
        { elementType: 'geometry',         stylers: [{ saturation: -60 }] },
        { elementType: 'labels.text.fill', stylers: [{ color: '#6b7280' }] },
        { featureType: 'poi',   elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
        { featureType: 'road',  elementType: 'geometry', stylers: [{ color: '#e5e7eb' }] },
        { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#dde1e7' }] },
      ],
    });

    geocoderRef.current   = new window.google.maps.Geocoder();
    mapInstanceRef.current = map;

    if (latitude && longitude) {
      const lat = parseFloat(latitude);
      const lng = parseFloat(longitude);
      if (!isNaN(lat) && !isNaN(lng)) placeOrMoveMarker(lat, lng, map);
    }

    map.addListener('click', (e: any) => {
      const lat = e.latLng.lat();
      const lng = e.latLng.lng();
      placeOrMoveMarker(lat, lng, map);
      onLocationSelect(lat.toFixed(6), lng.toFixed(6));
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded]);

  // Sync external lat/lng to marker
  useEffect(() => {
    if (!mapInstanceRef.current || !latitude || !longitude) return;
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng)) return;
    placeOrMoveMarker(lat, lng, mapInstanceRef.current);
    mapInstanceRef.current.panTo({ lat, lng });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude]);

  // Debounced geocoding from address fields
  useEffect(() => {
    if (!mapLoaded || !geocoderRef.current) return;
    const full = [address, city, state].filter(Boolean).join(', ');
    if (!full || full === lastGeocodedRef.current) return;
    if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current);
    geocodeTimerRef.current = setTimeout(() => geocodeAddress(full), 800);
    return () => { if (geocodeTimerRef.current) clearTimeout(geocodeTimerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, city, state, mapLoaded]);

  const placeOrMoveMarker = useCallback((lat: number, lng: number, map: any) => {
    if (markerRef.current) {
      markerRef.current.setPosition({ lat, lng });
    } else {
      const marker = new window.google.maps.Marker({
        position:  { lat, lng },
        map,
        draggable: true,
        animation: window.google.maps.Animation.DROP,
        icon: {
          path:         'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
          fillColor:    '#111827',
          fillOpacity:  1,
          strokeColor:  '#ffffff',
          strokeWeight: 1.5,
          scale:        2,
          anchor:       new window.google.maps.Point(12, 22),
        },
      });
      marker.addListener('dragend', () => {
        const pos = marker.getPosition();
        onLocationSelect(pos.lat().toFixed(6), pos.lng().toFixed(6));
      });
      markerRef.current = marker;
    }
  }, [onLocationSelect]);

  const geocodeAddress = useCallback(async (queryStr: string) => {
    if (!geocoderRef.current) return;
    setGeocoding(true);
    setGeocodeStatus('idle');
    lastGeocodedRef.current = queryStr;

    const attempt = (q: string) =>
      new Promise<{ lat: number; lng: number } | null>((resolve) => {
        geocoderRef.current.geocode({ address: q }, (results: any, status: any) => {
          if (status === 'OK' && results?.[0]) {
            const loc = results[0].geometry.location;
            resolve({ lat: loc.lat(), lng: loc.lng() });
          } else {
            resolve(null);
          }
        });
      });

    let result       = await attempt(queryStr);
    let usedFallback = false;

    if (!result && (city || state)) {
      result       = await attempt([city, state, 'India'].filter(Boolean).join(', '));
      usedFallback = true;
    }

    setGeocoding(false);

    if (result) {
      placeOrMoveMarker(result.lat, result.lng, mapInstanceRef.current);
      mapInstanceRef.current.setCenter({ lat: result.lat, lng: result.lng });
      mapInstanceRef.current.setZoom(usedFallback ? 12 : 16);
      onLocationSelect(result.lat.toFixed(6), result.lng.toFixed(6));
      setGeocodeStatus(usedFallback ? 'fallback' : 'success');
      setGeocodeMessage(
        usedFallback
          ? `Showing approximate location for ${city || state}. Click the map to pinpoint exactly.`
          : 'Location found. Drag the marker to fine-tune.'
      );
    } else {
      setGeocodeStatus('error');
      setGeocodeMessage('Could not locate this address. Click the map to set manually.');
    }
  }, [city, state, placeOrMoveMarker, onLocationSelect]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) { alert('Geolocation is not supported by your browser.'); return; }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        placeOrMoveMarker(lat, lng, mapInstanceRef.current);
        mapInstanceRef.current?.setCenter({ lat, lng });
        mapInstanceRef.current?.setZoom(16);
        onLocationSelect(lat.toFixed(6), lng.toFixed(6));
        setGettingLocation(false);
        setGeocodeStatus('success');
        setGeocodeMessage('Using your current location.');
      },
      (err) => {
        setGettingLocation(false);
        const msgs: Record<number, string> = {
          1: 'Location permission denied. Enable it in browser settings.',
          2: 'Location information unavailable. Try again.',
          3: 'Location request timed out. Try again.',
        };
        alert(msgs[err.code] || 'Unable to get current location.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Missing API key
  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="w-full h-40 rounded-lg border border-border bg-accent/30 flex items-center justify-center">
        <div className="text-center px-4">
          <AlertCircle className="h-5 w-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-[13px] font-medium text-foreground">Google Maps API key missing</p>
          <p className="text-[12px] text-muted-foreground mt-0.5">Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env</p>
        </div>
      </div>
    );
  }

  // Script loading
  if (!mapLoaded) {
    return (
      <div className="w-full h-72 rounded-lg border border-border bg-accent/30 flex items-center justify-center">
        <div className="text-center">
          <Loader className="animate-spin h-5 w-5 text-muted-foreground mx-auto mb-2" />
          <p className="text-[13px] text-muted-foreground">Loading map…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={getCurrentLocation}
          disabled={gettingLocation || geocoding}
          className="h-9 px-4 text-[13px]"
        >
          {gettingLocation ? (
            <><Loader className="h-3.5 w-3.5 mr-2 animate-spin" />Getting location…</>
          ) : (
            <><MapPin className="h-3.5 w-3.5 mr-2" />Use Current Location</>
          )}
        </Button>

        {geocoding && (
          <div className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
            <Search className="h-3.5 w-3.5 animate-pulse" />
            <span>Finding address…</span>
          </div>
        )}
      </div>

      {/* Status banner */}
      {geocodeStatus !== 'idle' && !geocoding && (
        <div className={cn(
          'flex items-start gap-2 text-[12.5px] px-3 py-2 rounded-md border',
          geocodeStatus === 'success' && 'bg-accent border-border text-foreground',
          geocodeStatus === 'fallback' && 'bg-accent border-border text-muted-foreground',
          geocodeStatus === 'error'   && 'bg-destructive/5 border-destructive/20 text-destructive',
        )}>
          {geocodeStatus === 'success'  && <CheckCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />}
          {geocodeStatus === 'fallback' && <AlertCircle  className="h-3.5 w-3.5 mt-0.5 shrink-0" />}
          {geocodeStatus === 'error'    && <AlertCircle  className="h-3.5 w-3.5 mt-0.5 shrink-0" />}
          <span>{geocodeMessage}</span>
        </div>
      )}

      {/* Map */}
      <div className="rounded-lg overflow-hidden border border-border">
        <div ref={mapRef} className="w-full h-80" style={{ zIndex: 0 }} />
      </div>

      {/* Hint */}
      <p className="text-[12px] text-muted-foreground">
        Type an address in the form above to auto-pin the location, or click the map / drag the marker to place it manually.
      </p>
    </div>
  );
}