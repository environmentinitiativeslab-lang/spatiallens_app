import React, { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import "../Style/MapPanel.css";
import "../Style/MapPanelSidebar.css";
import logoEIL from "../assets/img/LogoEILTP.png";
import * as turf from "@turf/turf";
import { ZoomIn, ZoomOut, Home } from "lucide-react";
import { API_BASE } from "../config";
import FeaturePopup from "../Components/FeaturePopup";
import LayerSidebar from "../Components/LayerSidebar";
import { slugOf, jwtToken } from "../utils/mapHelpers";

const ADMIN_SRC = "admin-boundary-src";
const ADMIN_LINE = "admin-boundary-line";
const ADMIN_FILL = "admin-boundary-fill";
const ADMIN_URL = `${API_BASE}/batas-admin/BatasAdmin.geojson`;

const DEFAULT_STYLE = {
  fillColor: "#690000",
  lineColor: "#4a0000",
  fillOpacity: 0.6,
  lineWidth: 1,
};

export default function MapPanel() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const popupRef = useRef(null);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [addLayerModalOpen, setAddLayerModalOpen] = useState(false);

  const [coords, setCoords] = useState({ lat: 0, lng: 0 });
  const [availableLayers, setAvailableLayers] = useState([]);
  const [addedLayers, setAddedLayers] = useState([]);
  const [visibleLayers, setVisibleLayers] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  const [adminOn, setAdminOn] = useState(false);
  const [bboxCache, setBboxCache] = useState({});
  const styleCache = useRef({});

  const [popupInfo, setPopupInfo] = useState(null);

  // =====================================================
  // API helper (inject JWT)
  // =====================================================
  const api = async (path) => {
    const headers = {};
    const t = jwtToken();
    if (t) headers["Authorization"] = `Bearer ${t}`;

    const res = await fetch(`${API_BASE}${path}`, { headers });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);

    const ct = res.headers.get("content-type") || "";
    return ct.includes("application/json") ? res.json() : null;
  };

  // =====================================================
  // Init MapLibre
  // =====================================================
  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://tiles.openfreemap.org/styles/bright",
      center: [106.8, -6.6],
      zoom: 8,
      attributionControl: false,

      // FIX 100% — gunakan endpoint backend kamu
      transformRequest: (url) => {
        const prefix = `${API_BASE}/api/layers/tiles/`;

        if (url.startsWith(prefix)) {
          const t = jwtToken();
          return t
            ? { url, headers: { Authorization: `Bearer ${t}` } }
            : { url };
        }
        return { url };
      },
    });

    map.current.on("mousemove", (e) =>
      setCoords({ lat: e.lngLat.lat, lng: e.lngLat.lng })
    );

    const boot = () => {
      ensureAdminLayer();
      tryHandoffAdd();
    };

    if (map.current.loaded()) boot();
    else map.current.once("load", boot);

    return () => {
      try {
        map.current && map.current.remove();
      } catch {}
      map.current = null;
    };
  }, []);

  // =====================================================
  // Admin boundary layer
  // =====================================================
  const ensureAdminLayer = () => {
    if (!map.current || map.current.getSource(ADMIN_SRC)) return;

    map.current.addSource(ADMIN_SRC, {
      type: "geojson",
      data: `${ADMIN_URL}?cb=${Date.now()}`,
    });

    map.current.addLayer({
      id: ADMIN_FILL,
      type: "fill",
      source: ADMIN_SRC,
      paint: { "fill-color": "#2e7d32", "fill-opacity": 0 },
      layout: { visibility: "none" },
    });

    map.current.addLayer({
      id: ADMIN_LINE,
      type: "line",
      source: ADMIN_SRC,
      paint: { "line-color": "#1b5e20", "line-width": 1.2 },
      layout: { visibility: "none" },
    });
  };

  const toggleAdmin = () => {
    ensureAdminLayer();
    const next = adminOn ? "none" : "visible";

    [ADMIN_FILL, ADMIN_LINE].forEach((id) => {
      if (map.current.getLayer(id)) {
        map.current.setLayoutProperty(id, "visibility", next);
      }
    });

    setAdminOn((v) => !v);
  };

  // =====================================================
  // Fetch BBOX for focus
  // =====================================================
  const fetchBbox = async (slug) => {
    if (bboxCache[slug]) return bboxCache[slug];

    try {
      const meta = await api(`/api/layers/meta/${slug}`);
      if (meta?.bbox) {
        setBboxCache((p) => ({ ...p, [slug]: meta.bbox }));
        return meta.bbox;
      }
    } catch {}

    return null;
  };

  // =====================================================
  // Fetch Style
  // =====================================================
  const parseStyle = (raw) => {
    if (!raw) return DEFAULT_STYLE;
    try {
      const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
      return {
        fillColor: obj.fillColor || DEFAULT_STYLE.fillColor,
        lineColor: obj.lineColor || DEFAULT_STYLE.lineColor,
        fillOpacity:
          Number.isFinite(obj.fillOpacity) && obj.fillOpacity >= 0
            ? obj.fillOpacity
            : DEFAULT_STYLE.fillOpacity,
        lineWidth:
          Number.isFinite(obj.lineWidth) && obj.lineWidth > 0
            ? obj.lineWidth
            : DEFAULT_STYLE.lineWidth,
      };
    } catch {
      return DEFAULT_STYLE;
    }
  };

  const fetchStyle = async (slug) => {
    if (styleCache.current[slug]) return styleCache.current[slug];

    try {
      const res = await api(`/api/layers/${slug}/style`);
      const style = parseStyle(res);
      styleCache.current[slug] = style;
      return style;
    } catch {
      styleCache.current[slug] = DEFAULT_STYLE;
      return DEFAULT_STYLE;
    }
  };

  // =====================================================
  // ADD MVT LAYER (INI FIX TERBESAR)
  // =====================================================
  const addMvtLayer = (meta) => {
    if (!map.current) return;

    const slug = slugOf(meta);
    const srcId = `mvt-src-${slug}`;
    const fillId = `mvt-fill-${slug}`;
    const lineId = `mvt-line-${slug}`;

    if (!map.current.getSource(srcId)) {
      map.current.addSource(srcId, {
        type: "vector",

        // FIX 100% — URL tile backend
        tiles: [`${API_BASE}/api/layers/tiles/${slug}/{z}/{x}/{y}.mvt`],

        minzoom: meta?.minzoom ?? 0,
        maxzoom: meta?.maxzoom ?? 22,
      });

      map.current.addLayer({
        id: fillId,
        type: "fill",
        source: srcId,
        "source-layer": slug,
        paint: {
          "fill-color": DEFAULT_STYLE.fillColor,
          "fill-opacity": DEFAULT_STYLE.fillOpacity,
        },
        layout: { visibility: "visible" },
      });

      map.current.addLayer({
        id: lineId,
        type: "line",
        source: srcId,
        "source-layer": slug,
        paint: {
          "line-color": DEFAULT_STYLE.lineColor,
          "line-width": DEFAULT_STYLE.lineWidth,
        },
        layout: { visibility: "visible" },
      });

      // highlight
      const highlightId = `mvt-highlight-${slug}`;
      map.current.addLayer({
        id: highlightId,
        type: "line",
        source: srcId,
        "source-layer": slug,
        paint: { "line-color": "#1e5a8e", "line-width": 4 },
        layout: { visibility: "visible" },
        filter: ["==", "id", ""],
      });

      // click popup
      map.current.on("click", fillId, (e) => {
        if (!e.features?.length) return;
        handleFeatureClick(e.features[0], e.lngLat, meta.name, slug);
      });
    }

    fetchBbox(slug);
    applyLayerStyle(slug);

    setAddedLayers((p) => [...p, { ...meta, _kind: "mvt", _id: slug }]);
    setVisibleLayers((p) => ({ ...p, [slug]: true }));
  };

  const applyLayerStyle = async (slug) => {
    const style = await fetchStyle(slug);
    const fillId = `mvt-fill-${slug}`;
    const lineId = `mvt-line-${slug}`;

    if (map.current.getLayer(fillId)) {
      map.current.setPaintProperty(fillId, "fill-color", style.fillColor);
      map.current.setPaintProperty(fillId, "fill-opacity", style.fillOpacity);
    }

    if (map.current.getLayer(lineId)) {
      map.current.setPaintProperty(lineId, "line-color", style.lineColor);
      map.current.setPaintProperty(lineId, "line-width", style.lineWidth);
    }
  };

  const handleFeatureClick = (feature, lngLat, layerName, slug) => {
    try {
      const properties = feature.properties || {};
      const featureId = feature.id || properties?.id;

      if (map.current && featureId) {
        const highlightId = `mvt-highlight-${slug}`;
        if (map.current.getLayer(highlightId)) {
          map.current.setFilter(highlightId, ["==", "id", featureId]);
        }
      }

      let areaInfo = null;
      const geom = feature.geometry;
      if (geom && ["Polygon", "MultiPolygon"].includes(geom.type)) {
        try {
          const area = turf.area(feature);
          areaInfo = { ha: (area / 10000).toFixed(2) };
        } catch {}
      }

      setPopupInfo({ lngLat, properties, areaInfo, layerName });
    } catch (err) {
      console.error(err);
    }
  };

  const handleClosePopup = () => {
    setPopupInfo(null);

    addedLayers.forEach((layer) => {
      const slug = layer._id || slugOf(layer);
      const highlightId = `mvt-highlight-${slug}`;
      if (map.current.getLayer(highlightId)) {
        map.current.setFilter(highlightId, ["==", "id", ""]);
      }
    });
  };

  // =====================================================
  // Sidebar & Layer Control
  // =====================================================
  const handleAddLayerClick = () => {
    if (availableLayers.length === 0) {
      api(`/api/layers/meta`)
        .then((list) => setAvailableLayers(Array.isArray(list) ? list : []))
        .catch(() => setAvailableLayers([]));
    }
    setAddLayerModalOpen(true);
  };

  const handleAddLayer = (layer) => {
    if (layer?.slug) {
      addMvtLayer(layer);
      setAddLayerModalOpen(false);
    }
  };

  const handleRemoveLayer = (id) => {
    const slug = typeof id === "string" ? id : id._id;

    const srcId = `mvt-src-${slug}`;
    const fillId = `mvt-fill-${slug}`;
    const lineId = `mvt-line-${slug}`;
    const highlightId = `mvt-highlight-${slug}`;

    try {
      if (map.current.getLayer(highlightId))
        map.current.removeLayer(highlightId);
      if (map.current.getLayer(fillId)) map.current.removeLayer(fillId);
      if (map.current.getLayer(lineId)) map.current.removeLayer(lineId);
      if (map.current.getSource(srcId)) map.current.removeSource(srcId);
    } catch {}

    setAddedLayers((p) => p.filter((l) => l._id !== slug));
    setVisibleLayers((p) => {
      const { [slug]: _, ...rest } = p;
      return rest;
    });
  };

  const toggleLayerVisibility = (slug) => {
    const vis = !!visibleLayers[slug];
    const nextVis = vis ? "none" : "visible";

    ["fill", "line", "highlight"].forEach((t) => {
      const id = `mvt-${t}-${slug}`;
      if (map.current.getLayer(id)) {
        map.current.setLayoutProperty(id, "visibility", nextVis);
      }
    });

    setVisibleLayers((p) => ({ ...p, [slug]: !vis }));
  };

  const focusLayer = async (layer) => {
    const slug = layer._id;

    ["fill", "line", "highlight"].forEach((t) => {
      const id = `mvt-${t}-${slug}`;
      if (map.current.getLayer(id)) {
        map.current.setLayoutProperty(id, "visibility", "visible");
      }
    });

    setVisibleLayers((p) => ({ ...p, [slug]: true }));

    let box = layer.bbox || bboxCache[slug] || (await fetchBbox(slug));
    if (Array.isArray(box) && box.length === 4) {
      const [minX, minY, maxX, maxY] = box;
      map.current.fitBounds(
        [
          [minX, minY],
          [maxX, maxY],
        ],
        { padding: 40, duration: 800 }
      );
    }
  };

  const tryHandoffAdd = () => {
    const handoff = localStorage.getItem("sl:addToMap");
    if (!handoff) return;
    try {
      const layer = JSON.parse(handoff);
      if (layer?.slug) addMvtLayer(layer);
    } catch {}
    localStorage.removeItem("sl:addToMap");
  };

  // =====================================================
  // Rendering
  // =====================================================

  const filteredLayers = (availableLayers || [])
    .filter((l) => !l.status || l.status === "Published")
    .filter((l) =>
      (l.name || "").toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  return (
    <div className="slmp-panel font-sans text-[#2D2D2D] bg-[#F4F6F5] min-h-screen relative">
      <div ref={mapContainer} className="slmp-map" />

      {/* NAV */}
      <header className="slmp-nav">
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-2">
            <img src={logoEIL} alt="Spatial Lens Logo" className="w-8 h-8" />
            <h1 className="font-extrabold text-[#154734] text-lg">Map Panel</h1>
          </div>
          <p className="text-xs text-[#2D2D2D]/60 ml-10 -mt-0.5">
            Spatial Lens
          </p>
        </div>
        <a href="/" className="slmp-navHome" title="Back to Home">
          <Home className="w-5 h-5" />
        </a>
      </header>

      {/* Sidebar */}
      <LayerSidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        adminOn={adminOn}
        toggleAdmin={toggleAdmin}
        addedLayers={addedLayers}
        visibleLayers={visibleLayers}
        onToggleVisibility={toggleLayerVisibility}
        onRemoveLayer={handleRemoveLayer}
        onFocusLayer={focusLayer}
        onAddLayerClick={handleAddLayerClick}
        addLayerModalOpen={addLayerModalOpen}
        closeAddLayerModal={() => setAddLayerModalOpen(false)}
        filteredLayers={filteredLayers}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        handleAddLayer={handleAddLayer}
      />

      {/* ZOOM CONTROL */}
      <div className="slmp-controls">
        <button
          title="Zoom In"
          className="slmp-controlBtn"
          onClick={() => map.current?.zoomIn({ duration: 500 })}
        >
          <ZoomIn className="icon" />
        </button>
        <button
          title="Zoom Out"
          className="slmp-controlBtn"
          onClick={() => map.current?.zoomOut({ duration: 500 })}
        >
          <ZoomOut className="icon" />
        </button>
      </div>

      {/* COORDS */}
      <div className="slmp-coords">
        Lat {coords.lat.toFixed(6)} Long {coords.lng.toFixed(6)}
      </div>

      {/* POPUP */}
      {popupInfo && (
        <FeaturePopup
          ref={popupRef}
          popupInfo={popupInfo}
          onClose={handleClosePopup}
        />
      )}
    </div>
  );
}
