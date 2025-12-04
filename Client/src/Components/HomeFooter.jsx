import React from "react";

function HomeFooter() {
  return (
    <footer
      id="contact"
      className="slhp-footer bg-[#E7EFE9]/50 border-t border-[#A3D9A5]/60 pt-16 pb-10 slhp-animFadeIn"
    >
      <div className="container mx-auto px-20 grid md:grid-cols-12 gap-12">
        <div className="md:col-span-4 space-y-3">
          <h3 className="text-xl font-bold text-[#154734]">Spatial Lens</h3>
          <p className="text-sm text-[#2D2D2D]/70">
            Calm meets clarity — mapping tools that bring balance to modern GIS design.
          </p>
        </div>
        <div className="md:col-span-3">
          <h4 className="slhp-footerTitle">Company</h4>
          <ul className="slhp-footerLinks">
            <li>
              <a href="#about">About</a>
            </li>
          </ul>
        </div>
        <div className="md:col-span-3">
          <h4 className="slhp-footerTitle">Connect</h4>
          <p className="text-sm text-[#2D2D2D]/70 mb-2">
            environmentinitiativeslab@gmail.com
          </p>
          <div className="flex gap-3">
            <SocialIcon name="Email" href="mailto:environmentinitiativeslab@gmail.com" />
            <SocialIcon name="LinkedIn" href="" />
          </div>
        </div>
      </div>
      <div className="text-center text-xs text-[#2D2D2D]/60 mt-8 border-t border-[#A3D9A5]/50 pt-5">
        © {new Date().getFullYear()} Spatial Lens. All rights reserved.
      </div>
    </footer>
  );
}

function SocialIcon({ name, href }) {
  const initials = name === "Email" ? "@" : "in";
  return (
    <a
      href={href || "#"}
      className="slhp-socialIcon"
      aria-label={name}
      target={href ? "_blank" : undefined}
      rel={href ? "noreferrer" : undefined}
    >
      {initials}
    </a>
  );
}

export default HomeFooter;
