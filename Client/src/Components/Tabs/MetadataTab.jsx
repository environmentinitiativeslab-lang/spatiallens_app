import React, { useEffect, useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { API_BASE } from "../../config";
import { slugOf } from "../../utils/mapHelpers";

function authHeaders() {
  const token = localStorage.getItem("sl:token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function MetadataTab() {
  const [layers, setLayers] = useState([]);
  const [selected, setSelected] = useState("");
  const [meta, setMeta] = useState(null);
  const [status, setStatus] = useState("");
  const [xmlPreview, setXmlPreview] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [parsed, setParsed] = useState(null);

  const api = useMemo(
    () => async (path) => {
      const res = await fetch(`${API_BASE}${path}`, { headers: authHeaders() });
      if (!res.ok) {
        let msg = `${res.status} ${res.statusText}`;
        try {
          const data = await res.json();
          if (data?.message) msg = data.message;
        } catch {}
        throw new Error(msg);
      }
      const ct = res.headers.get("content-type") || "";
      return ct.includes("application/json") ? res.json() : null;
    },
    []
  );

  const loadList = async () => {
    setStatus("Loading layers...");
    try {
      const data = await api(`/api/layers/meta`);
      const list = Array.isArray(data) ? data : [];
      setLayers(list);
      if (list.length && !selected) setSelected(list[0].slug);
      setStatus("");
    } catch (err) {
      setStatus(`Failed load: ${err.message}`);
    }
  };

  const loadMeta = async (slug) => {
    if (!slug) return;
    setStatus("Loading metadata...");
    try {
      const detail = await api(`/api/layers/meta/${slug}`);
      setMeta(detail);
      setStatus("");
      await loadXml(slug);
      await loadParsed(slug);
    } catch (err) {
      setMeta(null);
      setXmlPreview("");
      setParsed(null);
      setStatus("Metadata belum tersedia untuk layer ini.");
    }
  };

  const loadXml = async (slug) => {
    if (!slug) return;
    try {
      const res = await fetch(`${API_BASE}/api/layers/${slug}/metadata/xml`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        setXmlPreview("");
        return;
      }
      const text = await res.text();
      setXmlPreview(text || "");
    } catch {
      setXmlPreview("");
    }
  };

  const loadParsed = async (slug) => {
    if (!slug) return;
    try {
      const res = await fetch(`${API_BASE}/api/layers/${slug}/metadata/info`, {
        headers: authHeaders(),
      });
      if (!res.ok) {
        setParsed(null);
        return;
      }
      const data = await res.json();
      setParsed(data);
    } catch {
      setParsed(null);
    }
  };

  useEffect(() => {
    loadList();
  }, []);

  useEffect(() => {
    if (selected) loadMeta(selected);
  }, [selected]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selected || !file) {
      setStatus("Pilih layer dan file .xml terlebih dulu.");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".xml")) {
      setStatus("Hanya file .xml yang diizinkan.");
      return;
    }
    setUploading(true);
    setStatus("Uploading metadata...");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(
        `${API_BASE}/api/layers/${selected}/metadata/upload`,
        {
          method: "POST",
          headers: authHeaders(),
          body: form,
        }
      );
      if (!res.ok) {
        let msg = `${res.status} ${res.statusText}`;
        try {
          const d = await res.json();
          if (d?.message) msg = d.message;
        } catch {}
        throw new Error(msg);
      }
      setStatus("Upload metadata berhasil.");
      setFile(null);
      await loadMeta(selected);
    } catch (err) {
      setStatus(`Upload gagal: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const formatBBox = (bbox) => {
    if (!Array.isArray(bbox) || bbox.length !== 4) return "-";
    return bbox.map((n) => Number(n).toFixed(4)).join(", ");
  };

  return (
    <div className="slmeta-wrap fade-in flex justify-center">
      <div className="slmeta-card bg-white border border-[#A3D9A5]/40 rounded-xl p-6 shadow-md max-w-xl w-full mt-4">
        <div className="slmeta-head flex items-center gap-2 mb-4">
          <FileText className="slmeta-icon w-5 h-5 text-[#154734]" />
          <h2 className="slmeta-title text-[#154734] font-semibold text-lg">
            Layer Metadata
          </h2>
        </div>

        <div className="slmeta-form flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <label className="slmeta-field flex flex-col">
              <span className="slmeta-label text-[#154734] text-sm font-semibold mb-1">
                Pilih Layer
              </span>
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                className="slmeta-input border border-[#A3D9A5]/60 rounded-md px-3 py-2 text-sm text-[#2D2D2D] focus:border-[#154734] focus:ring-2 focus:ring-[#A3D9A5]/40 outline-none transition"
              >
                {layers.map((l) => (
                  <option key={slugOf(l)} value={l.slug}>
                    {l.name || l.slug}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-end text-xs text-[#2D2D2D]/70">
              {status}
            </div>
          </div>

          <form
            className="slmeta-upload flex flex-col gap-3 border border-dashed border-[#A3D9A5]/70 rounded-md p-3 bg-[#F4F6F5]/60"
            onSubmit={handleUpload}
          >
            <div className="text-sm text-[#154734] font-semibold">
              Upload Metadata (.xml)
            </div>
            <input
              type="file"
              accept=".xml,text/xml"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="text-sm"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="slhp-btnPrimary text-sm px-4 py-2"
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload Metadata"}
              </button>
              {file && (
                <span className="text-xs text-[#2D2D2D]/70">
                  {file.name}
                </span>
              )}
            </div>
          </form>

          {meta ? (
            <div className="grid grid-cols-2 gap-4 text-sm text-[#154734]">
              <div className="slmeta-field flex flex-col">
                <span className="slmeta-label text-[#2D2D2D]/70 text-xs font-semibold">
                  Name
                </span>
                <span className="font-semibold">{meta.name}</span>
              </div>
              <div className="slmeta-field flex flex-col">
                <span className="slmeta-label text-[#2D2D2D]/70 text-xs font-semibold">
                  Slug
                </span>
                <code className="font-mono bg-[#F4F6F5] px-2 py-1 rounded border border-[#A3D9A5]/40">
                  {meta.slug}
                </code>
              </div>

              <div className="slmeta-field flex flex-col">
                <span className="slmeta-label text-[#2D2D2D]/70 text-xs font-semibold">
                  Status
                </span>
                <span>{meta.status}</span>
              </div>
              <div className="slmeta-field flex flex-col">
                <span className="slmeta-label text-[#2D2D2D]/70 text-xs font-semibold">
                  Feature Count
                </span>
                <span>{meta.featureCount ?? "-"}</span>
              </div>

              <div className="slmeta-field flex flex-col">
                <span className="slmeta-label text-[#2D2D2D]/70 text-xs font-semibold">
                  Min/Max Zoom
                </span>
                <span>
                  z{meta.minzoom ?? 0} – z{meta.maxzoom ?? 22}
                </span>
              </div>
              <div className="slmeta-field flex flex-col">
                <span className="slmeta-label text-[#2D2D2D]/70 text-xs font-semibold">
                  BBOX (EPSG:4326)
                </span>
                <span>{formatBBox(meta.bbox)}</span>
              </div>

              <div className="slmeta-field flex flex-col col-span-2">
                <span className="slmeta-label text-[#2D2D2D]/70 text-xs font-semibold">
                  Updated At
                </span>
                <span>{meta.updatedAt ?? "-"}</span>
              </div>

              {parsed && (
                <>
                  <div className="slmeta-field flex flex-col">
                    <span className="slmeta-label text-[#2D2D2D]/70 text-xs font-semibold">
                      Title
                    </span>
                    <span>{parsed.title || "-"}</span>
                  </div>
                  <div className="slmeta-field flex flex-col">
                    <span className="slmeta-label text-[#2D2D2D]/70 text-xs font-semibold">
                      Description
                    </span>
                    <span>{parsed.description || "-"}</span>
                  </div>
                  <div className="slmeta-field flex flex-col">
                    <span className="slmeta-label text-[#2D2D2D]/70 text-xs font-semibold">
                      Summary
                    </span>
                    <span>{parsed.summary || "-"}</span>
                  </div>
                  <div className="slmeta-field flex flex-col">
                    <span className="slmeta-label text-[#2D2D2D]/70 text-xs font-semibold">
                      Credits
                    </span>
                    <span>{parsed.credits || "-"}</span>
                  </div>
                  <div className="slmeta-field flex flex-col">
                    <span className="slmeta-label text-[#2D2D2D]/70 text-xs font-semibold">
                      Bounding Box (lon/lat)
                    </span>
                    <span>
                      {Array.isArray(parsed.bbox) && parsed.bbox.length === 4
                        ? parsed.bbox.map((n) => Number(n).toFixed(4)).join(", ")
                        : "-"}
                    </span>
                  </div>
                  <div className="slmeta-field flex flex-col">
                    <span className="slmeta-label text-[#2D2D2D]/70 text-xs font-semibold">
                      Specific Usage
                    </span>
                    <span>{parsed.usage || "-"}</span>
                  </div>
                  <div className="slmeta-field flex flex-col">
                    <span className="slmeta-label text-[#2D2D2D]/70 text-xs font-semibold">
                      Limitation
                    </span>
                    <span>{parsed.limitation || "-"}</span>
                  </div>
                  <div className="slmeta-field flex flex-col">
                    <span className="slmeta-label text-[#2D2D2D]/70 text-xs font-semibold">
                      Scale Denominator
                    </span>
                    <span>{parsed.scaleDenominator || "-"}</span>
                  </div>
                  <div className="slmeta-field flex flex-col">
                    <span className="slmeta-label text-[#2D2D2D]/70 text-xs font-semibold">
                      Spatial Reference (code)
                    </span>
                    <span>{parsed.spatialReferenceCode || "-"}</span>
                  </div>
                </>
              )}

              <div className="slmeta-field flex flex-col col-span-2">
                <span className="slmeta-label text-[#2D2D2D]/70 text-xs font-semibold">
                  Metadata XML
                </span>
                {xmlPreview ? (
                  <pre className="whitespace-pre-wrap text-xs bg-[#F4F6F5] border border-[#A3D9A5]/60 rounded-md p-2 max-h-64 overflow-auto">
                    {xmlPreview}
                  </pre>
                ) : (
                  <span className="text-xs text-[#2D2D2D]/70">
                    Belum ada file metadata untuk layer ini.
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-sm text-[#2D2D2D]/70">
              Metadata belum tersedia untuk layer ini. Upload file metadata XML
              per layer jika belum ada.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default MetadataTab;
