import React from "react";
import {
  Layers,
  Plus,
  Eye,
  EyeOff,
  Trash2,
  Search,
  X,
  ChevronRight,
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
  return (
    <div className="slmp-modalOverlay" onClick={onClose}>
      <div className="slmp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="slmp-modalHeader">
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

        <div className="slmp-searchBar">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search layers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="slmp-searchInput"
          />
        </div>

        <div className="slmp-layerGrid">
          {filteredLayers.map((layer) => {
            const key = slugOf(layer);
            const already = addedLayers.some(
              (l) => (l._id || slugOf(l)) === key
            );
            return (
              <div
                key={key}
                className={`slmp-layerCardModal ${
                  already ? "slmp-layerCardModal--disabled" : ""
                }`}
              >
                <div className="slmp-cardThumb">
                  <Layers className="w-8 h-8 text-[#A3D9A5]" />
                </div>
                <span className="slmp-cardName">{layer.name || key}</span>
                <button
                  className="slmp-addItemBtn"
                  onClick={() => !already && handleAddLayer(layer)}
                  disabled={already}
                >
                  {already ? "Added" : <Plus className="w-4 h-4" />}
                </button>
                <div className="absolute right-2 top-2 text-[10px] px-1.5 py-0.5 rounded bg-[#F4F6F5] border border-[#A3D9A5]/60 text-[#154734]">
                  MVT
                </div>
              </div>
            );
          })}
        </div>
      </div>
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
}) {
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
              <div className="font-semibold text-[#154734]">Batas Admin</div>
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
    </>
  );
}
