import React from "react";
import {
  Layers,
  Info,
  Paintbrush,
  Users,
  Link2,
  BarChart2,
  LogOut,
} from "lucide-react";
import logoEIL from "../assets/img/LogoEILTP.png";

function SidebarMenu({ activeTab, setActiveTab }) {
  const menu = [
    { id: "layers", label: "Data Layers", Icon: Layers },
    // { id: "metadata", label: "Metadata", Icon: Info },
    { id: "styling", label: "Styling", Icon: Paintbrush },
    { id: "access", label: "Access Control", Icon: Users },
    { id: "api", label: "API Services", Icon: Link2 },
    { id: "stats", label: "Statistics", Icon: BarChart2 },
  ];

  return (
    <aside className="slad-sidebar w-[250px] bg-white/75 backdrop-blur-xl border-r border-[#A3D9A5]/40 shadow-lg flex flex-col px-5">
      {/* Brand */}
      <div className="slad-brand sticky top-0 z-10 bg-white/80 backdrop-blur-md pt-6 pb-4 flex items-center gap-2 border-b border-[#A3D9A5]/30">
        <img src={logoEIL} alt="Spatial Lens" className="w-10 h-10" />
        <div>
          <h1 className="text-[#154734] font-extrabold text-lg tracking-tight">
            Spatial Lens
          </h1>
          <p className="text-xs text-[#2D2D2D]/60 -mt-1">Admin Panel</p>
        </div>
      </div>

      {/* Menu */}
      <nav className="slad-menu flex flex-col gap-2 mt-4 overflow-y-auto flex-1">
        {menu.map(({ id, label, Icon }) => {
          const active = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              aria-current={active ? "page" : undefined}
              onClick={() => setActiveTab(id)}
              className={[
                "slad-menuBtn flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                active
                  ? "slad-menuBtn--active bg-[#154734] text-white shadow-md"
                  : "text-[#2D2D2D] hover:bg-[#154734]/10 hover:translate-x-1",
              ].join(" ")}
            >
              <span className="slad-menuIcon w-5 flex justify-center">
                <Icon className="w-4 h-4" />
              </span>
              <span className="slad-menuLabel">{label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}

export default SidebarMenu;
