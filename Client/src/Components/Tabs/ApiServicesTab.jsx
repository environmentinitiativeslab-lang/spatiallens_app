import React, { useState, useEffect, useMemo } from "react";
import { Code2, Copy, CheckCircle2, Globe2, ExternalLink } from "lucide-react";
import { API_BASE } from "../../config";

export default function ApiServicesTab() {
  const [layers, setLayers] = useState([]);
  const [selectedLayer, setSelectedLayer] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState("GeoJSON");
  const [copiedSnippet, setCopiedSnippet] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    fetchPublishedLayers();
  }, []);

  const fetchPublishedLayers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/layers/meta`);
      const data = await res.json();
      const published = data.filter((l) => l.status === "Published");
      setLayers(published);
      if (published.length > 0 && !selectedLayer) {
        setSelectedLayer(published[0]);
      }
    } catch (err) {
      console.error("Failed to load published layers:", err);
    }
  };

  const copyToClipboard = (text, snippetId) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(snippetId);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const getGeoJsonUrl = (slug) => `${API_BASE}/api/public/geojson/${slug}`;
  const getMetadataUrl = (slug) => `${API_BASE}/api/layers/meta/${slug}`;

  const categories = useMemo(() => {
    const cats = layers.map((l) => l.category || "Uncategorized");
    return ["All", ...new Set(cats)];
  }, [layers]);

  const filteredLayers = useMemo(() => {
    let list = layers;
    if (categoryFilter !== "All") {
      list = list.filter(
        (l) => (l.category || "Uncategorized") === categoryFilter
      );
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter((l) =>
        `${l.name} ${l.slug}`.toLowerCase().includes(q)
      );
    }
    return list;
  }, [layers, categoryFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredLayers.length / pageSize));
  const pagedLayers = filteredLayers.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  const rangeStart =
    filteredLayers.length === 0
      ? 0
      : Math.min((page - 1) * pageSize + 1, filteredLayers.length);

  const rangeEnd =
    filteredLayers.length === 0
      ? 0
      : Math.min(page * pageSize, filteredLayers.length);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, categoryFilter, layers]);

  const getSnippets = () => {
    if (!selectedLayer) return {};

    return {
      leaflet: `// Install: npm install leaflet
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const map = L.map('map').setView([-7.5, 110.5], 8);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(map);

fetch('${getGeoJsonUrl(selectedLayer.slug)}')
  .then(res => res.json())
  .then(data => {
    L.geoJSON(data, {
      style: {
        color: '#154734',
        fillColor: '#A3D9A5',
        fillOpacity: 0.4,
        weight: 2
      }
    }).addTo(map);
  });`,

      mapbox: `// Install: npm install mapbox-gl
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/light-v11',
  center: [110.5, -7.5],
  zoom: 8
});

map.on('load', () => {
  map.addSource('${selectedLayer.slug}', {
    type: 'geojson',
    data: '${getGeoJsonUrl(selectedLayer.slug)}'
  });

  map.addLayer({
    id: '${selectedLayer.slug}-layer',
    type: 'fill',
    source: '${selectedLayer.slug}',
    paint: {
      'fill-color': '#A3D9A5',
      'fill-opacity': 0.4,
      'fill-outline-color': '#154734'
    }
  });
});`,

      googlemaps: `// Install: npm install @googlemaps/js-api-loader
import { Loader } from '@googlemaps/js-api-loader';

const loader = new Loader({
  apiKey: 'YOUR_API_KEY',
  version: 'weekly'
});

loader.load().then(async () => {
  const map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: -7.5, lng: 110.5 },
    zoom: 8
  });

  const response = await fetch('${getGeoJsonUrl(selectedLayer.slug)}');
  const geojson = await response.json();

  map.data.addGeoJson(geojson);
  map.data.setStyle({
    fillColor: '#A3D9A5',
    fillOpacity: 0.4,
    strokeColor: '#154734',
    strokeWeight: 2
  });
});`,
    };
  };

  const snippets = getSnippets();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* HEADER */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-[#154734]/10 rounded-lg p-2">
            <Code2 className="w-6 h-6 text-[#154734]" />
          </div>
          <h1 className="text-2xl font-bold text-[#154734]">API Services</h1>
        </div>
        <p className="text-sm text-[#2D2D2D]/70">
          Integrate published layers into external applications. All endpoints
          are public.
        </p>
      </div>

      {/* EMPTY STATE */}
      {layers.length === 0 ? (
        <div className="bg-white border border-[#A3D9A5]/40 rounded-xl p-8 text-center">
          <Globe2 className="w-12 h-12 text-[#2D2D2D]/30 mx-auto mb-3" />
          <p className="text-[#2D2D2D]/70">No published layers yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* LAYER SELECTOR */}
          <div className="bg-white border border-[#A3D9A5]/40 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-[#154734] mb-3">
              Select Layer
            </h2>

            <div className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="text-xs text-[#2D2D2D]/70">
                  Showing{" "}
                  <strong>
                    {filteredLayers.length === 0
                      ? "0"
                      : `${rangeStart}–${rangeEnd}`}
                  </strong>{" "}
                  of <strong>{filteredLayers.length}</strong> layers
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search name or slug..."
                    className="w-full sm:w-64 px-3 py-2 rounded-lg border border-[#A3D9A5]/60 text-sm focus:ring-2 focus:ring-[#154734]"
                  />

                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    className="w-full sm:w-40 px-3 py-2 rounded-lg border border-[#A3D9A5]/60 text-sm"
                  >
                    {categories.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* LIST */}
              <div className="space-y-2">
                {pagedLayers.map((layer) => (
                  <button
                    key={layer.slug}
                    onClick={() => setSelectedLayer(layer)}
                    className={`w-full text-left rounded-lg border p-3 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between transition ${
                      selectedLayer?.slug === layer.slug
                        ? "bg-[#154734] text-white border-[#154734]"
                        : "bg-[#F4F6F5] border-[#A3D9A5]/50 text-[#2D2D2D] hover:bg-[#A3D9A5]/20"
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-sm">{layer.name}</div>
                      <code className="text-[11px] opacity-70">
                        {layer.slug}
                      </code>
                      <div className="text-[11px] opacity-60">
                        {layer.category}
                      </div>
                    </div>
                    <div className="text-[11px] opacity-70">
                      {layer.featureCount?.toLocaleString()} feats
                    </div>
                  </button>
                ))}

                {pagedLayers.length === 0 && (
                  <div className="text-sm text-[#2D2D2D]/70">
                    No layers match filter.
                  </div>
                )}
              </div>

              {/* PAGINATION */}
              {filteredLayers.length > pageSize && (
                <div className="flex justify-between pt-2 text-sm text-[#2D2D2D]/80">
                  <div>
                    Page {page} of {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={page === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 rounded border border-[#A3D9A5]/60"
                    >
                      Prev
                    </button>
                    <button
                      disabled={page === totalPages}
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      className="px-3 py-1.5 rounded border border-[#A3D9A5]/60"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SELECTED LAYER DETAILS */}
          {selectedLayer && (
            <>
              {/* FORMAT SELECTOR */}
              <div className="bg-white border border-[#A3D9A5]/40 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-[#154734] mb-3">
                  Select Format
                </h2>

                <div className="flex gap-2">
                  {["GeoJSON"].map((format) => (
                    <button
                      key={format}
                      onClick={() => setSelectedFormat(format)}
                      className={`px-4 py-2 rounded-lg text-sm border ${
                        selectedFormat === format
                          ? "bg-[#154734] text-white border-[#154734]"
                          : "bg-[#F4F6F5] border-[#A3D9A5]/50 text-[#2D2D2D]"
                      }`}
                    >
                      {format}
                    </button>
                  ))}
                </div>

                <div className="text-xs text-[#2D2D2D]/70 mt-2">
                  GeoJSON — universal format for all mapping libraries.
                </div>
              </div>

              {/* ENDPOINTS */}
              <div className="bg-white border border-[#A3D9A5]/40 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-[#154734] mb-3">
                  API URLs
                </h2>

                {/* GEOJSON URL */}
                <div className="mb-4">
                  <label className="block text-xs font-medium text-[#2D2D2D]/70 mb-1">
                    GeoJSON Export URL
                  </label>

                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-[#F4F6F5] border border-[#A3D9A5]/50 px-3 py-2 rounded-lg text-xs">
                      {getGeoJsonUrl(selectedLayer.slug)}
                    </code>

                    <button
                      onClick={() =>
                        copyToClipboard(
                          getGeoJsonUrl(selectedLayer.slug),
                          "geojson-url"
                        )
                      }
                      className="p-2 rounded border border-[#A3D9A5]/60"
                    >
                      {copiedSnippet === "geojson-url" ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    <a
                      href={getGeoJsonUrl(selectedLayer.slug)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded border border-[#A3D9A5]/60"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>

                  <p className="text-xs text-[#2D2D2D]/60 mt-1">
                    Supports <code>?bbox=minLon,minLat,maxLon,maxLat</code>.
                  </p>
                </div>

                {/* METADATA URL */}
                <div>
                  <label className="block text-xs font-medium text-[#2D2D2D]/70 mb-1">
                    Metadata URL
                  </label>

                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-[#F4F6F5] border border-[#A3D9A5]/50 px-3 py-2 rounded-lg text-xs">
                      {getMetadataUrl(selectedLayer.slug)}
                    </code>

                    <button
                      onClick={() =>
                        copyToClipboard(
                          getMetadataUrl(selectedLayer.slug),
                          "meta-url"
                        )
                      }
                      className="p-2 rounded border border-[#A3D9A5]/60"
                    >
                      {copiedSnippet === "meta-url" ? (
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>

                    <a
                      href={getMetadataUrl(selectedLayer.slug)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded border border-[#A3D9A5]/60"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>

              {/* CODE SNIPPETS */}
              <div className="bg-white border border-[#A3D9A5]/40 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-[#154734] mb-3">
                  Integration Examples
                </h2>

                <div className="space-y-4">
                  {Object.entries(snippets).map(([key, code]) => (
                    <div key={key}>
                      <div className="flex justify-between mb-2">
                        <h3 className="text-sm font-medium">
                          {key === "leaflet"
                            ? "Leaflet"
                            : key === "mapbox"
                            ? "Mapbox GL JS"
                            : key === "googlemaps"
                            ? "Google Maps"
                            : key}
                        </h3>

                        <button
                          onClick={() => copyToClipboard(code, key)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded border border-[#A3D9A5]/60 text-xs"
                        >
                          {copiedSnippet === key ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" /> Copied!
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copy Code
                            </>
                          )}
                        </button>
                      </div>

                      <pre className="bg-[#1E1E1E] text-[#D4D4D4] rounded-lg p-4 overflow-x-auto text-xs">
                        <code>{code}</code>
                      </pre>
                    </div>
                  ))}
                </div>
              </div>

              {/* NOTES */}
              <div className="bg-[#F4F6F5] border border-[#A3D9A5]/40 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-[#154734] mb-2">
                  Notes
                </h3>

                <ul className="list-disc list-inside text-xs text-[#2D2D2D]/70 space-y-1">
                  <li>All endpoints are public.</li>
                  <li>GeoJSON limited to 10,000 features per request.</li>
                  <li>
                    Use <code>?bbox=</code> to filter by extent.
                  </li>
                  <li>All geometries are returned in EPSG:4326.</li>
                  <li>
                    Layer contains{" "}
                    <strong>
                      {selectedLayer.featureCount?.toLocaleString()}
                    </strong>{" "}
                    features.
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
