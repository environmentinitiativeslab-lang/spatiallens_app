import React, { useEffect, useState, useMemo, useRef } from "react";
import { PaintBucket } from "lucide-react";
import { API_BASE } from "../../config";

const DEFAULT_STYLE = {
  fillColor: "#690000",
  lineColor: "#4a0000",
  fillOpacity: 0.6,
  lineWidth: 1,
};

const authHeaders = () => {
  const token = localStorage.getItem("sl:token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function StylingTab() {
  const [layers, setLayers] = useState([]);
  const [selected, setSelected] = useState("");
  const [style, setStyle] = useState(DEFAULT_STYLE);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [sldFile, setSldFile] = useState(null);
  const [useSingleColor, setUseSingleColor] = useState(true);
  const [categoryField, setCategoryField] = useState("");
  const [categoryColors, setCategoryColors] = useState([]);
  const [baseCategoryColors, setBaseCategoryColors] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [showChangedOnly, setShowChangedOnly] = useState(false);
  const listRef = useRef(null);

  const api = useMemo(
    () => async (path, opts = {}) => {
      const headers =
        opts.body instanceof FormData
          ? { ...authHeaders(), ...(opts.headers || {}) }
          : {
              "Content-Type": "application/json",
              ...authHeaders(),
              ...(opts.headers || {}),
            };
      const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
      if (!res.ok) {
        let msg = `${res.status} ${res.statusText}`;
        try {
          const data = await res.json();
          if (data?.message) msg = data.message;
        } catch {}
        throw new Error(msg);
      }
      if (res.status === 204) return null;
      const ct = res.headers.get("content-type") || "";
      return ct.includes("application/json") ? res.json() : null;
    },
    []
  );

  const loadLayers = async () => {
    setStatus("Loading layers...");
    try {
      const data = await api(`/api/layers/meta`);
      const list = Array.isArray(data) ? data : [];
      setLayers(list);
      if (list.length && !selected) {
        setSelected(list[0].slug);
      }
      setStatus("");
    } catch (err) {
      setStatus(`Failed load: ${err.message}`);
    }
  };

  const loadStyle = async (slug) => {
    if (!slug) return;
    setStatus("Loading style...");
    try {
      const res = await api(`/api/layers/${slug}/style`);
      const parsed = res && typeof res === "string" ? JSON.parse(res) : res;
      const derived = deriveStyleFromJson(parsed);
      setStyle(derived);
      const match = parseMatchExpression(derived.fillExpression || derived.lineExpression);
      setCategoryField(match?.field || "");
      setCategoryColors(match?.pairs || []);
      setBaseCategoryColors(match?.pairs || []);
      setUseSingleColor(!match || (match.pairs || []).length === 0);
      setStatus("");
    } catch (err) {
      // fallback to default
      setStyle(DEFAULT_STYLE);
      setUseSingleColor(true);
      setCategoryField("");
      setCategoryColors([]);
      setBaseCategoryColors([]);
      setStatus("");
    }
  };

  const saveStyle = async () => {
    if (!selected) return;
    setLoading(true);
    setStatus("Saving...");
    try {
      const payload = { ...style };
      const hasExpressions = Boolean(style.fillExpression || style.lineExpression);
      if (!hasExpressions || useSingleColor) {
        delete payload.fillExpression;
        delete payload.lineExpression;
        payload.fillExpression = undefined;
        payload.lineExpression = undefined;
        setCategoryColors([]);
        setCategoryField("");
        setBaseCategoryColors([]);
      } else {
        const expr = buildMatchExpression(categoryField, categoryColors, style.fillColor);
        const lineExpr = buildMatchExpression(categoryField, categoryColors, style.lineColor);
        payload.fillExpression = expr;
        payload.lineExpression = lineExpr;
      }
      await api(`/api/layers/${selected}/style`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      setStatus("Saved");
    } catch (err) {
      setStatus(`Save failed: ${err.message}`);
    } finally {
      setLoading(false);
      setTimeout(() => setStatus(""), 2000);
    }
  };

  const uploadSld = async () => {
    if (!selected || !sldFile) return;
    setLoading(true);
    setStatus("Uploading SLD...");
    try {
      const fd = new FormData();
      fd.append("file", sldFile);
      await api(`/api/layers/${selected}/style/sld`, {
        method: "POST",
        body: fd,
      });
      setStatus("SLD uploaded & applied");
      setSldFile(null);
      await loadStyle(selected);
    } catch (err) {
      setStatus(`SLD upload failed: ${err.message}`);
    } finally {
      setLoading(false);
      setTimeout(() => setStatus(""), 2500);
    }
  };

  useEffect(() => {
    loadLayers();
  }, []);

  useEffect(() => {
    if (selected) loadStyle(selected);
  }, [selected]);

  useEffect(() => {
    if (showAll && listRef.current) {
      listRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [showAll]);

  return (
    <div className="slad-styling fade-in flex justify-center">
      <div className="slad-styleCard bg-white border border-[#A3D9A5]/40 rounded-xl p-6 shadow-md max-w-lg w-full mt-4">
        <div className="slad-cardHeader flex items-center gap-2 mb-4">
          <PaintBucket className="w-5 h-5 text-[#154734]" />
          <h2 className="slad-cardTitle text-[#154734] font-semibold text-lg">
            Layer Styling
          </h2>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-semibold text-[#154734] mb-1">
            Pilih Layer
          </label>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            className="w-full border border-[#A3D9A5]/60 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#A3D9A5]/40 focus:border-[#154734] outline-none"
          >
            {layers.map((l) => (
              <option key={l.slug} value={l.slug}>
                {l.name || l.slug}
              </option>
            ))}
          </select>
        </div>

        <div className="slad-formGrid grid grid-cols-2 gap-4 mb-5">
          <label className="slad-field flex flex-col">
            <span className="slad-fieldLabel text-[#154734] text-sm font-semibold mb-1">
              Fill Color
            </span>
            <input
              type="color"
              value={style.fillColor}
              onChange={(e) =>
                setStyle((s) => ({ ...s, fillColor: e.target.value }))
              }
              disabled={!useSingleColor && Boolean(style.fillExpression || style.lineExpression)}
              className="slad-inputColor w-full h-10 border border-[#A3D9A5]/60 rounded-md cursor-pointer disabled:opacity-60"
              aria-label="Fill color"
            />
          </label>

          <label className="slad-field flex flex-col">
            <span className="slad-fieldLabel text-[#154734] text-sm font-semibold mb-1">
              Border Color
            </span>
            <input
              type="color"
              value={style.lineColor}
              onChange={(e) =>
                setStyle((s) => ({ ...s, lineColor: e.target.value }))
              }
              disabled={!useSingleColor && Boolean(style.fillExpression || style.lineExpression)}
              className="slad-inputColor w-full h-10 border border-[#A3D9A5]/60 rounded-md cursor-pointer disabled:opacity-60"
              aria-label="Border color"
            />
          </label>

          <label className="slad-field flex flex-col">
            <span className="slad-fieldLabel text-[#154734] text-sm font-semibold mb-1">
              Opacity
            </span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={style.fillOpacity}
              onChange={(e) =>
                setStyle((s) => ({ ...s, fillOpacity: Number(e.target.value) }))
              }
              disabled={!useSingleColor && Boolean(style.fillExpression || style.lineExpression)}
              className="slad-inputRange accent-[#154734] disabled:opacity-60"
              aria-label="Opacity"
            />
            <span className="text-xs text-[#2D2D2D]/70 mt-1">
              {style.fillOpacity}
            </span>
          </label>

          <label className="slad-field flex flex-col">
            <span className="slad-fieldLabel text-[#154734] text-sm font-semibold mb-1">
              Line Width
            </span>
            <input
              type="number"
              min="0.5"
              max="10"
              step="0.5"
              value={style.lineWidth}
              onChange={(e) =>
                setStyle((s) => ({ ...s, lineWidth: Number(e.target.value) }))
              }
              disabled={!useSingleColor && Boolean(style.fillExpression || style.lineExpression)}
              className="slad-inputNumber border border-[#A3D9A5]/60 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-[#A3D9A5]/40 focus:border-[#154734] outline-none transition disabled:opacity-60"
              aria-label="Line width"
            />
          </label>
        </div>

        <div className="flex flex-col gap-3">
          {Boolean(style.fillExpression || style.lineExpression) && (
            <div className="slad-sldPanel">
              <div className="slad-sldHeader">
                <div>
                  <div className="slad-sldTitle">Multi-category (SLD)</div>
                  <div className="slad-sldSubtitle">
                    Edit per-category colors, filter, or switch to single color to override all.
                  </div>
                  {categoryField && (
                    <div className="slad-sldField">
                      Field: <span>{categoryField}</span> · {categoryColors.length} categories
                    </div>
                  )}
                </div>
                <div className="slad-sldActions">
                  <input
                    type="text"
                    placeholder="Search category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="slad-sldSearch"
                  />
                  <label className="slad-sldToggle">
                    <input
                      type="checkbox"
                      checked={showChangedOnly}
                      onChange={(e) => setShowChangedOnly(e.target.checked)}
                    />
                    Changed only
                  </label>
                  <button
                    type="button"
                    className="slad-sldResetAll"
                    onClick={() => setCategoryColors(baseCategoryColors)}
                  >
                    Reset all
                  </button>
                </div>
              </div>

              {(() => {
                const filtered = categoryColors.filter((c, idx) => {
                  const matchesSearch = c.value
                    .toLowerCase()
                    .includes(searchTerm.trim().toLowerCase());
                  const changed =
                    baseCategoryColors[idx] &&
                    baseCategoryColors[idx].color !== c.color;
                  return matchesSearch && (!showChangedOnly || changed);
                });
                const list = showAll ? filtered : filtered.slice(0, 6);
                return (
                  <>
                    <div
                      ref={listRef}
                      className={`slad-sldLegend ${showAll ? "slad-sldLegend--expanded" : ""}`}
                    >
                      {list.map((c, idx) => {
                        const globalIndex = categoryColors.indexOf(c);
                        return (
                          <div key={`${c.value}-${idx}`} className="slad-sldRow">
                            <span className="slad-sldLabel">{c.value}</span>
                            <input
                              type="color"
                              value={c.color}
                              onChange={(e) =>
                                setCategoryColors((prev) =>
                                  prev.map((item, i) =>
                                    i === globalIndex ? { ...item, color: e.target.value } : item
                                  )
                                )
                              }
                              className="slad-sldColor"
                            />
                            <button
                              type="button"
                              className="slad-sldResetBtn"
                              onClick={() =>
                                setCategoryColors((prev) =>
                                  prev.map((item, i) =>
                                    i === globalIndex
                                      ? { ...item, color: baseCategoryColors[globalIndex]?.color || item.color }
                                      : item
                                  )
                                )
                              }
                            >
                              Reset
                            </button>
                          </div>
                        );
                      })}
                      {!filtered.length && (
                        <div className="slad-sldEmpty">No categories match the search.</div>
                      )}
                    </div>
                    {filtered.length > 6 && (
                      <button
                        type="button"
                        className="slad-sldViewAll"
                        onClick={() => setShowAll((v) => !v)}
                      >
                        {showAll ? "Show less" : `View all (${filtered.length})`}
                      </button>
                    )}
                  </>
                );
              })()}

              <label className="flex items-center gap-2 text-sm font-semibold text-[#154734]">
                <input
                  type="checkbox"
                  checked={useSingleColor}
                  onChange={(e) => setUseSingleColor(e.target.checked)}
                />
                Use single color (override all categories)
              </label>
            </div>
          )}

          <button
            type="button"
            onClick={saveStyle}
            disabled={loading}
            className="slad-applyBtn bg-[#154734] text-white font-semibold text-sm py-2 px-4 rounded-md hover:bg-[#103827] transition disabled:opacity-60"
          >
            {loading ? "Saving..." : "Apply Style"}
          </button>

          <div className="border-t border-[#A3D9A5]/50 pt-3">
            <p className="text-sm font-semibold text-[#154734] mb-2">
              Upload SLD (.sld)
            </p>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept=".sld"
                onChange={(e) => setSldFile(e.target.files?.[0] || null)}
                className="text-sm text-[#2D2D2D]"
              />
              <button
                type="button"
                onClick={uploadSld}
                disabled={loading || !sldFile}
                className="bg-white text-[#154734] border border-[#A3D9A5]/70 px-3 py-2 rounded-md text-sm font-semibold hover:bg-[#F4F6F5] transition disabled:opacity-60"
              >
                Apply SLD
              </button>
            </div>
            <p className="text-xs text-[#2D2D2D]/60 mt-1">
              SLD colors will update the layer style and legend defaults.
            </p>
          </div>
        </div>

        {status && (
          <p className="text-xs text-[#2D2D2D]/70 mt-2 text-center">{status}</p>
        )}
      </div>
    </div>
  );
}

function deriveStyleFromJson(parsed) {
  if (!parsed) return DEFAULT_STYLE;

  // If admin saved simple JSON (fillColor, etc)
  const fillColor = parsed.fillColor || parsed["fill-color"];
  const lineColor = parsed.lineColor || parsed["line-color"];
  const fillOpacity = parsed.fillOpacity ?? parsed["fill-opacity"];
  const lineWidth = parsed.lineWidth ?? parsed["line-width"];
  const fillExpression = parsed.fillExpression;
  const lineExpression = parsed.lineExpression;

  const asNumber = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };

  if (fillColor || lineColor || fillOpacity || lineWidth) {
    return {
      fillColor: fillColor || DEFAULT_STYLE.fillColor,
      lineColor: lineColor || fillColor || DEFAULT_STYLE.lineColor,
      fillOpacity:
        asNumber(fillOpacity) !== undefined ? asNumber(fillOpacity) : DEFAULT_STYLE.fillOpacity,
      lineWidth: asNumber(lineWidth) || DEFAULT_STYLE.lineWidth,
      fillExpression,
      lineExpression,
    };
  }

  // Try Mapbox style format from SLD conversion
  if (Array.isArray(parsed.layers)) {
    const fillLayer = parsed.layers.find((l) => l.type === "fill");
    const lineLayer = parsed.layers.find((l) => l.type === "line");
    const fillPaint = fillLayer?.paint || {};
    const linePaint = lineLayer?.paint || {};

    return {
      fillColor: fillPaint["fill-color"] || DEFAULT_STYLE.fillColor,
      lineColor: linePaint["line-color"] || fillPaint["fill-color"] || DEFAULT_STYLE.lineColor,
      fillOpacity:
        asNumber(fillPaint["fill-opacity"]) !== undefined
          ? asNumber(fillPaint["fill-opacity"])
          : DEFAULT_STYLE.fillOpacity,
      lineWidth:
        asNumber(linePaint["line-width"]) !== undefined
          ? asNumber(linePaint["line-width"])
          : DEFAULT_STYLE.lineWidth,
      fillExpression,
      lineExpression,
    };
  }

  return { ...DEFAULT_STYLE, fillExpression, lineExpression };
}

function parseMatchExpression(expr) {
  if (!Array.isArray(expr) || expr[0] !== "match") return null;
  const getPart = expr[1];
  if (!Array.isArray(getPart) || getPart[0] !== "get") return null;
  const field = getPart[1];
  const pairs = [];
  for (let i = 2; i < expr.length - 1; i += 2) {
    const val = expr[i];
    const col = expr[i + 1];
    if (val !== undefined && col !== undefined) {
      pairs.push({ value: String(val), color: String(col) });
    }
  }
  return { field, pairs };
}

function buildMatchExpression(field, pairs, fallback) {
  if (!field || !pairs || !pairs.length) return null;
  const expr = ["match", ["get", field]];
  pairs.forEach((p) => {
    expr.push(p.value, p.color);
  });
  expr.push(fallback || DEFAULT_STYLE.fillColor);
  return expr;
}
