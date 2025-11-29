import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";

import SidebarMenu from "../Components/SidebarMenu";
import DataLayersTab from "../Components/Tabs/DataLayersTab";
import AccessTab from "../Components/Tabs/AccessTab";
import MetadataTab from "../Components/Tabs/MetadataTab";
import StylingTab from "../Components/Tabs/StylingTab";
import IntegrationTab from "../Components/Tabs/IntegrationTab";
import ApiServicesTab from "../Components/Tabs/ApiServicesTab";
import StatisticsTab from "../Components/Tabs/StatisticsTab";
import "../Style/AdminDashboard.css";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("layers");
  const [showLogout, setShowLogout] = useState(false);
  const navigate = useNavigate();

  const title =
    activeTab === "layers"
      ? "Data Layers"
      : activeTab === "metadata"
      ? "Metadata"
      : activeTab === "styling"
      ? "Styling"
      : activeTab === "access"
      ? "Access Control"
      : activeTab === "integration"
      ? "Integration"
      : activeTab === "api"
      ? "API Services"
      : activeTab === "stats"
      ? "Statistics"
      : "Dashboard";

  const doLogout = () => {
    try {
      Object.keys(localStorage).forEach(
        (k) => k.startsWith("sl:") && localStorage.removeItem(k)
      );
    } catch {}
    // keluar penuh tanpa bisa back
    window.location.replace("/admin/auth");
  };

  const renderContent = () => {
    switch (activeTab) {
      case "layers":
        return <DataLayersTab />;
      case "metadata":
        return <MetadataTab />;
      case "styling":
        return <StylingTab />;
      case "access":
        return <AccessTab />;
      case "integration":
        return <IntegrationTab />;
      case "api":
        return <ApiServicesTab />;
      case "stats":
        return <StatisticsTab />;
      default:
        return (
          <div className="slad-empty text-center text-gray-500 mt-10">
            Select a section from the sidebar.
          </div>
        );
    }
  };

  return (
    <div className="slad-root flex h-screen overflow-hidden bg-[#F4F6F5] text-[#2D2D2D] font-inter">
      <SidebarMenu activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="slad-main flex-1 flex flex-col relative">
        <header className="slad-header flex items-center justify-between bg-white/90 backdrop-blur-md border-b border-[#A3D9A5]/40 px-10 py-5 sticky top-0 z-10 shadow-sm">
          <h2 className="slad-title text-[1.35rem] font-extrabold text-[#154734]">
            {title}
          </h2>

          <button
            className="slad-logoutBtn"
            onClick={() => setShowLogout(true)}
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </header>

        <section className="slad-content flex-1 overflow-y-auto p-9 slad-animFadeIn">
          {renderContent()}
        </section>
      </main>

      {/* Modal Logout — inline, tanpa file terpisah */}
      {showLogout && (
        <div
          className="fixed inset-0 z-[10000] bg-black/50 backdrop-blur-[2px] flex items-center justify-center animate-[slFade_.18s_ease-out]"
          onClick={() => setShowLogout(false)}
        >
          <div
            className="w-[92vw] max-w-[440px] bg-white border border-[#A3D9A5] rounded-2xl shadow-2xl p-6 relative animate-[slPop_.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#A3D9A5] to-[#7CCB8F] text-white grid place-items-center shadow-md">
              <LogOut className="w-5 h-5" />
            </div>
            <h3 className="mt-3 text-[#154734] font-extrabold text-lg">
              Log out?
            </h3>
            <p className="mt-1 text-[14px] text-[#334155]">
              Anda akan keluar dari Admin Dashboard. Anda bisa masuk kembali
              kapan saja.
            </p>

            <div className="mt-5 flex justify-end gap-2">
              <button
                className="border border-gray-200 rounded-xl px-4 py-2 text-[14px] font-semibold hover:bg-[#F4F6F5]"
                onClick={() => setShowLogout(false)}
              >
                Batal
              </button>
              <button
                className="border border-[#154734] bg-[#154734] text-white rounded-xl px-4 py-2 text-[14px] font-bold hover:brightness-105"
                onClick={doLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* keyframes kecil untuk animasi */}
      <style>{`
        @keyframes slFade{from{opacity:0}to{opacity:1}}
        @keyframes slPop{from{opacity:0;transform:translateY(6px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
      `}</style>
    </div>
  );
}
