import React, { useState } from "react";
import { Link } from "react-router-dom";
import logoEIL from "../assets/img/LogoEILTP.png";

function HomeNavbar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="slhp-nav fixed w-full top-0 bg-[#F4F6F5]/95 backdrop-blur-md border-b border-[#A3D9A5]/60 z-50 slhp-animFadeDown">
        <nav className="container mx-auto flex items-center justify-between px-6 md:px-10 lg:px-20 py-4">
          <Link
            to="/"
            className="flex items-center gap-2 font-extrabold text-[#154734] text-lg"
          >
            <img src={logoEIL} alt="Spatial Lens" className="w-12 h-12" />
            Spatial Lens
          </Link>

          <div className="hidden md:flex gap-10 text-sm font-medium text-[#2D2D2D]/80">
            <Link to="/map" className="slhp-navLink">
              Map Panel
            </Link>
            <Link to="/about" className="slhp-navLink">
              About
            </Link>
            <Link to="/contact" className="slhp-navLink">
              Contact
            </Link>
          </div>

          <button
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg border border-[#A3D9A5]/80 bg-white text-[#154734] shadow-sm"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle navigation"
            aria-expanded={open}
          >
            <span className="sr-only">Toggle menu</span>
            <div className="flex flex-col gap-1.5">
              <span
                className={`block h-0.5 w-6 bg-current transition-transform ${
                  open ? "translate-y-1.5 rotate-45" : ""
                }`}
              />
              <span
                className={`block h-0.5 w-6 bg-current transition-opacity ${
                  open ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`block h-0.5 w-6 bg-current transition-transform ${
                  open ? "-translate-y-1.5 -rotate-45" : ""
                }`}
              />
            </div>
          </button>
        </nav>
      </header>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-200 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        } bg-black/30`}
        onClick={() => setOpen(false)}
      />
      <aside
        className={`fixed top-0 right-0 h-full w-72 max-w-[78%] bg-white shadow-2xl border-l border-[#A3D9A5]/70 z-50 transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!open}
      >
        <div className="p-5 flex items-center justify-between border-b border-[#A3D9A5]/50">
          <div className="flex items-center gap-2 font-extrabold text-[#154734]">
            <img src={logoEIL} alt="Spatial Lens" className="w-10 h-10" />
            Spatial Lens
          </div>
          <button
            className="w-9 h-9 flex items-center justify-center rounded-md bg-[#154734] text-white"
            onClick={() => setOpen(false)}
            aria-label="Close menu"
          >
            ×
          </button>
        </div>
        <div className="flex flex-col p-5 gap-4 text-sm font-semibold text-[#154734]">
          <Link to="/map" className="hover:text-[#103827]" onClick={() => setOpen(false)}>
            Map Panel
          </Link>
          <Link to="/about" className="hover:text-[#103827]" onClick={() => setOpen(false)}>
            About
          </Link>
          <Link to="/contact" className="hover:text-[#103827]" onClick={() => setOpen(false)}>
            Contact
          </Link>
        </div>
      </aside>
    </>
  );
}

export default HomeNavbar;
