import React from "react";
import { Link2 } from "lucide-react";

function IntegrationTab() {
  return (
    <div className="slint-wrap fade-in flex justify-center">
      <div className="slint-card bg-white border border-[#A3D9A5]/40 rounded-xl p-6 shadow-md max-w-lg w-full mt-4">
        <div className="slint-head flex items-center gap-2 mb-4">
          <Link2 className="slint-icon w-5 h-5 text-[#154734]" />
          <h2 className="slint-title text-[#154734] font-semibold text-lg">
            Integration Settings
          </h2>
        </div>

        <div className="slint-body flex flex-col gap-4">
          <label className="slint-field flex flex-col">
            <span className="slint-label text-[#154734] text-sm font-semibold mb-1">
              External GeoServer / API URL
            </span>
            <input
              type="text"
              placeholder="https://geoserver.spatial-lens.com/api/layers"
              className="slint-input border border-[#A3D9A5]/60 rounded-md px-3 py-2 text-sm text-[#2D2D2D] focus:border-[#154734] focus:ring-2 focus:ring-[#A3D9A5]/40 outline-none transition"
            />
          </label>

          <button
            type="button"
            className="slint-testBtn bg-[#154734] text-white font-semibold text-sm py-2 px-4 rounded-md hover:bg-[#103827] transition w-fit"
          >
            Test Connection
          </button>
        </div>
      </div>
    </div>
  );
}

export default IntegrationTab;
