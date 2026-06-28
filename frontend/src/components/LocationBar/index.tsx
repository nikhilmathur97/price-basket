"use client";

import { useState, useEffect, useRef } from "react";
import {
  MapPin, Navigation, Search, X, ChevronDown,
  Loader2, CheckCircle2, MapPinned,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocationStore } from "@/store/locationStore";
import { useAuthStore } from "@/store/authStore";

const POPULAR_CITIES = [
  // ── Metro & Tier-1 ──────────────────────────────────────────────────────────
  { city: "Mumbai",            pincode: "400001" },
  { city: "Delhi",             pincode: "110001" },
  { city: "Bengaluru",         pincode: "560001" },
  { city: "Hyderabad",         pincode: "500001" },
  { city: "Chennai",           pincode: "600001" },
  { city: "Kolkata",           pincode: "700001" },
  { city: "Pune",              pincode: "411001" },
  { city: "Ahmedabad",         pincode: "380001" },
  { city: "Noida",             pincode: "201301" },
  { city: "Gurgaon",           pincode: "122001" },
  { city: "Navi Mumbai",       pincode: "400703" },
  { city: "Thane",             pincode: "400601" },
  // ── Rajasthan ───────────────────────────────────────────────────────────────
  { city: "Jaipur",            pincode: "302001" },
  { city: "Jodhpur",           pincode: "342001" },
  { city: "Udaipur",           pincode: "313001" },
  { city: "Kota",              pincode: "324001" },
  { city: "Ajmer",             pincode: "305001" },
  { city: "Bikaner",           pincode: "334001" },
  { city: "Sikar",             pincode: "332001" },
  { city: "Bhilwara",          pincode: "311001" },
  { city: "Alwar",             pincode: "301001" },
  { city: "Bharatpur",         pincode: "321001" },
  { city: "Pali",              pincode: "306401" },
  { city: "Sri Ganganagar",    pincode: "335001" },
  { city: "Hanumangarh",       pincode: "335512" },
  { city: "Barmer",            pincode: "344001" },
  { city: "Tonk",              pincode: "304001" },
  { city: "Chittorgarh",       pincode: "312001" },
  // ── Uttar Pradesh ───────────────────────────────────────────────────────────
  { city: "Lucknow",           pincode: "226001" },
  { city: "Kanpur",            pincode: "208001" },
  { city: "Agra",              pincode: "282001" },
  { city: "Varanasi",          pincode: "221001" },
  { city: "Allahabad",         pincode: "211001" },
  { city: "Meerut",            pincode: "250001" },
  { city: "Ghaziabad",         pincode: "201001" },
  { city: "Mathura",           pincode: "281001" },
  { city: "Bareilly",          pincode: "243001" },
  { city: "Aligarh",           pincode: "202001" },
  { city: "Moradabad",         pincode: "244001" },
  { city: "Saharanpur",        pincode: "247001" },
  { city: "Gorakhpur",         pincode: "273001" },
  { city: "Firozabad",         pincode: "283203" },
  { city: "Jhansi",            pincode: "284001" },
  { city: "Muzaffarnagar",     pincode: "251001" },
  { city: "Rampur",            pincode: "244901" },
  { city: "Loni",              pincode: "201102" },
  { city: "Hapur",             pincode: "245101" },
  { city: "Etawah",            pincode: "206001" },
  { city: "Bulandshahr",       pincode: "203001" },
  // ── Maharashtra ─────────────────────────────────────────────────────────────
  { city: "Nagpur",            pincode: "440001" },
  { city: "Nashik",            pincode: "422001" },
  { city: "Aurangabad",        pincode: "431001" },
  { city: "Solapur",           pincode: "413001" },
  { city: "Kolhapur",          pincode: "416001" },
  { city: "Amravati",          pincode: "444601" },
  { city: "Sangli",            pincode: "416416" },
  { city: "Malegaon",          pincode: "423203" },
  { city: "Dhule",             pincode: "424001" },
  { city: "Akola",             pincode: "444001" },
  { city: "Latur",             pincode: "413512" },
  { city: "Ahmednagar",        pincode: "414001" },
  { city: "Chandrapur",        pincode: "442401" },
  { city: "Parbhani",          pincode: "431401" },
  { city: "Jalgaon",           pincode: "425001" },
  // ── Gujarat ─────────────────────────────────────────────────────────────────
  { city: "Surat",             pincode: "395001" },
  { city: "Vadodara",          pincode: "390001" },
  { city: "Rajkot",            pincode: "360001" },
  { city: "Bhavnagar",         pincode: "364001" },
  { city: "Jamnagar",          pincode: "361001" },
  { city: "Gandhinagar",       pincode: "382010" },
  { city: "Junagadh",          pincode: "362001" },
  { city: "Anand",             pincode: "388001" },
  { city: "Morbi",             pincode: "363641" },
  { city: "Gandhidham",        pincode: "370201" },
  // ── Karnataka ───────────────────────────────────────────────────────────────
  { city: "Mysuru",            pincode: "570001" },
  { city: "Mangaluru",         pincode: "575001" },
  { city: "Hubballi",          pincode: "580020" },
  { city: "Belagavi",          pincode: "590001" },
  { city: "Davanagere",        pincode: "577001" },
  { city: "Ballari",           pincode: "583101" },
  { city: "Vijayapura",        pincode: "586101" },
  { city: "Shivamogga",        pincode: "577201" },
  { city: "Tumkur",            pincode: "572101" },
  { city: "Raichur",           pincode: "584101" },
  // ── Tamil Nadu ──────────────────────────────────────────────────────────────
  { city: "Coimbatore",        pincode: "641001" },
  { city: "Madurai",           pincode: "625001" },
  { city: "Tiruchirappalli",   pincode: "620001" },
  { city: "Salem",             pincode: "636001" },
  { city: "Tirunelveli",       pincode: "627001" },
  { city: "Erode",             pincode: "638001" },
  { city: "Vellore",           pincode: "632001" },
  { city: "Thoothukudi",       pincode: "628001" },
  { city: "Tiruppur",          pincode: "641601" },
  { city: "Dindigul",          pincode: "624001" },
  // ── Andhra Pradesh ──────────────────────────────────────────────────────────
  { city: "Visakhapatnam",     pincode: "530001" },
  { city: "Vijayawada",        pincode: "520001" },
  { city: "Guntur",            pincode: "522001" },
  { city: "Nellore",           pincode: "524001" },
  { city: "Kurnool",           pincode: "518001" },
  { city: "Rajahmundry",       pincode: "533101" },
  { city: "Kakinada",          pincode: "533001" },
  { city: "Tirupati",          pincode: "517501" },
  // ── Madhya Pradesh ──────────────────────────────────────────────────────────
  { city: "Indore",            pincode: "452001" },
  { city: "Bhopal",            pincode: "462001" },
  { city: "Jabalpur",          pincode: "482001" },
  { city: "Gwalior",           pincode: "474001" },
  { city: "Ujjain",            pincode: "456001" },
  { city: "Rewa",              pincode: "486001" },
  { city: "Sagar",             pincode: "470001" },
  { city: "Dewas",             pincode: "455001" },
  { city: "Satna",             pincode: "485001" },
  { city: "Ratlam",            pincode: "457001" },
  // ── West Bengal ─────────────────────────────────────────────────────────────
  { city: "Howrah",            pincode: "711101" },
  { city: "Durgapur",          pincode: "713201" },
  { city: "Asansol",           pincode: "713301" },
  { city: "Siliguri",          pincode: "734001" },
  { city: "Bardhaman",         pincode: "713101" },
  { city: "Malda",             pincode: "732101" },
  { city: "Baharampur",        pincode: "742101" },
  // ── Punjab ──────────────────────────────────────────────────────────────────
  { city: "Ludhiana",          pincode: "141001" },
  { city: "Amritsar",          pincode: "143001" },
  { city: "Jalandhar",         pincode: "144001" },
  { city: "Patiala",           pincode: "147001" },
  { city: "Bathinda",          pincode: "151001" },
  { city: "Hoshiarpur",        pincode: "146001" },
  { city: "Mohali",            pincode: "160055" },
  // ── Haryana ─────────────────────────────────────────────────────────────────
  { city: "Faridabad",         pincode: "121001" },
  { city: "Chandigarh",        pincode: "160001" },
  { city: "Hisar",             pincode: "125001" },
  { city: "Panipat",           pincode: "132103" },
  { city: "Rohtak",            pincode: "124001" },
  { city: "Karnal",            pincode: "132001" },
  { city: "Ambala",            pincode: "134001" },
  { city: "Yamunanagar",       pincode: "135001" },
  // ── Bihar ───────────────────────────────────────────────────────────────────
  { city: "Patna",             pincode: "800001" },
  { city: "Gaya",              pincode: "823001" },
  { city: "Bhagalpur",         pincode: "812001" },
  { city: "Muzaffarpur",       pincode: "842001" },
  { city: "Darbhanga",         pincode: "846001" },
  { city: "Purnia",            pincode: "854301" },
  { city: "Bihar Sharif",      pincode: "803101" },
  // ── Jharkhand ───────────────────────────────────────────────────────────────
  { city: "Ranchi",            pincode: "834001" },
  { city: "Jamshedpur",        pincode: "831001" },
  { city: "Dhanbad",           pincode: "826001" },
  { city: "Bokaro",            pincode: "827001" },
  // ── Odisha ──────────────────────────────────────────────────────────────────
  { city: "Bhubaneswar",       pincode: "751001" },
  { city: "Cuttack",           pincode: "753001" },
  { city: "Rourkela",          pincode: "769001" },
  { city: "Sambalpur",         pincode: "768001" },
  // ── Telangana ───────────────────────────────────────────────────────────────
  { city: "Warangal",          pincode: "506001" },
  { city: "Nizamabad",         pincode: "503001" },
  { city: "Karimnagar",        pincode: "505001" },
  { city: "Khammam",           pincode: "507001" },
  // ── Kerala ──────────────────────────────────────────────────────────────────
  { city: "Kochi",             pincode: "682001" },
  { city: "Thiruvananthapuram",pincode: "695001" },
  { city: "Kozhikode",         pincode: "673001" },
  { city: "Thrissur",          pincode: "680001" },
  { city: "Kollam",            pincode: "691001" },
  { city: "Palakkad",          pincode: "678001" },
  { city: "Malappuram",        pincode: "676101" },
  // ── Assam & Northeast ───────────────────────────────────────────────────────
  { city: "Guwahati",          pincode: "781001" },
  { city: "Silchar",           pincode: "788001" },
  { city: "Dibrugarh",         pincode: "786001" },
  { city: "Imphal",            pincode: "795001" },
  { city: "Shillong",          pincode: "793001" },
  { city: "Agartala",          pincode: "799001" },
  { city: "Aizawl",            pincode: "796001" },
  // ── Uttarakhand ─────────────────────────────────────────────────────────────
  { city: "Dehradun",          pincode: "248001" },
  { city: "Haridwar",          pincode: "249401" },
  { city: "Roorkee",           pincode: "247667" },
  { city: "Haldwani",          pincode: "263139" },
  // ── Himachal Pradesh ────────────────────────────────────────────────────────
  { city: "Shimla",            pincode: "171001" },
  { city: "Manali",            pincode: "175131" },
  { city: "Dharamshala",       pincode: "176215" },
  { city: "Solan",             pincode: "173212" },
  // ── J&K / Ladakh ────────────────────────────────────────────────────────────
  { city: "Srinagar",          pincode: "190001" },
  { city: "Jammu",             pincode: "180001" },
  { city: "Leh",               pincode: "194101" },
  // ── Goa ─────────────────────────────────────────────────────────────────────
  { city: "Panaji",            pincode: "403001" },
  { city: "Margao",            pincode: "403601" },
  { city: "Vasco da Gama",     pincode: "403802" },
  // ── Chhattisgarh ────────────────────────────────────────────────────────────
  { city: "Raipur",            pincode: "492001" },
  { city: "Bhilai",            pincode: "490001" },
  { city: "Bilaspur",          pincode: "495001" },
  { city: "Durg",              pincode: "491001" },
  // ── Other UTs ───────────────────────────────────────────────────────────────
  { city: "Pondicherry",       pincode: "605001" },
  { city: "Port Blair",        pincode: "744101" },
];

export function LocationBar({ variant = "header" }: { variant?: "header" | "hero" }) {
  const { current, setLocation } = useLocationStore();
  const { user, isAuthenticated } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState("");
  const [mounted, setMounted] = useState(false);
  const [searchResults, setSearchResults] = useState<{ city: string; pincode: string; state: string; lat: number; lng: number }[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setMounted(true); }, []);

  // Live city search via Nominatim
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }
    setSearchLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&countrycodes=in&format=json&addressdetails=1&limit=8`,
          { headers: { "Accept-Language": "en" } }
        );
        const data = await res.json();
        const results = (data as Array<{
          display_name: string;
          address: { city?: string; town?: string; village?: string; county?: string; state?: string; postcode?: string };
          lat: string;
          lon: string;
        }>)
          .map((item) => {
            const addr = item.address ?? {};
            const city = addr.city || addr.town || addr.village || addr.county || query;
            return {
              city,
              pincode: addr.postcode ?? "",
              state: addr.state ?? "",
              lat: parseFloat(item.lat),
              lng: parseFloat(item.lon),
            };
          })
          .filter((r, idx, arr) => arr.findIndex((x) => x.city === r.city) === idx);
        setSearchResults(results);
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query]);

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

  const displayList =
    query.length >= 2
      ? searchResults.map((r) => ({ city: r.city, pincode: r.pincode, state: r.state, lat: r.lat, lng: r.lng }))
      : POPULAR_CITIES.map((c) => ({ ...c, state: "", lat: 0, lng: 0 }));

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

  function selectCity(city: string, pincode: string, lat?: number, lng?: number) {
    const label = pincode ? `${city}, ${pincode}` : city;
    setLocation({ label, city, pincode: pincode || null, lat: lat ?? null, lng: lng ?? null });
    setOpen(false);
    setQuery("");
    setSearchResults([]);
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
          className="flex items-center gap-1 px-2 py-1.5 rounded-xl
                     hover:bg-surface-100 active:bg-surface-200
                     transition-all group min-w-0"
        >
          <MapPin className="w-4 h-4 text-brand-600 flex-shrink-0" />
          <span className="text-[11px] sm:text-[12px] font-bold text-surface-800 truncate max-w-[90px] sm:max-w-[140px]">
            {label ?? "Set location"}
          </span>
          <ChevronDown className="w-3 h-3 text-surface-400 flex-shrink-0 group-hover:translate-y-0.5 transition-transform" />
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
                    {query.length >= 2 ? "Search results" : "Popular cities"}
                  </p>

                  {/* Searching spinner */}
                  {searchLoading && (
                    <div className="flex items-center gap-2 py-6 justify-center">
                      <Loader2 className="w-4 h-4 text-brand-500 animate-spin" />
                      <span className="text-[12px] text-surface-500">Searching…</span>
                    </div>
                  )}

                  {/* No results — let user confirm their typed city */}
                  {!searchLoading && query.length >= 2 && displayList.length === 0 && (
                    <div className="space-y-2">
                      <button
                        onClick={() => selectCity(
                          query.trim().replace(/\b\w/g, (c) => c.toUpperCase()), ""
                        )}
                        className="flex items-center gap-3 w-full px-3 py-3 rounded-xl
                                   bg-brand-50 border border-brand-200 hover:bg-brand-100
                                   active:scale-[0.98] transition-all text-left"
                      >
                        <div className="w-8 h-8 bg-brand-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <MapPin className="w-4 h-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold text-brand-700">
                            Use &quot;{query.trim().replace(/\b\w/g, (c) => c.toUpperCase())}&quot;
                          </p>
                          <p className="text-[11px] text-surface-500">Set as my delivery city</p>
                        </div>
                      </button>
                    </div>
                  )}

                  {/* City results */}
                  {!searchLoading && displayList.length > 0 && (
                    <div className="space-y-0.5">
                      {displayList.map(({ city, pincode, state, lat, lng }) => {
                        const isSelected = current?.city === city;
                        return (
                          <button
                            key={`${city}-${pincode}`}
                            onClick={() => selectCity(city, pincode, lat || undefined, lng || undefined)}
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
                              <p className="text-[11px] text-surface-400">
                                {[state, pincode].filter(Boolean).join(" · ")}
                              </p>
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
