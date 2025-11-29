import React from "react";

const pickValue = (props, keys) => {
  for (const key of keys) {
    const val = props[key];
    if (val !== undefined && val !== null && String(val).trim() !== "") {
      return val;
    }
  }
  return null;
};

const formatVal = (v) => {
  if (v === null || v === undefined || String(v).trim() === "") return "-";
  const num = Number(v);
  return Number.isFinite(num) ? num.toLocaleString() : String(v);
};

export default function AttributesSection({ popupInfo }) {
  const props = popupInfo?.properties || {};
  const areaHa = popupInfo?.areaInfo?.ha ?? pickValue(props, ["LUAS", "LUAS_HA", "AREA_HA"]);

  const items = [
    { label: "Nama Objek", value: pickValue(props, ["NAMOBJ", "NAME_OBJ", "NAME", "NAMA", "NAMA_OBJEK"]) },
    { label: "Catatan", value: pickValue(props, ["REMARK", "CATATAN", "NOTE"]) },
    { label: "Perda", value: pickValue(props, ["NO PERDA", "NOPERDA", "NO_PERDA", "PERDA"]) },
    { label: "Luas (Ha)", value: areaHa },
  ];

  return (
    <div className="text-sm">
      <div className="text-xs font-semibold text-[#154734] mb-2 flex items-center gap-1">
        <div className="w-2 h-2 bg-[#154734] rounded-full" />
        Data Objek
      </div>
      <div className="space-y-2">
        {items.map(({ label, value }) => (
          <div
            key={label}
            className="grid grid-cols-[110px_1fr] items-start gap-x-3 gap-y-2 py-2 border-b border-[#A3D9A5]/20 last:border-0"
          >
            <div className="text-xs font-medium text-[#6B6B6B] uppercase tracking-wide flex justify-between">
              <span>{label}</span>
              <span>:</span>
            </div>
            <div className="text-[#154734] font-medium text-left break-words whitespace-pre-wrap">
              {formatVal(value)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
