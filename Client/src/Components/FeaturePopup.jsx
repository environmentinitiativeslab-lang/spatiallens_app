import React, { forwardRef } from "react";
import { Info, X } from "lucide-react";
import AttributesSection from "./AttributesSection";

const FeaturePopup = forwardRef(function FeaturePopup(
  { popupInfo, onClose },
  ref
) {
  if (!popupInfo) return null;

  return (
    <div
      ref={ref}
      className="fixed left-6 top-[52%] -translate-y-1/2 z-[1000] w-[380px] max-w-[90vw]"
    >
      <div className="bg-white rounded-xl shadow-xl border border-[#A3D9A5] overflow-hidden">
        <div className="bg-gradient-to-r from-[#154734] to-[#2e7d32] text-white px-4 py-2.5 rounded-t-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4" />
            <h3 className="font-bold text-sm">Feature Information</h3>
          </div>
          <button
            onClick={onClose}
            className="hover:bg-white/20 rounded-lg p-1 transition"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 max-h-[65vh] overflow-y-auto space-y-3 text-[13px]">
          <div className="pb-2 border-b border-[#A3D9A5]/30">
            <div className="text-[11px] text-[#2D2D2D]/60 mb-1">Layer</div>
            <div className="font-semibold text-[#154734] text-base leading-tight">
              {popupInfo.layerName}
            </div>
          </div>

          <AttributesSection popupInfo={popupInfo} />

          <div className="pt-3 border-t border-[#A3D9A5]/30 text-[11px] text-[#2D2D2D]/70 space-y-1">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1 text-[#154734] font-semibold">
                <span role="img" aria-label="pin">
                  📍
                </span>
                Koordinat
              </div>
              <button
                className="px-2 py-0.5 rounded-md border border-[#A3D9A5]/60 text-[#154734] hover:bg-[#A3D9A5]/15 text-[11px]"
                onClick={() => {
                  const text = `${popupInfo.lngLat.lng.toFixed(
                    6
                  )}, ${popupInfo.lngLat.lat.toFixed(6)}`;
                  navigator.clipboard?.writeText(text).catch(() => {});
                }}
              >
                Copy
              </button>
            </div>
            <div className="font-mono text-[12px] text-[#154734]">
              {popupInfo.lngLat.lng.toFixed(6)},{" "}
              {popupInfo.lngLat.lat.toFixed(6)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default FeaturePopup;
