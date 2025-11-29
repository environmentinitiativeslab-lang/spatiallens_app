import React, { useState, useEffect } from "react";
import { Code2, Copy, CheckCircle2, Globe2, ExternalLink } from "lucide-react";
import { API_BASE } from "../../config";

export default function ApiServicesTab() {
  const [layers, setLayers] = useState([]);
  const [selectedLayer, setSelectedLayer] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState("MVT");
  const [copiedSnippet, setCopiedSnippet] = useState(null);

  useEffect(() => {
    fetchPublishedLayers();
  }, []);

  const fetchPublishedLayers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/layers/meta`);
      const data = await res.json();
      const published = data.filter((layer) => layer.status === "Published");
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

  const getTileUrl = (slug) => {
    return `${API_BASE}/api/public/tiles/${slug}/{z}/{x}/{y}.pbf`;
  };

  const getGeoJsonUrl = (slug) => {
    return `${API_BASE}/api/public/geojson/${slug}`;
  };

  const getWmsUrl = (slug) => {
    return `${API_BASE}/api/public/wms/${slug}?bbox={minX},{minY},{maxX},{maxY}&width=256&height=256`;
  };

  const getMetadataUrl = (slug) => {
    return `${API_BASE}/api/layers/meta/${slug}`;
  };

  const getSnippets = () => {
    if (!selectedLayer) return {};

    if (selectedFormat === "MVT") {
      return {
        leaflet: `// Install: npm install leaflet-vector-grid
import L from 'leaflet';
import VectorGrid from 'leaflet-vector-grid';

const map = L.map('map').setView([-7.5, 110.5], 8);

// Base map
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(map);

// Add MVT layer
const mvtLayer = L.vectorGrid.protobuf(
  '${getTileUrl(selectedLayer.slug)}',
  {
    rendererFactory: L.canvas.tile,
    vectorTileLayerStyles: {
      '${selectedLayer.slug}': {
        weight: 2,
        color: '#154734',
        fillColor: '#A3D9A5',
        fillOpacity: 0.4
      }
    }
  }
).addTo(map);`,

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
    type: 'vector',
    tiles: ['${getTileUrl(selectedLayer.slug)}']
  });

  map.addLayer({
    id: '${selectedLayer.slug}-layer',
    type: 'fill',
    source: '${selectedLayer.slug}',
    'source-layer': '${selectedLayer.slug}',
    paint: {
      'fill-color': '#A3D9A5',
      'fill-opacity': 0.4,
      'fill-outline-color': '#154734'
    }
  });
});`,

        openlayers: `// Install: npm install ol
import Map from 'ol/Map';
import View from 'ol/View';
import VectorTileLayer from 'ol/layer/VectorTile';
import VectorTileSource from 'ol/source/VectorTile';
import MVT from 'ol/format/MVT';
import { Style, Fill, Stroke } from 'ol/style';
import { fromLonLat } from 'ol/proj';

const map = new Map({
  target: 'map',
  view: new View({
    center: fromLonLat([110.5, -7.5]),
    zoom: 8
  })
});

const mvtLayer = new VectorTileLayer({
  source: new VectorTileSource({
    format: new MVT(),
    url: '${getTileUrl(selectedLayer.slug)}'
  }),
  style: new Style({
    fill: new Fill({
      color: 'rgba(163, 217, 165, 0.4)'
    }),
    stroke: new Stroke({
      color: '#154734',
      width: 2
    })
  })
});

map.addLayer(mvtLayer);`,
      };
    } else if (selectedFormat === "GeoJSON") {
      return {
        leaflet: `// Install: npm install leaflet
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const map = L.map('map').setView([-7.5, 110.5], 8);

// Base map
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(map);

// Fetch and add GeoJSON layer
fetch('${getGeoJsonUrl(selectedLayer.slug)}')
  .then(res => res.json())
  .then(data => {
    L.geoJSON(data, {
      style: {
        color: '#154734',
        fillColor: '#A3D9A5',
        fillOpacity: 0.4,
        weight: 2
      },
      onEachFeature: (feature, layer) => {
        if (feature.properties) {
          layer.bindPopup(JSON.stringify(feature.properties, null, 2));
        }
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

  // Fetch GeoJSON data
  const response = await fetch('${getGeoJsonUrl(selectedLayer.slug)}');
  const geojson = await response.json();

  // Add data layer
  map.data.addGeoJson(geojson);
  map.data.setStyle({
    fillColor: '#A3D9A5',
    fillOpacity: 0.4,
    strokeColor: '#154734',
    strokeWeight: 2
  });
});`,
      };
    } else if (selectedFormat === "WMS") {
      return {
        leaflet: `// Install: npm install leaflet
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const map = L.map('map').setView([-7.5, 110.5], 8);

// Base map
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap'
}).addTo(map);

// Custom WMS tile layer
L.TileLayer.WMS = L.TileLayer.extend({
  getTileUrl: function (coords) {
    const tileBounds = this._tileCoordsToBounds(coords);
    const sw = L.CRS.EPSG3857.project(tileBounds.getSouthWest());
    const ne = L.CRS.EPSG3857.project(tileBounds.getNorthEast());
    const bbox = [sw.x, sw.y, ne.x, ne.y].join(',');
    
    return \`${API_BASE}/api/public/wms/${selectedLayer.slug}?bbox=\${bbox}&width=256&height=256\`;
  }
});

new L.TileLayer.WMS().addTo(map);`,

        openlayers: `// Install: npm install ol
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import XYZ from 'ol/source/XYZ';
import { fromLonLat } from 'ol/proj';
import { transformExtent } from 'ol/proj';

const map = new Map({
  target: 'map',
  view: new View({
    center: fromLonLat([110.5, -7.5]),
    zoom: 8
  })
});

const wmsLayer = new TileLayer({
  source: new XYZ({
    tileUrlFunction: function(tileCoord) {
      const z = tileCoord[0];
      const x = tileCoord[1];
      const y = tileCoord[2];
      
      const tileSize = 256;
      const extent = this.getTileGrid().getTileCoordExtent([z, x, y]);
      const bbox = extent.join(',');
      
      return \`${API_BASE}/api/public/wms/${selectedLayer.slug}?bbox=\${bbox}&width=\${tileSize}&height=\${tileSize}\`;
    }
  })
});

map.addLayer(wmsLayer);`,

        googlemaps: `// Install: npm install @googlemaps/js-api-loader
import { Loader } from '@googlemaps/js-api-loader';

const loader = new Loader({
  apiKey: 'YOUR_API_KEY',
  version: 'weekly'
});

loader.load().then(() => {
  const map = new google.maps.Map(document.getElementById('map'), {
    center: { lat: -7.5, lng: 110.5 },
    zoom: 8,
    mapTypeId: 'roadmap'
  });

  // Custom overlay for WMS tiles
  const WmsTileLayer = function() {};
  WmsTileLayer.prototype.tileSize = new google.maps.Size(256, 256);
  
  WmsTileLayer.prototype.getTile = function(coord, zoom, ownerDocument) {
    const img = ownerDocument.createElement('img');
    const projection = map.getProjection();
    const zoomFactor = Math.pow(2, zoom);
    
    const worldCoord = {
      x: coord.x / zoomFactor,
      y: coord.y / zoomFactor
    };
    
    const latLngNE = projection.fromPointToLatLng(
      new google.maps.Point(
        (worldCoord.x + 1 / zoomFactor) * 256,
        worldCoord.y * 256
      )
    );
    const latLngSW = projection.fromPointToLatLng(
      new google.maps.Point(
        worldCoord.x * 256,
        (worldCoord.y + 1 / zoomFactor) * 256
      )
    );
    
    // Convert to Web Mercator (EPSG:3857)
    const bbox = [latLngSW.lng(), latLngSW.lat(), latLngNE.lng(), latLngNE.lat()].join(',');
    
    img.src = \`${API_BASE}/api/public/wms/${selectedLayer.slug}?bbox=\${bbox}&width=256&height=256\`;
    img.style.width = '256px';
    img.style.height = '256px';
    
    return img;
  };

  const imageMapType = new google.maps.ImageMapType(new WmsTileLayer());
  map.overlayMapTypes.push(imageMapType);
});`,
      };
    }

    return {};
  };

  const snippets = getSnippets();

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-[#154734]/10 rounded-lg p-2">
            <Code2 className="w-6 h-6 text-[#154734]" />
          </div>
          <h1 className="text-2xl font-bold text-[#154734]">API Services</h1>
        </div>
        <p className="text-sm text-[#2D2D2D]/70">
          Integrate published vector tile layers into your own applications. All
          endpoints are publicly accessible without authentication.
        </p>
      </div>

      {layers.length === 0 ? (
        <div className="bg-white border border-[#A3D9A5]/40 rounded-xl p-8 text-center">
          <Globe2 className="w-12 h-12 text-[#2D2D2D]/30 mx-auto mb-3" />
          <p className="text-[#2D2D2D]/70">
            No published layers available yet.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Layer Selector */}
          <div className="bg-white border border-[#A3D9A5]/40 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-[#154734] mb-3">
              Select Layer
            </h2>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
              {layers.map((layer) => (
                <button
                  key={layer.slug}
                  onClick={() => setSelectedLayer(layer)}
                  className={`text-left p-3 rounded-lg border transition ${
                    selectedLayer?.slug === layer.slug
                      ? "bg-[#154734] text-white border-[#154734]"
                      : "bg-[#F4F6F5] border-[#A3D9A5]/50 text-[#2D2D2D] hover:bg-[#A3D9A5]/20"
                  }`}
                >
                  <div className="font-medium text-sm truncate">
                    {layer.name}
                  </div>
                  <code className="text-xs opacity-75">{layer.slug}</code>
                </button>
              ))}
            </div>
          </div>

          {selectedLayer && (
            <>
              {/* Format Selector */}
              <div className="bg-white border border-[#A3D9A5]/40 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-[#154734] mb-3">
                  Select Format
                </h2>
                <div className="flex gap-2">
                  {["MVT", "GeoJSON", "WMS"].map((format) => (
                    <button
                      key={format}
                      onClick={() => setSelectedFormat(format)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium border transition ${
                        selectedFormat === format
                          ? "bg-[#154734] text-white border-[#154734]"
                          : "bg-[#F4F6F5] border-[#A3D9A5]/50 text-[#2D2D2D] hover:bg-[#A3D9A5]/20"
                      }`}
                    >
                      {format}
                    </button>
                  ))}
                </div>
                <div className="mt-3 text-xs text-[#2D2D2D]/60">
                  {selectedFormat === "MVT" && (
                    <p>
                      <strong>Vector Tiles</strong> - Best performance for large
                      datasets. Requires MVT-compatible library.
                    </p>
                  )}
                  {selectedFormat === "GeoJSON" && (
                    <p>
                      <strong>GeoJSON</strong> - Universal format, works with
                      all mapping libraries. Best for small to medium datasets
                      (&lt;10k features).
                    </p>
                  )}
                  {selectedFormat === "WMS" && (
                    <p>
                      <strong>Raster Tiles</strong> - Image-based tiles.
                      Compatible with Google Maps and all platforms.
                      Non-interactive.
                    </p>
                  )}
                </div>
              </div>

              {/* Endpoints */}
              <div className="bg-white border border-[#A3D9A5]/40 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-[#154734] mb-4">
                  API Endpoints
                </h2>

                <div className="space-y-4">
                  {/* Format-specific URL */}
                  {selectedFormat === "MVT" && (
                    <div>
                      <label className="block text-xs font-medium text-[#2D2D2D]/70 mb-2">
                        MVT Tile URL
                      </label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-[#F4F6F5] border border-[#A3D9A5]/50 rounded-lg px-3 py-2 text-xs text-[#2D2D2D] overflow-x-auto">
                          {getTileUrl(selectedLayer.slug)}
                        </code>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              getTileUrl(selectedLayer.slug),
                              "tile-url"
                            )
                          }
                          className="p-2 rounded-md border border-[#A3D9A5]/60 text-[#154734] hover:bg-[#A3D9A5]/20"
                          title="Copy URL"
                        >
                          {copiedSnippet === "tile-url" ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-[#2D2D2D]/60 mt-1">
                        Replace <code>{`{z}/{x}/{y}`}</code> with tile
                        coordinates
                      </p>
                    </div>
                  )}

                  {selectedFormat === "GeoJSON" && (
                    <div>
                      <label className="block text-xs font-medium text-[#2D2D2D]/70 mb-2">
                        GeoJSON Export URL
                      </label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-[#F4F6F5] border border-[#A3D9A5]/50 rounded-lg px-3 py-2 text-xs text-[#2D2D2D] overflow-x-auto">
                          {getGeoJsonUrl(selectedLayer.slug)}
                        </code>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              getGeoJsonUrl(selectedLayer.slug),
                              "geojson-url"
                            )
                          }
                          className="p-2 rounded-md border border-[#A3D9A5]/60 text-[#154734] hover:bg-[#A3D9A5]/20"
                          title="Copy URL"
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
                          className="p-2 rounded-md border border-[#A3D9A5]/60 text-[#154734] hover:bg-[#A3D9A5]/20"
                          title="Open in new tab"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                      <p className="text-xs text-[#2D2D2D]/60 mt-1">
                        Returns FeatureCollection with up to 10,000 features.
                        Add <code>?bbox=minLon,minLat,maxLon,maxLat</code> to
                        filter by area.
                      </p>
                    </div>
                  )}

                  {selectedFormat === "WMS" && (
                    <div>
                      <label className="block text-xs font-medium text-[#2D2D2D]/70 mb-2">
                        WMS Tile URL
                      </label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 bg-[#F4F6F5] border border-[#A3D9A5]/50 rounded-lg px-3 py-2 text-xs text-[#2D2D2D] overflow-x-auto">
                          {getWmsUrl(selectedLayer.slug)}
                        </code>
                        <button
                          onClick={() =>
                            copyToClipboard(
                              getWmsUrl(selectedLayer.slug),
                              "wms-url"
                            )
                          }
                          className="p-2 rounded-md border border-[#A3D9A5]/60 text-[#154734] hover:bg-[#A3D9A5]/20"
                          title="Copy URL"
                        >
                          {copiedSnippet === "wms-url" ? (
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-[#2D2D2D]/60 mt-1">
                        Returns PNG image. bbox in EPSG:3857 (Web Mercator).
                        Default size: 256x256px.
                      </p>
                    </div>
                  )}

                  {/* Metadata URL */}
                  <div>
                    <label className="block text-xs font-medium text-[#2D2D2D]/70 mb-2">
                      Layer Metadata
                    </label>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-[#F4F6F5] border border-[#A3D9A5]/50 rounded-lg px-3 py-2 text-xs text-[#2D2D2D] overflow-x-auto">
                        {getMetadataUrl(selectedLayer.slug)}
                      </code>
                      <button
                        onClick={() =>
                          copyToClipboard(
                            getMetadataUrl(selectedLayer.slug),
                            "meta-url"
                          )
                        }
                        className="p-2 rounded-md border border-[#A3D9A5]/60 text-[#154734] hover:bg-[#A3D9A5]/20"
                        title="Copy URL"
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
                        className="p-2 rounded-md border border-[#A3D9A5]/60 text-[#154734] hover:bg-[#A3D9A5]/20"
                        title="Open in new tab"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                    <p className="text-xs text-[#2D2D2D]/60 mt-1">
                      Returns bounds, zoom levels, and feature count
                    </p>
                  </div>
                </div>
              </div>

              {/* Code Examples */}
              <div className="bg-white border border-[#A3D9A5]/40 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-[#154734] mb-4">
                  Integration Examples
                </h2>

                <div className="space-y-4">
                  {/* Render examples based on available snippets */}
                  {Object.entries(snippets).map(([library, code]) => {
                    const libraryNames = {
                      leaflet: "Leaflet",
                      mapbox: "Mapbox GL JS",
                      openlayers: "OpenLayers",
                      googlemaps: "Google Maps",
                    };

                    return (
                      <div key={library}>
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-medium text-[#2D2D2D]">
                            {libraryNames[library] || library}
                          </h3>
                          <button
                            onClick={() => copyToClipboard(code, library)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs border border-[#A3D9A5]/60 text-[#154734] hover:bg-[#A3D9A5]/20"
                          >
                            {copiedSnippet === library ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                Copy Code
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="bg-[#1E1E1E] text-[#D4D4D4] rounded-lg p-4 text-xs overflow-x-auto">
                          <code>{code}</code>
                        </pre>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Additional Info */}
              <div className="bg-[#F4F6F5] border border-[#A3D9A5]/40 rounded-xl p-5">
                <h3 className="text-sm font-semibold text-[#154734] mb-2">
                  Notes
                </h3>
                <ul className="text-xs text-[#2D2D2D]/70 space-y-1.5 list-disc list-inside">
                  <li>
                    All endpoints are <strong>public</strong> and require no
                    authentication
                  </li>
                  {selectedFormat === "MVT" && (
                    <>
                      <li>
                        Tiles are served in{" "}
                        <strong>Mapbox Vector Tile (MVT)</strong> format
                      </li>
                      <li>
                        Zoom levels range from{" "}
                        <strong>{selectedLayer.minzoom ?? 0}</strong> to{" "}
                        <strong>{selectedLayer.maxzoom ?? 22}</strong>
                      </li>
                      <li>
                        Best performance for large datasets with client-side
                        styling
                      </li>
                    </>
                  )}
                  {selectedFormat === "GeoJSON" && (
                    <>
                      <li>
                        Returns standard{" "}
                        <strong>GeoJSON FeatureCollection</strong>
                      </li>
                      <li>
                        Limited to <strong>10,000 features</strong> per request
                      </li>
                      <li>Use bbox parameter to filter by geographic area</li>
                      <li>
                        All geometries transformed to <strong>EPSG:4326</strong>
                      </li>
                    </>
                  )}
                  {selectedFormat === "WMS" && (
                    <>
                      <li>
                        Returns <strong>PNG raster images</strong> (256x256px
                        default)
                      </li>
                      <li>
                        Bbox must be in <strong>EPSG:3857</strong> (Web
                        Mercator)
                      </li>
                      <li>
                        Non-interactive - features cannot be clicked or styled
                        dynamically
                      </li>
                      <li>
                        Compatible with all mapping platforms including Google
                        Maps
                      </li>
                    </>
                  )}
                  <li>
                    Layer contains approximately{" "}
                    <strong>
                      {selectedLayer.featureCount?.toLocaleString() ?? "N/A"}
                    </strong>{" "}
                    features
                  </li>
                  <li>CORS is enabled for cross-origin requests</li>
                </ul>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
