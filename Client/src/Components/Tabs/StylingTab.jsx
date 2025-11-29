import React, { useEffect, useState, useMemo } from "react";
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
      setStyle({
        fillColor: parsed?.fillColor || DEFAULT_STYLE.fillColor,
        lineColor: parsed?.lineColor || DEFAULT_STYLE.lineColor,
        fillOpacity:
          Number.isFinite(parsed?.fillOpacity) && parsed.fillOpacity >= 0
            ? parsed.fillOpacity
            : DEFAULT_STYLE.fillOpacity,
        lineWidth:
          Number.isFinite(parsed?.lineWidth) && parsed.lineWidth > 0
            ? parsed.lineWidth
            : DEFAULT_STYLE.lineWidth,
      });
      setStatus("");
    } catch (err) {
      // fallback to default
      setStyle(DEFAULT_STYLE);
      setStatus("");
    }
  };

  const saveStyle = async () => {
    if (!selected) return;
    setLoading(true);
    setStatus("Saving...");
    try {
      await api(`/api/layers/${selected}/style`, {
        method: "PUT",
        body: JSON.stringify(style),
      });
      setStatus("Saved");
    } catch (err) {
      setStatus(`Save failed: ${err.message}`);
    } finally {
      setLoading(false);
      setTimeout(() => setStatus(""), 2000);
    }
  };

  useEffect(() => {
    loadLayers();
  }, []);

  useEffect(() => {
    if (selected) loadStyle(selected);
  }, [selected]);

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
              className="slad-inputColor w-full h-10 border border-[#A3D9A5]/60 rounded-md cursor-pointer"
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
              className="slad-inputColor w-full h-10 border border-[#A3D9A5]/60 rounded-md cursor-pointer"
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
              className="slad-inputRange accent-[#154734]"
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
              className="slad-inputNumber border border-[#A3D9A5]/60 rounded-md px-2 py-1 text-sm focus:ring-2 focus:ring-[#A3D9A5]/40 focus:border-[#154734] outline-none transition"
              aria-label="Line width"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={saveStyle}
          disabled={loading}
          className="slad-applyBtn bg-[#154734] text-white font-semibold text-sm py-2 px-4 rounded-md hover:bg-[#103827] transition disabled:opacity-60"
        >
          {loading ? "Saving..." : "Apply Style"}
        </button>

        {status && (
          <p className="text-xs text-[#2D2D2D]/70 mt-2 text-center">{status}</p>
        )}
      </div>
    </div>
  );
}
