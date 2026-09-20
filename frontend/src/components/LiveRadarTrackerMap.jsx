import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Search, Phone, Navigation, AlertTriangle, ShieldCheck, UserCheck, 
  MapPin, Clock, Truck, Activity, Radio, RefreshCw, X, ChevronRight, Zap
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon paths in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom HTML DivIcons for Zomato-Style SVG Pins
const createCustomIcon = (type, label, isTarget = false) => {
  let bgGradient = 'from-emerald-500 to-teal-600';
  let iconEmoji = '🛵';
  let borderColor = '#10b981';

  if (type === 'SENIOR') {
    bgGradient = 'from-rose-500 to-red-600';
    iconEmoji = '👵';
    borderColor = '#f43f5e';
  } else if (type === 'POLICE_STATION') {
    bgGradient = 'from-blue-600 to-indigo-700';
    iconEmoji = '🚔';
    borderColor = '#2563eb';
  } else if (type === 'VOLUNTEER') {
    bgGradient = 'from-amber-500 to-orange-600';
    iconEmoji = '🛵';
    borderColor = '#f59e0b';
  }

  const html = `
    <div class="relative flex items-center justify-center">
      ${isTarget ? '<div class="absolute -inset-3 rounded-full bg-rose-500/30 animate-ping"></div>' : ''}
      <div class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-gradient-to-r ${bgGradient} text-white shadow-xl border-2 border-white font-bold text-xs transform hover:scale-110 transition-transform">
        <span class="text-sm">${iconEmoji}</span>
        <span class="max-w-[100px] truncate">${label}</span>
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-marker',
    iconSize: [120, 36],
    iconAnchor: [60, 18]
  });
};

// Map Fly-To Helper Component
function MapFlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center[0] && center[1]) {
      map.flyTo(center, zoom, { duration: 1.5 });
    }
  }, [center, zoom, map]);
  return null;
}

export default function LiveRadarTrackerMap({ initialPhone = '', onSelectPhone }) {
  const [phoneNumber, setPhoneNumber] = useState(initialPhone || '+91 97410 88231');
  const [searchResult, setSearchResult] = useState(null);
  const [allMarkers, setAllMarkers] = useState({ seniors: [], volunteers: [], requests: [], station: null });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('SEARCH'); // SEARCH, ALL_PINS, TRAJECTORY
  const [simulatedEta, setSimulatedEta] = useState(4);
  const [simulatedProgress, setSimulatedProgress] = useState(45);

  const defaultCenter = [13.2389, 74.8322]; // Manchakal Junction Shirva
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(15);

  // Quick preset phone numbers for fast testing
  const quickPresites = [
    { label: "Saraswathi Amma (Senior)", phone: "+91 97410 88231", location: "Near Church, Shirva" },
    { label: "Benedict D'Souza (Senior)", phone: "+91 94491 55672", location: "Manchakal Junction" },
    { label: "Ramesh Acharya (Volunteer Auto)", phone: "+91 98451 22340", location: "Market Road" },
    { label: "Pradeep Auto (Red Cross)", phone: "+91 94480 34112", location: "Manchakal Stand" },
  ];

  // Fetch all markers on load
  const fetchAllMarkers = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/location/all-markers');
      if (res.ok) {
        const data = await res.json();
        setAllMarkers(data);
      }
    } catch (e) {
      console.error("Error fetching markers", e);
    }
  };

  useEffect(() => {
    fetchAllMarkers();
    const interval = setInterval(fetchAllMarkers, 10000);
    return () => clearInterval(interval);
  }, []);

  // Track location by phone number
  const handleTrackByNumber = async (targetPhone) => {
    const phoneToUse = targetPhone || phoneNumber;
    if (!phoneToUse) return;

    setLoading(true);
    try {
      const res = await fetch(`http://localhost:5000/api/location/track-by-number?phone=${encodeURIComponent(phoneToUse)}`);
      if (res.ok) {
        const data = await res.json();
        setSearchResult(data);
        if (data.lat && data.lng) {
          setMapCenter([data.lat, data.lng]);
          setMapZoom(16);
        }
      }
    } catch (e) {
      console.error("Error tracking phone number", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialPhone) {
      setPhoneNumber(initialPhone);
      handleTrackByNumber(initialPhone);
    } else {
      handleTrackByNumber('+91 97410 88231');
    }
  }, [initialPhone]);

  // Simulate Zomato delivery movement animation
  useEffect(() => {
    const timer = setInterval(() => {
      setSimulatedProgress(prev => (prev >= 95 ? 20 : prev + 2));
    }, 2000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col h-full bg-slate-900 text-slate-100 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* ───────────────────────────────────────────────────────────────────────── */}
      /* HEADER: Location-by-Number Search & Controls */
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-800 flex flex-col md:flex-row md:items-center gap-4 justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30">
              <Radio className="w-5 h-5 animate-pulse" />
            </span>
            <div>
              <h2 className="text-lg fontweight-bold font-semibold text-white flex items-center gap-2">
                Live Location Radar
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  SHIRVA PANCHAYAT LIVE
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Track senior citizens, volunteer responders, and active deliveries live by phone number
              </p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-xl border border-slate-700/80 shadow-inner w-full md:w-auto">
          <div className="flex items-center gap-2 px-3 text-slate-400">
            <Phone className="w-4 h-4 text-rose-400" />
          </div>
          <input
            type="text"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTrackByNumber()}
            placeholder="Enter Phone Number (e.g. +91 97410 88231)"
            className="bg-transparent text-sm text-white focus:outline-none w-full md:w-64 placeholder-slate-500"
          />
          <button
            onClick={() => handleTrackByNumber()}
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-rose-500 to-red-600 text-white font-semibold text-xs hover:from-rose-600 hover:to-red-700 transition shadow-lg flex items-center gap-1.5"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
            Track Number
          </button>
        </div>
      </div>

      {/* Quick Presets Bar */}
      <div className="px-4 py-2 bg-slate-950/50 border-b border-slate-800/60 flex items-center gap-2 overflow-x-auto text-xs scrollbar-none">
        <span className="text-slate-400 font-medium flex items-center gap-1 shrink-0">
          <Zap className="w-3.5 h-3.5 text-amber-400" /> Quick Radar Pings:
        </span>
        {quickPresites.map((item, idx) => (
          <button
            key={idx}
            onClick={() => {
              setPhoneNumber(item.phone);
              handleTrackByNumber(item.phone);
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition shrink-0 flex items-center gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
            {item.label}
          </button>
        ))}
      </div>

      {/* ───────────────────────────────────────────────────────────────────────── */}
      /* MAIN CONTENT: Map & Live Tracking Side Panel */
      {/* ───────────────────────────────────────────────────────────────────────── */}
      <div className="flex-1 relative flex flex-col md:flex-row">
        {/* LEAFLET INTERACTIVE MAP */}
        <div className="flex-1 h-[450px] md:h-full relative z-0">
          <MapContainer
            center={defaultCenter}
            zoom={mapZoom}
            style={{ width: '100%', height: '100%' }}
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapFlyTo center={mapCenter} zoom={mapZoom} />

            {/* Station Marker */}
            {allMarkers.station && (
              <Marker
                position={[allMarkers.station.lat, allMarkers.station.lng]}
                icon={createCustomIcon('POLICE_STATION', 'Shirva Police Command')}
              >
                <Popup>
                  <div className="p-1 text-slate-900">
                    <strong className="text-sm block">🚔 Shirva Police Station</strong>
                    <p className="text-xs text-slate-600">Command & Dispatch Control Room</p>
                    <p className="text-xs text-slate-500">Phone: {allMarkers.station.phone}</p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Seniors Markers */}
            {allMarkers.seniors?.map(s => (
              <Marker
                key={s.id}
                position={[s.lat, s.lng]}
                icon={createCustomIcon('SENIOR', s.name, searchResult?.phone === s.phone)}
              >
                <Popup>
                  <div className="p-1 text-slate-900">
                    <strong className="text-sm block text-rose-700">👵 {s.name}</strong>
                    <p className="text-xs text-slate-600 font-semibold">{s.phone}</p>
                    <p className="text-xs text-slate-600">{s.address}</p>
                    {s.medicalNotes && (
                      <p className="text-xs text-amber-700 bg-amber-50 p-1 rounded mt-1 border border-amber-200">
                        💊 {s.medicalNotes}
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Volunteers Markers */}
            {allMarkers.volunteers?.map(v => (
              <Marker
                key={v.id}
                position={[v.lat, v.lng]}
                icon={createCustomIcon('VOLUNTEER', v.name, searchResult?.phone === v.phone)}
              >
                <Popup>
                  <div className="p-1 text-slate-900">
                    <strong className="text-sm block text-emerald-700">🛵 {v.name}</strong>
                    <p className="text-xs font-semibold">{v.org}</p>
                    <p className="text-xs text-slate-500">Badge: {v.policeBadgeNo || 'Verified'}</p>
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold mt-1 ${v.isAvailable ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>
                      {v.isAvailable ? 'ON-DUTY AVAILABLE' : 'OFF-DUTY'}
                    </span>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* Search Target Pulsing Circle */}
            {searchResult && searchResult.lat && (
              <>
                <Circle
                  center={[searchResult.lat, searchResult.lng]}
                  radius={120}
                  pathOptions={{ color: '#f43f5e', fillColor: '#f43f5e', fillOpacity: 0.2, weight: 2 }}
                />

                {/* Zomato Delivery Trajectory Polyline if active tracking */}
                {searchResult.activeTracking && (
                  <Polyline
                    positions={[
                      [searchResult.activeTracking.volunteerLat, searchResult.activeTracking.volunteerLng],
                      [searchResult.activeTracking.targetLat, searchResult.activeTracking.targetLng]
                    ]}
                    pathOptions={{ color: '#10b981', weight: 4, dashArray: '8, 8' }}
                  />
                )}
              </>
            )}
          </MapContainer>

          {/* Floating Radar Badge overlay */}
          <div className="absolute top-3 right-3 z-[1000] bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/80 text-xs font-semibold text-slate-200 shadow-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            Shirva Police Live Telephony Radar Active
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────────────────── */}
        /* SIDE PANEL: Live Cell Tower Result & Zomato Track Card */
        {/* ───────────────────────────────────────────────────────────────────────── */}
        <div className="w-full md:w-96 bg-slate-900 border-t md:border-t-0 md:border-l border-slate-800 p-4 flex flex-col justify-between overflow-y-auto max-h-[500px] md:max-h-none">
          {searchResult ? (
            <div className="space-y-4">
              {/* Searched Phone Header */}
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/80 shadow-lg">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                  <span className="flex items-center gap-1 text-rose-400 font-semibold">
                    <Radio className="w-3.5 h-3.5 animate-pulse" /> Cell Tower Radar Match
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono">
                    {searchResult.accuracyRadiusMeters}m Accuracy
                  </span>
                </div>
                <h3 className="text-base font-bold text-white flex items-center justify-between">
                  {searchResult.entityName}
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300 font-normal">
                    {searchResult.entityType}
                  </span>
                </h3>
                <p className="text-xs text-slate-300 font-mono mt-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" /> {searchResult.phone}
                </p>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-rose-400 shrink-0" /> {searchResult.address}
                </p>
              </div>

              {/* Medical & Emergency Notes if Senior */}
              {searchResult.medicalNotes && (
                <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-800/50 text-xs text-amber-200">
                  <span className="font-bold flex items-center gap-1 text-amber-400 mb-1">
                    <Activity className="w-3.5 h-3.5" /> Medical History & Prescription Notes:
                  </span>
                  <p className="leading-relaxed">{searchResult.medicalNotes}</p>
                  {searchResult.emergencyContact && (
                    <p className="mt-2 text-[11px] text-amber-300 font-medium">
                      ☎️ Emergency Contact: {searchResult.emergencyContact}
                    </p>
                  )}
                </div>
              )}

              {/* ZOMATO-STYLE LIVE TRACKING CARD */}
              {searchResult.activeTracking ? (
                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/60 via-slate-800 to-slate-900 border border-emerald-500/40 shadow-xl space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 animate-bounce" /> ZOMATO LIVE TRACKING
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      REQ #{searchResult.activeTracking.requestId}
                    </span>
                  </div>

                  {/* ETA Counter */}
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/80 border border-emerald-500/30">
                    <div>
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Estimated Arrival</p>
                      <h4 className="text-xl font-extrabold text-emerald-400 flex items-center gap-1">
                        <Clock className="w-5 h-5 text-emerald-400 animate-spin" />
                        {searchResult.activeTracking.etaMinutes} Mins
                      </h4>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400 uppercase font-semibold">Distance</p>
                      <p className="text-sm font-bold text-white">{searchResult.activeTracking.distanceKm} km</p>
                    </div>
                  </div>

                  {/* Volunteer Profile */}
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-base border border-emerald-500/40">
                        🛵
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{searchResult.activeTracking.volunteerName}</p>
                        <p className="text-[11px] text-slate-400">{searchResult.activeTracking.volunteerOrg}</p>
                        <span className="text-[10px] px-1.5 py-0.2 bg-blue-500/20 text-blue-300 rounded font-mono">
                          Badge: {searchResult.activeTracking.policeBadgeNo}
                        </span>
                      </div>
                    </div>
                    <a
                      href={`tel:${searchResult.activeTracking.volunteerPhone}`}
                      className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition shadow-lg"
                      title="Call Volunteer"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  </div>

                  {/* Animated Progress Bar */}
                  <div>
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                      <span>Dispatch</span>
                      <span className="text-emerald-400 font-semibold">En Route to Senior</span>
                      <span>Delivered</span>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                        style={{ width: `${simulatedProgress}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-800 text-center space-y-2">
                  <UserCheck className="w-8 h-8 text-slate-500 mx-auto" />
                  <p className="text-xs text-slate-400">
                    No active emergency delivery task currently in progress for this phone number.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center p-4">
              <Radio className="w-10 h-10 text-slate-600 mb-2 animate-pulse" />
              <p className="text-sm font-semibold text-slate-400">Live Phone Location Radar</p>
              <p className="text-xs text-slate-500 mt-1">
                Enter any senior or volunteer phone number above to pinpoint their live cell tower location on the Shirva map.
              </p>
            </div>
          )}

          {/* Quick Footer Action */}
          <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Shirva PS Dispatcher Console</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> 112 ERSS Ready
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
