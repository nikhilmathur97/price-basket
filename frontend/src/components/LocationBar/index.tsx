"use client";

import { useState, useEffect } from "react";
import {
  MapPin, Navigation, Search, X, ChevronDown,
  Loader2, CheckCircle2, MapPinned,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocationStore } from "@/store/locationStore";
import { useAuthStore } from "@/store/authStore";

const POPULAR_CITIES = [
  { city: "Mumbai",    pincode: "400001" },
  { city: "Delhi",     pincode: "110001" },
  { city: "Bengaluru", pincode: "560001" },
  { city: "Hyderabad", pincode: "500001" },
  { city: "Chennai",   pincode: "600001" },
  { city: "Pune",      pincode: "411001" },
  { city: "Kolkata",   pincode: "700001" },
  { city: "Ahmedabad", pincode: "380001" },
  { city: "Jaipur",    pincode: "302001" },
  { city: "Lucknow",   pincode: "226001" },
  { city: "Surat",     pincode: "395001" },
  { city: "Chandigarh",pincode: "160001" },
];

export function LocationBar({ variant = "header" }: { variant?: "header" | "hero" }) {
  const { current, setLocation } = useLocationStore();
  const { user, isAuthenticated } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Pre-fill location from user profile when authenticated
  useEffect(() => {
    if (isAuthenticated && user?.city && !current) {
      setLocation({
        label: user.city + (user.pincode ? `, ${user.pincode}` : ""),
        city: user.city,
        pincode: user.pincode ?? null,
        lat: null,
        lng: null,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user]);

  const filtered =
    query.length >= 2
      ? POPULAR_CITIES.filter(
          (c) =>
            c.city.toLowerCase().includes(query.toLowerCase()) ||
            c.pincode.startsWith(query)
        )
      : POPULAR_CITIES;

  async function handleGPS() {
    if (!navigator.geolocation) {
      setGpsError("GPS is not supported by your browser.");
      return;
    }
    setGpsLoading(true);
    setGpsError("");
    try {
      const pos = await new Promise<GeolocationPosition>((res, rej) =>
        navigator.geolocation.getCurrentPosition(res, rej, {
          timeout: 10000,
          enableHighAccuracy: true,
        })
      );
      const { latitude: lat, longitude: lng } = pos.coords;
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { "Accept-Language": "en" } }
      );
      const data = await res.json();
      const addr = data.address ?? {};
      const city =
        addr.city || addr.town || addr.suburb || addr.county || addr.village || "Your location";
      const pincode = addr.postcode ?? null;
      setLocation({
        label: city + (pincode ? `, ${pincode}` : ""),
        city,
        pincode,
        lat,
        lng,
      });
      setOpen(false);
    } catch (e: unknown) {
      const err = e as GeolocationPositionError;
      setGpsError(
        err?.code === 1
          ? "Location access denied. Please allow in browser settings."
          : "Unable to get location. Try searching manually."
      );
    } finally {
      setGpsLoading(false);
    }
  }

  function selectCity(city: string, pincode: string) {
    setLocation({ label: `${city}, ${pincode}`, city, pincode, lat: null, lng: null });
    setOpen(false);
    setQuery("");
  }

  if (!mounted) {
    // SSR placeholder — same width so layout doesn't shift
    return (
      <div className="flex items-center gap-1 opacity-0 pointer-events-none">
        <MapPin className="w-3.5 h-3.5" />
        <span className="text-[11px]">Set location</span>
        <ChevronDown className="w-3 h-3" />
      </div>
    );
  }

  const label = current?.label ?? null;

  return (
    <>
      {/* ── Trigger button ── */}
      {variant === "hero" ? (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 group w-full"
        >
          <MapPin className="w-3.5 h-3.5 text-yellow-300 flex-shrink-0" />
          <span className="text-orange-100 text-[11px]">
            {label ? "Delivering to" : "Set delivery location"}
          </span>
          {label && (
            <span className="text-white text-[12px] font-bold truncate max-w-[180px]">
              {label}
            </span>
          )}
          <ChevronDown className="w-3 h-3 text-orange-200 flex-shrink-0 group-hover:translate-y-0.5 transition-transform" />
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl
                     hover:bg-surface-100 active:bg-surface-200
                     transition-all group max-w-[180px] sm:max-w-[220px]"
        >
          <MapPin className="w-4 h-4 text-brand-600 flex-shrink-0" />
          <div className="text-left min-w-0 hidden sm:block">
            <p className="text-[9px] text-surface-400 font-medium leading-none">
              {label ? "Delivering to" : "Deliver to"}
            </p>
            <p className="text-[12px] font-bold text-surface-800 truncate leading-tight">
              {label ?? "Set location"}
            </p>
          </div>
          <ChevronDown className="w-3 h-3 text-surface-400 flex-shrink-0 hidden sm:block group-hover:translate-y-0.5 transition-transform" />
        </button>
      )}

      {/* ── Modal ── */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end md:justify-center md:items-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
              onClick={() => setOpen(false)}
            />

            {/* Sheet */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 380 }}
              className="relative bg-white w-full rounded-t-3xl
                         max-h-[88vh] flex flex-col overflow-hidden
                         md:rounded-2xl md:w-[420px] md:max-h-[600px]"
            >
              {/* Drag handle (mobile) */}
              <div className="flex justify-center pt-3 pb-1 md:hidden">
                <div className="w-10 h-1 bg-surface-200 rounded-full" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-3 pb-4 border-b border-surface-100">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-brand-50 rounded-xl flex items-center justify-center">
                    <MapPinned className="w-4 h-4 text-brand-600" />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-extrabold text-surface-900 leading-none">
                      Delivery Location
                    </h2>
                    <p className="text-[11px] text-surface-400 mt-0.5">
                      Prices shown for your city
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-xl hover:bg-surface-100 transition-colors"
                >
                  <X className="w-4 h-4 text-surface-500" />
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto overscroll-contain">
                {/* GPS */}
                <div className="px-5 pt-4 pb-3">
                  <button
                    onClick={handleGPS}
                    disabled={gpsLoading}
                    className="flex items-center gap-3 w-full p-4 rounded-2xl
                               border-2 border-brand-600 bg-brand-50/50
                               hover:bg-brand-50 active:scale-[0.98]
                               transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center flex-shrink-0">
                      {gpsLoading ? (
                        <Loader2 className="w-4 h-4 text-white animate-spin" />
                      ) : (
                        <Navigation className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <div className="text-left">
                      <p className="text-[13px] font-bold text-brand-700">
                        {gpsLoading ? "Detecting location…" : "Use my current location"}
                      </p>
                      <p className="text-[11px] text-surface-500 mt-0.5">
                        Detect automatically using GPS
                      </p>
                    </div>
                  </button>
                  {gpsError && (
                    <p className="text-[11px] text-red-500 mt-2 px-1 leading-snug">
                      {gpsError}
                    </p>
                  )}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 px-5 mb-3">
                  <div className="flex-1 h-px bg-surface-100" />
                  <span className="text-[11px] text-surface-400 font-semibold">
                    OR ENTER MANUALLY
                  </span>
                  <div className="flex-1 h-px bg-surface-100" />
                </div>

                {/* Search */}
                <div className="px-5 mb-4">
                  <div className="flex items-center gap-2.5 bg-surface-50 border border-surface-200 rounded-xl px-3.5 py-3 focus-within:border-brand-400 focus-within:bg-white transition-colors">
                    <Search className="w-4 h-4 text-surface-400 flex-shrink-0" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search city or enter pincode"
                      className="flex-1 bg-transparent text-[13px] text-surface-800
                                 placeholder-surface-400 outline-none"
                      autoFocus
                    />
                    {query && (
                      <button
                        onClick={() => setQuery("")}
                        className="p-0.5 hover:bg-surface-200 rounded transition-colors"
                      >
                        <X className="w-3.5 h-3.5 text-surface-400" />
                      </button>
                    )}
                  </div>
                </div>

                {/* City list */}
                <div className="px-5 pb-8">
                  <p className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-2">
                    {query.length >= 2 ? "Results" : "Popular cities"}
                  </p>
                  {filtered.length === 0 ? (
                    <div className="py-8 text-center">
                      <MapPin className="w-8 h-8 text-surface-300 mx-auto mb-2" />
                      <p className="text-sm text-surface-400">No cities found</p>
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {filtered.map(({ city, pincode }) => {
                        const isSelected = current?.city === city;
                        return (
                          <button
                            key={city}
                            onClick={() => selectCity(city, pincode)}
                            className={`flex items-center gap-3 w-full px-3 py-3 rounded-xl
                                        transition-colors text-left
                                        ${isSelected
                                          ? "bg-brand-50 text-brand-700"
                                          : "hover:bg-surface-50 active:bg-surface-100"
                                        }`}
                          >
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                                          ${isSelected ? "bg-brand-600" : "bg-surface-100"}`}
                            >
                              <MapPin
                                className={`w-4 h-4 ${isSelected ? "text-white" : "text-surface-500"}`}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] font-semibold text-surface-800">{city}</p>
                              <p className="text-[11px] text-surface-400">{pincode}</p>
                            </div>
                            {isSelected && (
                              <CheckCircle2 className="w-4 h-4 text-brand-600 flex-shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Guest note at bottom */}
              {!isAuthenticated && (
                <div className="px-5 py-3 bg-surface-50 border-t border-surface-100">
                  <p className="text-[11px] text-surface-400 text-center">
                    Browsing as guest · Prices shown for selected city
                  </p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
