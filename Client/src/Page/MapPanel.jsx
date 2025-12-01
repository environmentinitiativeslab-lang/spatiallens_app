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

  const [availableLayers, setAvailableLayers] = useState([]); // metadata
  const [addedLayers, setAddedLayers] = useState([]);
  const [visibleLayers, setVisibleLayers] = useState({});
  const [searchQuery, setSearchQuery] = useState("");

  const [adminOn, setAdminOn] = useState(false);
  const [bboxCache, setBboxCache] = useState({});
  const styleCache = useRef({});

  // Popup state
  const [popupInfo, setPopupInfo] = useState(null);

  // API util (include bearer)
  const api = async (path) => {
    const headers = {};
    const t = jwtToken();
    if (t) headers["Authorization"] = `Bearer ${t}`;
    const res = await fetch(`${API_BASE}${path}`, { headers });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const ct = res.headers.get("content-type") || "";
    return ct.includes("application/json") ? res.json() : null;
  };

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://tiles.openfreemap.org/styles/bright",
      center: [106.8, -6.6],
      zoom: 8,
      attributionControl: false,
      transformRequest: (url) => {
        const prefix = `${API_BASE}/tiles/`;
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

  // Close popup when clicking outside it
  useEffect(() => {
    if (!popupInfo) return;
    const handleClickOutside = (e) => {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        handleClosePopup();
      }
    };
    document.addEventListener("mousedown", handleClickOutside, true);
    return () =>
      document.removeEventListener("mousedown", handleClickOutside, true);
  }, [popupInfo]);

  // -- Admin boundary
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
    [ADMIN_FILL, ADMIN_LINE].forEach(
      (id) =>
        map.current?.getLayer(id) &&
        map.current.setLayoutProperty(id, "visibility", next)
    );
    setAdminOn((v) => !v);
  };

  // ====== VECTOR TILE (MVT) ======
  const fetchBbox = async (slug) => {
    if (bboxCache[slug]) return bboxCache[slug];
    try {
      const meta = await api(`/api/layers/meta/${slug}`);
      if (meta?.bbox) {
        setBboxCache((prev) => ({ ...prev, [slug]: meta.bbox }));
        return meta.bbox;
      }
    } catch {}
    return null;
  };

  const parseStyle = (raw) => {
    if (!raw) return DEFAULT_STYLE;
    try {
      const obj = typeof raw === "string" ? JSON.parse(raw) : raw;
      return {
        fillColor: obj?.fillColor || DEFAULT_STYLE.fillColor,
        lineColor: obj?.lineColor || DEFAULT_STYLE.lineColor,
        fillOpacity:
          Number.isFinite(obj?.fillOpacity) && obj.fillOpacity >= 0
            ? obj.fillOpacity
            : DEFAULT_STYLE.fillOpacity,
        lineWidth:
          Number.isFinite(obj?.lineWidth) && obj.lineWidth > 0
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

  const applyLayerStyle = async (slug) => {
    if (!map.current) return;
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

  const addMvtLayer = (meta) => {
    if (!map.current) return;
    const slug = slugOf(meta);
    const srcId = `mvt-src-${slug}`;
    const fillId = `mvt-fill-${slug}`;
    const lineId = `mvt-line-${slug}`;

    if (!map.current.getSource(srcId)) {
      map.current.addSource(srcId, {
        type: "vector",
        tiles: [`${API_BASE}/tiles/${slug}/{z}/{x}/{y}.mvt`],
        minzoom: Number.isFinite(meta?.minzoom) ? meta.minzoom : 0,
        maxzoom: Number.isFinite(meta?.maxzoom) ? meta.maxzoom : 22,
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

      const highlightId = `mvt-highlight-${slug}`;
      map.current.addLayer({
        id: highlightId,
        type: "line",
        source: srcId,
        "source-layer": slug,
        paint: {
          "line-color": "#1e5a8e",
          "line-width": 4,
        },
        layout: { visibility: "visible" },
        filter: ["==", "id", ""],
      });

      map.current.on("click", fillId, (e) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        handleFeatureClick(feature, e.lngLat, meta.name, slug);
      });

      map.current.on("mouseenter", fillId, () => {
        map.current.getCanvas().style.cursor = "pointer";
      });
      map.current.on("mouseleave", fillId, () => {
        map.current.getCanvas().style.cursor = "";
      });
    }

    fetchBbox(slug);
    applyLayerStyle(slug);

    setAddedLayers((prev) => [
      ...prev,
      { ...meta, _kind: "mvt", _id: slug, _ids: { fillId, lineId, srcId } },
    ]);
    setVisibleLayers((prev) => ({ ...prev, [slug]: true }));
  };

  const handleFeatureClick = (feature, lngLat, layerName, slug) => {
    try {
      const properties = feature.properties || {};
      const featureId = feature.id || feature.properties?.id;

      if (map.current && featureId) {
        const highlightId = `mvt-highlight-${slug}`;
        if (map.current.getLayer(highlightId)) {
          map.current.setFilter(highlightId, ["==", "id", featureId]);
        }
      }

      let areaInfo = null;
      const geometry = feature.geometry;
      if (
        geometry &&
        (geometry.type === "Polygon" || geometry.type === "MultiPolygon")
      ) {
        try {
          const area = turf.area(feature);
          const ha = area / 10000;
          areaInfo = { ha: Number.isFinite(ha) ? ha.toFixed(2) : null };
        } catch (err) {
          console.error("Error calculating area:", err);
        }
      }

      setPopupInfo({
        lngLat,
        properties,
        areaInfo,
        layerName,
      });
    } catch (err) {
      console.error("Error handling feature click:", err);
    }
  };

  const handleClosePopup = () => {
    setPopupInfo(null);

    addedLayers.forEach((layer) => {
      const slug = layer._id || slugOf(layer);
      const highlightId = `mvt-highlight-${slug}`;
      if (map.current && map.current.getLayer(highlightId)) {
        map.current.setFilter(highlightId, ["==", "id", ""]);
      }
    });
  };

  const removeMvtLayer = (slug) => {
    if (!map.current) return;
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
  };

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
      return;
    }
  };

  const handleRemoveLayer = (idOrLayer) => {
    const id =
      typeof idOrLayer === "string"
        ? idOrLayer
        : idOrLayer._id || slugOf(idOrLayer);
    const item = addedLayers.find((l) => (l._id || slugOf(l)) === id);
    if (item?._kind === "mvt") removeMvtLayer(id);
    setAddedLayers((prev) => prev.filter((l) => (l._id || slugOf(l)) !== id));
    setVisibleLayers((prev) => {
      const { [id]: _omit, ...rest } = prev;
      return rest;
    });
  };

  const toggleLayerVisibility = (id) => {
    if (!map.current) return;
    const isVisible = !!visibleLayers[id];
    const to = isVisible ? "none" : "visible";

    const fillId = `mvt-fill-${id}`;
    const lineId = `mvt-line-${id}`;
    const highlightId = `mvt-highlight-${id}`;
    if (map.current.getLayer(fillId) || map.current.getLayer(lineId)) {
      if (map.current.getLayer(fillId))
        map.current.setLayoutProperty(fillId, "visibility", to);
      if (map.current.getLayer(lineId))
        map.current.setLayoutProperty(lineId, "visibility", to);
      if (map.current.getLayer(highlightId))
        map.current.setLayoutProperty(highlightId, "visibility", to);
    }
    setVisibleLayers((prev) => ({ ...prev, [id]: !isVisible }));
  };

  const focusLayer = async (layer) => {
    if (!map.current || !layer) return;
    const id = layer._id || slugOf(layer);

    const fillId = `mvt-fill-${id}`;
    const lineId = `mvt-line-${id}`;
    const highlightId = `mvt-highlight-${id}`;
    [fillId, lineId, highlightId].forEach((lid) => {
      if (map.current.getLayer(lid)) {
        map.current.setLayoutProperty(lid, "visibility", "visible");
      }
    });
    setVisibleLayers((prev) => ({ ...prev, [id]: true }));

    let box = layer.bbox || bboxCache[id] || (await fetchBbox(id));

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
      if (!layer) return;
      if (layer.slug) {
        addMvtLayer(layer);
      }
    } catch {}
    localStorage.removeItem("sl:addToMap");
  };

  const filteredLayers = (availableLayers || [])
    .filter((l) => !l.status || l.status === "Published")
    .filter((l) =>
      (l.name || "").toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  const zoomIn = () => map.current?.zoomIn({ duration: 500 });
  const zoomOut = () => map.current?.zoomOut({ duration: 500 });

  return (
    <div className="slmp-panel font-sans text-[#2D2D2D] bg-[#F4F6F5] min-h-screen relative">
      <div ref={mapContainer} className="slmp-map" />

      {/* Navbar */}
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

      {/* Map Controls */}
      <div className="slmp-controls">
        <button title="Zoom In" className="slmp-controlBtn" onClick={zoomIn}>
          <ZoomIn className="icon" />
        </button>
        <button title="Zoom Out" className="slmp-controlBtn" onClick={zoomOut}>
          <ZoomOut className="icon" />
        </button>
      </div>

      {/* Coordinates */}
      <div className="slmp-coords">
        Lat {coords.lat.toFixed(6)} Long {coords.lng.toFixed(6)}
      </div>

      {/* Feature Info Popup */}
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
