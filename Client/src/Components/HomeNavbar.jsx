import React from "react";
import { Link } from "react-router-dom";
import logoEIL from "../assets/img/LogoEILTP.png";

function HomeNavbar() {
  return (
    <header className="slhp-nav fixed w-full top-0 bg-[#F4F6F5]/95 backdrop-blur-md border-b border-[#A3D9A5]/60 z-50 slhp-animFadeDown">
      <nav className="container mx-auto flex items-center justify-between px-20 py-4">
        <a
          href="#home"
          className="flex items-center gap-2 font-extrabold text-[#154734] text-lg"
        >
          <img src={logoEIL} alt="Spatial Lens" className="w-12 h-12" />
          Spatial Lens
        </a>
        <div className="hidden md:flex gap-10 text-sm font-medium text-[#2D2D2D]/80">
          <Link to="/map" className="slhp-navLink">
            Map Panel
          </Link>
          <a href="#about" className="slhp-navLink">
            About
          </a>
          <a href="#contact" className="slhp-navLink">
            Contact
          </a>
        </div>
        {/* <a href="#demo" className="slhp-btnPrimary text-sm px-5 py-2">
          Try Demo
        </a> */}
      </nav>
    </header>
  );
}

export default HomeNavbar;
