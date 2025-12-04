import React, { useState, useEffect, useMemo } from "react";
import ReactDOM from "react-dom";
import {
  Globe2,
  Upload,
  X,
  CheckCircle2,
  AlertTriangle,
  Info,
  Edit2,
  Trash2,
  Save,
} from "lucide-react";
import { API_BASE } from "../../config";

// ---------- UI: Toasts ----------
function Toast({ toast, onClose }) {
  const ICON =
    toast.type === "success"
      ? CheckCircle2
      : toast.type === "error"
      ? AlertTriangle
      : Info;
  return (
    <div
      className={`pointer-events-auto flex items-start gap-3 rounded-xl border bg-white p-3 shadow-lg min-w-[260px] ${
        toast.type === "success"
          ? "border-[#A3D9A5]"
          : toast.type === "error"
          ? "border-red-300"
          : "border-slate-200"
      }`}
    >
      <div
        className={`mt-0.5 rounded-md p-1.5 ${
          toast.type === "success"
            ? "bg-[#A3D9A5]/40 text-[#154734]"
            : toast.type === "error"
            ? "bg-red-100 text-red-700"
            : "bg-slate-100 text-slate-700"
        }`}
      >
        <ICON className="h-4 w-4" />
      </div>
      <div className="flex-1">
        {toast.title && (
          <div className="text-[13px] font-semibold text-[#154734]">
            {toast.title}
          </div>
        )}
        {toast.message && (
          <div className="text-[12px] text-[#2D2D2D]/70">{toast.message}</div>
        )}
      </div>
      <button
        onClick={() => onClose(toast.id)}
        className="ml-2 rounded-md p-1 text-slate-400 hover:text-slate-600"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

function ToastStack({ toasts, onClose }) {
  return ReactDOM.createPortal(
    <div className="pointer-events-none fixed right-4 top-4 z-[10000] flex flex-col gap-3">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onClose={onClose} />
      ))}
    </div>,
    document.body
  );
}

// ---------- UI: Modal ----------
function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 relative animate-fadeZoom border border-[#A3D9A5]/40"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        {title && (
          <h3 className="text-lg font-bold text-[#154734] mb-4">{title}</h3>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}

// ---------- Confirm Dialog ----------
function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  isDeleting,
}) {
  if (!open) return null;
  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[9999] bg-black/40 backdrop-blur-sm flex items-center justify-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 relative animate-fadeZoom border border-red-300"
      >
        <h3 className="text-lg font-bold text-red-700 mb-3">{title}</h3>
        <p className="text-sm text-[#2D2D2D]/70 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="px-4 py-2 rounded-md text-sm border border-[#A3D9A5]/60 text-[#154734] hover:bg-[#A3D9A5]/20 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="px-4 py-2 rounded-md text-sm bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function StatusPill({ status }) {
  const isPub = status === "Published";
  return (
    <span
      className={`px-2 py-0.5 text-[11px] rounded-md border ${
        isPub
          ? "bg-[#A3D9A5]/40 text-[#154734] border-[#A3D9A5]/60"
          : "bg-red-200/60 text-[#a14d4d] border-red-300/70"
      }`}
    >
      {status}
    </span>
  );
}

// ---------- Helpers ----------
function authHeaders() {
  const token = localStorage.getItem("sl:token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function getUserRole() {
  try {
    const u = JSON.parse(localStorage.getItem("sl:user") || "{}");
    return (u.role || "VIEWER").toUpperCase();
  } catch {
    return "VIEWER";
  }
}

export default function DataLayersTab() {
  // Filters & data
  const [filter, setFilter] = useState("All");
  const [meta, setMeta] = useState([]); // from /api/layers/meta

  // Upload modal state
  const [showUpload, setShowUpload] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [newLayer, setNewLayer] = useState({
    name: "",
    type: "Shapefile (.shp)",
    status: "Draft",
    category: "KPI",
    newCategory: "",
    file: null,
  });

  // Edit state
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Delete state
  const [deleteConfirm, setDeleteConfirm] = useState({
    open: false,
    layer: null,
  });
  const [isDeleting, setIsDeleting] = useState(false);

  // Fix whitelist state
  const [isFixing, setIsFixing] = useState(false);

  // Toasts
  const [toasts, setToasts] = useState([]);
  const addToast = (t) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const toast = {
      id,
      type: t.type || "info",
      title: t.title,
      message: t.message,
      duration: t.duration || 3600,
    };
    setToasts((prev) => [...prev, toast]);
    setTimeout(
      () => setToasts((prev) => prev.filter((x) => x.id !== id)),
      toast.duration
    );
  };
  const closeToast = (id) =>
    setToasts((prev) => prev.filter((t) => t.id !== id));

  // Role gating
  const role = useMemo(getUserRole, []);
  const isAdmin = role === "ADMIN";
  const canEdit = isAdmin || role === "EDITOR";

  // API util
  const api = async (path, opts = {}) => {
    const usingFormData = opts.body instanceof FormData;
    const headers = usingFormData
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
        if (data?.message) msg = `${res.status} ${data.message}`;
      } catch {}
      throw new Error(msg);
    }
    if (res.status === 204) return null;
    const ct = res.headers.get("content-type") || "";
    return ct.includes("application/json") ? res.json() : null;
  };

  // Load metadata list
  const fetchMeta = async () => {
    try {
      const data = await api(`/api/layers/meta`);
      setMeta(Array.isArray(data) ? data : []);
    } catch (err) {
      addToast({
        type: "error",
        title: "Failed to load layers",
        message: "Check server connection.",
      });
    }
  };

  useEffect(() => {
    fetchMeta();
  }, []);

  // Actions on metadata
  const setStatus = async (slug, next) => {
    try {
      await api(`/api/layers/meta/${slug}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: next }),
      });
      setMeta((prev) =>
        prev.map((m) => (m.slug === slug ? { ...m, status: next } : m))
      );
      addToast({
        type: "success",
        title: next === "Published" ? "Published" : "Unpublished",
        message: slug,
      });
    } catch (err) {
      addToast({
        type: "error",
        title: "Failed to update status",
        message: err.message,
      });
    }
  };

  // Edit layer name
  const handleStartEdit = (layer) => {
    setEditingId(layer.slug);
    setEditName(layer.name);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const handleSaveEdit = async (slug) => {
    if (!editName.trim()) {
      addToast({
        type: "error",
        title: "Name required",
        message: "Layer name cannot be empty",
      });
      return;
    }

    setIsSavingEdit(true);
    try {
      // First, get all layer uploads to find the correct id
      const uploads = await api(`/api/layers`);
      const upload = uploads.find((u) => u.slug === slug);

      if (!upload) {
        throw new Error("Layer upload not found");
      }

      // Update via LayerController PUT /api/layers/{id}
      await api(`/api/layers/${upload.id}`, {
        method: "PUT",
        body: JSON.stringify({ name: editName.trim() }),
      });

      // Update local state
      setMeta((prev) =>
        prev.map((m) => (m.slug === slug ? { ...m, name: editName.trim() } : m))
      );

      setEditingId(null);
      setEditName("");

      addToast({
        type: "success",
        title: "Updated",
        message: `Layer name updated to "${editName.trim()}"`,
      });
    } catch (err) {
      addToast({
        type: "error",
        title: "Failed to update",
        message: err.message,
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Delete layer - need to find LayerUpload id by slug first
  const handleDeleteLayer = async () => {
    if (!deleteConfirm.layer) return;

    setIsDeleting(true);
    const layer = deleteConfirm.layer;

    try {
      // First, get all layer uploads to find the correct id
      const uploads = await api(`/api/layers`);
      const upload = uploads.find((u) => u.slug === layer.slug);

      if (!upload) {
        throw new Error("Layer upload not found");
      }

      // Delete via LayerController DELETE /api/layers/{id}
      await api(`/api/layers/${upload.id}`, {
        method: "DELETE",
      });

      // Remove from local state
      setMeta((prev) => prev.filter((m) => m.slug !== layer.slug));

      setDeleteConfirm({ open: false, layer: null });

      addToast({
        type: "success",
        title: "Deleted",
        message: `Layer "${layer.name}" has been deleted`,
      });
    } catch (err) {
      addToast({
        type: "error",
        title: "Failed to delete",
        message: err.message,
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenToMap = (m) => {
    localStorage.setItem(
      "sl:addToMap",
      JSON.stringify({
        name: m.name,
        slug: m.slug,
        minzoom: Number.isFinite(m.minzoom) ? m.minzoom : 0,
        maxzoom: Number.isFinite(m.maxzoom) ? m.maxzoom : 22,
      })
    );
    window.location.href = "/map";
  };

  // Fix properties whitelist untuk semua layer
  const handleFixAllWhitelist = async () => {
    if (!isAdmin) return;
    setIsFixing(true);
    try {
      const results = await api(`/api/admin/layers/fix-all-whitelist`, {
        method: "POST",
      });
      
      const fixedCount = results.filter(r => r.message === "Fixed").length;
      const skippedCount = results.filter(r => r.message.includes("skipped")).length;
      
      addToast({
        type: "success",
        title: "Properties Fixed",
        message: `Fixed ${fixedCount} layer(s), skipped ${skippedCount}`,
      });
      
      await fetchMeta();
    } catch (err) {
      addToast({
        type: "error",
        title: "Fix Failed",
        message: err.message,
      });
    } finally {
      setIsFixing(false);
    }
  };

  // Upload
  const handleUpload = async (e) => {
    e.preventDefault();
    if (!newLayer.file) {
      setUploadError("Please select a file to upload.");
      return;
    }
    setIsUploading(true);
    setUploadError("");

    const categoryValue =
      newLayer.category === "__new"
        ? newLayer.newCategory.trim() || "Uncategorized"
        : newLayer.category;

    const formData = new FormData();
    formData.append("name", newLayer.name);
    formData.append("type", newLayer.type);
    formData.append("status", newLayer.status);
    formData.append("category", categoryValue);
    formData.append("file", newLayer.file);

    try {
      const resp = await api(`/api/layers/upload`, {
        method: "POST",
        body: formData,
      });
      await fetchMeta();
      setNewLayer({
        name: "",
        type: "Shapefile (.shp)",
        status: "Draft",
        category: "KPI",
        newCategory: "",
        file: null,
      });
      setShowUpload(false);
      addToast({
        type: "success",
        title: "Upload complete",
        message: resp?.slug ? `Slug: ${resp.slug}` : undefined,
      });
    } catch (err) {
      setUploadError(`Upload failed: ${err.message}`);
      addToast({ type: "error", title: "Upload failed", message: err.message });
    } finally {
      setIsUploading(false);
    }
  };

  // Filtered view
  const filtered = useMemo(() => {
    if (filter === "All") return meta;
    return meta.filter((m) => m.status === filter);
  }, [meta, filter]);

  // Categories (fixed + from metadata)
  const categories = useMemo(() => {
    const base = ["KPI", "Tutupan Lahan"];
    const fromMeta = meta
      .map((m) => (m.category ? m.category : ""))
      .filter(Boolean);
    return Array.from(new Set([...base, ...fromMeta]));
  }, [meta]);

  return (
    <div className="sldlt-root fade-in">
      {/* Toasts */}
      <ToastStack toasts={toasts} onClose={closeToast} />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onClose={() =>
          !isDeleting && setDeleteConfirm({ open: false, layer: null })
        }
        onConfirm={handleDeleteLayer}
        title="Delete Layer"
        message={`Are you sure you want to delete "${deleteConfirm.layer?.name}"? This will remove the layer from the database and delete all associated files. This action cannot be undone.`}
        isDeleting={isDeleting}
      />

      {/* Toolbar */}
      <div className="sldlt-toolbar flex flex-wrap items-center justify-between mb-6 gap-3">
        <div className="sldlt-filterGroup flex gap-2">
          {["All", "Published", "Draft"].map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={`px-4 py-2 rounded-md text-sm font-medium border transition ${
                filter === option
                  ? "bg-[#154734] text-white border-[#154734]"
                  : "bg-white border-[#A3D9A5]/50 text-[#2D2D2D]/70 hover:bg-[#A3D9A5]/20"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchMeta}
            className="px-3 py-2 rounded-md text-sm border border-[#A3D9A5]/60 text-[#154734] hover:bg-[#A3D9A5]/20"
            title="Refresh"
          >
            Refresh
          </button>

          {isAdmin && (
            <button
              type="button"
              onClick={handleFixAllWhitelist}
              disabled={isFixing}
              className="px-3 py-2 rounded-md text-sm border border-orange-300 text-orange-700 hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Fix properties whitelist for layers without attributes"
            >
              {isFixing ? "Fixing..." : "Fix Properties"}
            </button>
          )}

          {canEdit && (
            <button
              type="button"
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 bg-[#154734] text-white px-4 py-2 rounded-md text-sm font-semibold shadow-md hover:-translate-y-0.5 hover:bg-[#103827] transition"
            >
              <Upload className="w-4 h-4" />
              Upload Layer
            </button>
          )}
        </div>
      </div>

      {/* Grid of metadata */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(270px,1fr))] gap-6">
        {filtered.map((m) => {
          const isPublished = m.status === "Published";
          const isEditing = editingId === m.slug;

          return (
            <div
              key={m.slug}
              className="bg-white border border-[#A3D9A5]/40 rounded-xl p-5 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="bg-[#154734]/10 rounded-md p-2 text-[#154734]">
                  <Globe2 className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full font-semibold text-[#154734] text-sm border border-[#A3D9A5] rounded px-2 py-1 focus:ring-2 focus:ring-[#A3D9A5] outline-none"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveEdit(m.slug);
                        if (e.key === "Escape") handleCancelEdit();
                      }}
                    />
                  ) : (
                    <h3 className="font-semibold text-[#154734] text-sm truncate">
                      {m.name}
                    </h3>
                  )}
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <code className="text-[11px] bg-[#F4F6F5] border border-[#A3D9A5]/50 rounded px-1.5 py-0.5 text-[#2D2D2D]/70">
                  {m.slug}
                </code>
                <StatusPill status={m.status} />
                {m.category && (
                  <span className="px-2 py-0.5 text-[11px] rounded-md bg-[#E7EFE9] text-[#154734] border border-[#A3D9A5]/60">
                    {m.category}
                  </span>
                )}
              </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px] mt-1">
                {Number.isFinite(m.featureCount) && (
                  <span className="px-2 py-1 bg-[#F4F6F5] border border-[#A3D9A5]/50 rounded-md">
                    {m.featureCount} features
                  </span>
                )}
                {Number.isFinite(m.minzoom) && Number.isFinite(m.maxzoom) && (
                  <span className="px-2 py-1 bg-[#F4F6F5] border border-[#A3D9A5]/50 rounded-md">
                    z{m.minzoom}–{m.maxzoom}
                  </span>
                )}
                {m.updatedAt && (
                  <span
                    className="px-2 py-1 bg-[#F4F6F5] border border-[#A3D9A5]/50 rounded-md"
                    title="Updated at"
                  >
                    {new Date(m.updatedAt).toLocaleString()}
                  </span>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-4">
                {/* Edit Name Button */}
                {canEdit && !isEditing && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] border border-[#A3D9A5]/60 text-[#154734] hover:bg-[#A3D9A5]/20"
                    onClick={() => handleStartEdit(m)}
                    title="Edit name"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                )}

                {/* Save/Cancel Buttons (when editing) */}
                {canEdit && isEditing && (
                  <>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] border border-[#A3D9A5]/60 text-[#154734] hover:bg-[#A3D9A5]/20"
                      onClick={handleCancelEdit}
                      disabled={isSavingEdit}
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] bg-[#154734] text-white hover:bg-[#103827]"
                      onClick={() => handleSaveEdit(m.slug)}
                      disabled={isSavingEdit}
                    >
                      <Save className="w-4 h-4" />
                      {isSavingEdit ? "Saving..." : "Save"}
                    </button>
                  </>
                )}

                {/* Delete Button */}
                {canEdit && !isEditing && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] border border-red-300 text-red-600 hover:bg-red-50"
                    onClick={() => setDeleteConfirm({ open: true, layer: m })}
                    title="Delete layer"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete
                  </button>
                )}

                {/* Publish/Unpublish (ADMIN) */}
                {isAdmin && !isEditing && (
                  <button
                    type="button"
                    onClick={() =>
                      setStatus(m.slug, isPublished ? "Draft" : "Published")
                    }
                    className="px-2 py-1 rounded-md text-[11px] border border-[#A3D9A5]/60 text-[#154734] hover:bg-[#A3D9A5]/20"
                  >
                    {isPublished ? "Unpublish" : "Publish"}
                  </button>
                )}

                {/* Open on Map */}
                {!isEditing && (
                  <button
                    type="button"
                    className="w-8 h-8 flex items-center justify-center rounded-md bg-[#9eb58b] text-white hover:-translate-y-1 transition"
                    title="Open on Map"
                    onClick={() => handleOpenToMap(m)}
                  >
                    <Globe2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full text-center text-gray-500 mt-10">
            No layers found for "{filter}".
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Modal
        open={showUpload && canEdit}
        onClose={() => setShowUpload(false)}
        title="Upload New Layer"
      >
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#2D2D2D]/70 mb-1">
              Layer Name
            </label>
            <input
              type="text"
              value={newLayer.name}
              onChange={(e) =>
                setNewLayer({ ...newLayer, name: e.target.value })
              }
              className="w-full border border-[#A3D9A5]/50 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#A3D9A5] outline-none"
              placeholder="e.g., Sungai Nasional"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2D2D2D]/70 mb-1">
              File
            </label>
            <input
              type="file"
              onChange={(e) =>
                setNewLayer({ ...newLayer, file: e.target.files?.[0] || null })
              }
              accept=".zip,.geojson"
              className="w-full text-sm border border-[#A3D9A5]/50 rounded-md px-3 py-2 cursor-pointer bg-[#F4F6F5] hover:bg-[#E8EEE8]"
              required
            />
            <p className="text-[11px] text-[#2D2D2D]/60 mt-1">
              For Shapefile, upload a <b>.zip</b> containing .shp + .shx + .dbf
              + .prj
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[#2D2D2D]/70 mb-1">
                Type
              </label>
              <select
                value={newLayer.type}
                onChange={(e) =>
                  setNewLayer({ ...newLayer, type: e.target.value })
                }
                className="w-full border border-[#A3D9A5]/50 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#A3D9A5]"
              >
                <option>Shapefile (.shp)</option>
                <option>GeoJSON</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#2D2D2D]/70 mb-1">
                Status
              </label>
              <select
                value={newLayer.status}
                onChange={(e) =>
                  setNewLayer({ ...newLayer, status: e.target.value })
                }
                className="w-full border border-[#A3D9A5]/50 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#A3D9A5]"
              >
                <option>Draft</option>
                {isAdmin && <option>Published</option>}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#2D2D2D]/70 mb-1">
              Category
            </label>
            <select
              value={newLayer.category}
              onChange={(e) =>
                setNewLayer({ ...newLayer, category: e.target.value })
              }
              className="w-full border border-[#A3D9A5]/50 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#A3D9A5]"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="__new">+ Add new category</option>
            </select>
            {newLayer.category === "__new" && (
              <input
                type="text"
                value={newLayer.newCategory}
                onChange={(e) =>
                  setNewLayer({ ...newLayer, newCategory: e.target.value })
                }
                className="mt-2 w-full border border-[#A3D9A5]/50 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-[#A3D9A5]"
                placeholder="Enter new category"
              />
            )}
          </div>

          {uploadError && <p className="text-red-500 text-sm">{uploadError}</p>}

          <button
            type="submit"
            disabled={isUploading}
            className="w-full mt-2 bg-[#154734] text-white py-2 rounded-md font-semibold hover:bg-[#103827] transition disabled:opacity-50"
          >
            {isUploading ? "Uploading..." : "Upload"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
