import React, { useState } from "react";
import {
  Layers,
  Plus,
  Eye,
  EyeOff,
  Trash2,
  Search,
  X,
  ChevronRight,
  Info,
} from "lucide-react";
import { slugOf } from "../utils/mapHelpers";

function AddLayerModal({
  open,
  onClose,
  filteredLayers,
  searchQuery,
  setSearchQuery,
  handleAddLayer,
  addedLayers,
}) {
  if (!open) return null;

  const grouped = filteredLayers.reduce((acc, layer) => {
    const cat = layer.category || "Uncategorized";
    acc[cat] = acc[cat] || [];
    acc[cat].push(layer);
    return acc;
  }, {});

  const categories = ["All", ...Object.keys(grouped)];
  const [activeCat, setActiveCat] = React.useState("All");

  return (
    <div className="slmp-modalOverlay" onClick={onClose}>
      <div
        className="slmp-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ padding: "18px 18px 14px 18px" }}
      >
        <div className="flex items-center justify-between mb-4 pr-1">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#154734]" />
            <h2 className="text-lg font-bold text-[#154734]">
              Choose Layers to Add
            </h2>
          </div>
          <button className="slmp-closeBtn" onClick={onClose}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="slmp-searchBar mb-3" style={{ borderRadius: 12 }}>
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search layers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="slmp-searchInput"
          />
        </div>

        <div className="flex flex-wrap gap-2 mb-3 px-1">
          {categories.map((cat) => {
            const active = activeCat === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCat(cat)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                  active
                    ? "bg-[#154734] text-white border-[#154734]"
                    : "bg-white text-[#154734] border-[#A3D9A5]/70 hover:bg-[#E7EFE9]"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto pr-1">
          {Object.entries(grouped)
            .filter(([cat]) => activeCat === "All" || activeCat === cat)
            .map(([cat, layers]) => (
              <div
                key={cat}
                className="rounded-2xl border border-[#A3D9A5]/50 bg-[#F8FBF8] p-4 shadow-sm"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs font-semibold text-[#154734] uppercase tracking-wide">
                    {cat}
                  </div>
                  <span className="text-[10px] text-[#2D2D2D]/60">
                    {layers.length} item
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  {layers.map((layer) => {
                    const key = slugOf(layer);
                    const already = addedLayers.some(
                      (l) => (l._id || slugOf(l)) === key
                    );
                    return (
                      <div
                        key={key}
                        className={`flex items-center justify-between gap-3 rounded-xl border border-[#A3D9A5]/60 bg-white px-3 py-2 shadow-sm hover:shadow-md transition ${
                          already ? "opacity-60" : ""
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="rounded-md border border-[#A3D9A5]/60 bg-[#F8FBF8] p-2 text-[#154734]">
                            <Layers className="w-5 h-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-sm font-semibold text-[#154734] truncate">
                              {layer.name || key}
                            </div>
                            <div className="flex items-center gap-2 text-[11px] text-[#2D2D2D]/60">
                              <span>{layer.status || "Draft"}</span>
                              <span className="inline-flex items-center gap-1 rounded-full bg-[#E7EFE9] px-2 py-0.5 text-[10px] text-[#154734] border border-[#A3D9A5]/50">
                                MVT
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          className="slmp-addItemBtn"
                          onClick={() => !already && handleAddLayer(layer)}
                          disabled={already}
                          title={already ? "Already added" : "Add to map"}
                        >
                          {already ? "Added" : <Plus className="w-4 h-4" />}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function MetaRow({ label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] uppercase tracking-wide text-[#2D2D2D]/60 font-semibold">
        {label}
      </span>
      <span className="text-[#154734] font-semibold">
        {value && String(value).trim() ? value : "-"}
      </span>
    </div>
  );
}

export default function LayerSidebar({
  sidebarOpen,
  setSidebarOpen,
  adminOn,
  toggleAdmin,
  addedLayers,
  visibleLayers,
  onToggleVisibility,
  onRemoveLayer,
  onFocusLayer,
  onAddLayerClick,
  addLayerModalOpen,
  closeAddLayerModal,
  filteredLayers,
  searchQuery,
  setSearchQuery,
  handleAddLayer,
  metadataMap = {},
  metadataOpen = false,
  onMetadataToggle = () => {},
  legendMap = {},
}) {
  const [metaModal, setMetaModal] = useState({ open: false, layerId: null });
  const [legendModal, setLegendModal] = useState({ open: false, layerId: null });

  React.useEffect(() => {
    if (!metadataOpen && metaModal.open) {
      setMetaModal({ open: false, layerId: null });
    }
  }, [metadataOpen, metaModal.open]);
  return (
    <>
      <aside
        className={`slmp-sidebar ${
          sidebarOpen ? "slmp-sidebar--open" : "slmp-sidebar--closed"
        }`}
      >
        <div className="slmp-sidebar__content">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#154734]" />
              <h2 className="text-lg font-bold text-[#154734]">Data Layers</h2>
            </div>
            <button
              className="slmp-btnToggle hover:rotate-90 transition-transform"
              onClick={() => setSidebarOpen(false)}
            >
              <ChevronRight />
            </button>
          </div>

          <div className="slmp-layerCard mb-4">
            <div className="text-sm">
              <div className="font-semibold text-[#154734]">
                Batas Administrasi
              </div>
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={adminOn} onChange={toggleAdmin} />
              <span className="text-sm">{adminOn ? "On" : "Off"}</span>
            </label>
          </div>

          <button className="slmp-addBtn" onClick={onAddLayerClick}>
            <Plus className="w-5 h-5" />
            Add Layer
          </button>

          <div className="slmp-layerList">
            {addedLayers.length === 0 ? (
              <p className="text-sm text-gray-500 italic">
                No layers added yet. Click + Layer to start!
              </p>
            ) : (
              addedLayers.map((layer) => {
                const id = layer._id || slugOf(layer);
                const isVisible = !!visibleLayers[id];
                return (
                  <div
                    key={id}
                    className="slmp-layerCard cursor-pointer"
                    onClick={() => onFocusLayer(layer)}
                  >
                    <span className="slmp-layerName">{layer.name || id}</span>
                    <div className="flex items-center gap-2">
                      <button
                        className="slmp-eyeBtn"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleVisibility(id);
                        }}
                        title={isVisible ? "Hide" : "Show"}
                      >
                        {isVisible ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-[#e7efe9] text-[#154734] hover:-translate-y-0.5 transition border border-[#A3D9A5]/60"
                        title="View metadata"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMetaModal({ open: true, layerId: id });
                          onMetadataToggle(true);
                        }}
                      >
                        <Info className="w-4 h-4" />
                      </button>
                      <button
                        className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-[#e7efe9] text-[#154734] hover:-translate-y-0.5 transition border border-[#A3D9A5]/60"
                        title="View legend"
                        onClick={(e) => {
                          e.stopPropagation();
                          setLegendModal({ open: true, layerId: id });
                        }}
                      >
                        <Layers className="w-4 h-4" />
                      </button>
                      <button
                        className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-[#d97070] text-white hover:-translate-y-0.5 transition"
                        title="Remove from map"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveLayer(id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </aside>

      {!sidebarOpen && (
        <button
          className="slmp-sidebarOpenBtn"
          onClick={() => setSidebarOpen(true)}
        >
          <ChevronRight className="w-4 h-4 rotate-180" />
        </button>
      )}

      <AddLayerModal
        open={addLayerModalOpen}
        onClose={closeAddLayerModal}
        filteredLayers={filteredLayers}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        handleAddLayer={handleAddLayer}
        addedLayers={addedLayers}
      />

      {metaModal.open && (
        <div
          className="fixed inset-0 z-[12000]"
          onClick={() => {
            setMetaModal({ open: false, layerId: null });
            onMetadataToggle(false);
          }}
        >
          <div
            className="pointer-events-auto"
            style={{
              position: "absolute",
              left: "22px",
              top: "110px",
              width: "680px",
              background: "white",
              border: "1px solid rgba(21,71,52,0.2)",
              borderRadius: "18px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between mb-0 px-4 py-3"
              style={{
                background: "linear-gradient(135deg, #1b7d4b, #154734)",
                color: "white",
                borderBottom: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <div className="flex items-center gap-2 font-semibold">
                <Info className="w-5 h-5" />
                <span>Layer Metadata</span>
              </div>
              <button
                className="slmp-closeBtn"
                style={{ color: "white" }}
                onClick={() => {
                  setMetaModal({ open: false, layerId: null });
                  onMetadataToggle(false);
                }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div style={{ padding: "16px" }}>
              {(() => {
                const id = metaModal.layerId;
                const meta = metadataMap[id];
                if (!meta) {
                  return (
                    <div className="text-sm text-[#2D2D2D]/70">
                      Metadata not available for this layer.
                    </div>
                  );
                }
                return (
                  <div className="grid grid-cols-2 gap-3 text-sm text-[#154734]">
                    <MetaRow label="Title" value={meta.title} />
                    <MetaRow label="Description" value={meta.description} />
                    <MetaRow label="Summary" value={meta.summary} />
                    <MetaRow label="Credits" value={meta.credits} />
                    <MetaRow
                      label="Bounding Box"
                      value={
                        Array.isArray(meta.bbox) && meta.bbox.length === 4
                          ? meta.bbox
                              .map((n) => Number(n).toFixed(4))
                              .join(", ")
                          : "-"
                      }
                    />
                    <MetaRow label="Specific Usage" value={meta.usage} />
                    <MetaRow label="Limitation" value={meta.limitation} />
                    <MetaRow
                      label="Scale Denominator"
                      value={meta.scaleDenominator}
                    />
                    <MetaRow
                      label="Spatial Ref (code)"
                      value={meta.spatialReferenceCode}
                    />
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )} 

      {legendModal.open && (
        <div
          className="fixed inset-0 z-[12000]"
          onClick={() => setLegendModal({ open: false, layerId: null })}
        >
          <div
            className="pointer-events-auto"
            style={{
              position: "absolute",
              left: "22px",
              top: "110px",
              width: "420px",
              background: "white",
              border: "1px solid rgba(21,71,52,0.2)",
              borderRadius: "18px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
              maxHeight: "70vh",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className="flex items-center justify-between mb-0 px-4 py-3"
              style={{
                background: "linear-gradient(135deg, #1b7d4b, #154734)",
                color: "white",
                borderBottom: "1px solid rgba(255,255,255,0.2)",
              }}
            >
              <div className="flex items-center gap-2 font-semibold">
                <Layers className="w-5 h-5" />
                <span>Layer Legend</span>
              </div>
              <button
                className="slmp-closeBtn"
                style={{ color: "white" }}
                onClick={() => setLegendModal({ open: false, layerId: null })}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div style={{ padding: "16px", overflowY: "auto", maxHeight: "calc(70vh - 60px)" }}>
              {(() => {
                const id = legendModal.layerId;
                const legend = legendMap[id];
                if (!legend || !legend.items?.length) {
                  return (
                    <div className="text-sm text-[#2D2D2D]/70">
                      Legend not available for this layer.
                    </div>
                  );
                }
                return (
                  <div className="flex flex-col gap-2">
                    {legend.field && (
                      <div className="text-xs uppercase tracking-wide text-[#2D2D2D]/70 font-semibold mb-1">
                        Field: <span className="text-[#154734]">{legend.field}</span>
                      </div>
                    )}
                    {legend.items.map((item, idx) => (
                      <div
                        key={`${id}-lg-${idx}`}
                        className="flex items-center gap-10 text-sm text-[#154734]"
                        style={{
                          padding: "8px 10px",
                          border: "1px solid rgba(163,217,165,0.6)",
                          borderRadius: "10px",
                          background: "#f8fbf8",
                        }}
                      >
                        <span
                          style={{
                            width: "22px",
                            height: "22px",
                            borderRadius: "5px",
                            border: "1px solid rgba(0,0,0,0.08)",
                            background: item.color,
                          }}
                        />
                        <span className="flex-1">{item.label}</span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
