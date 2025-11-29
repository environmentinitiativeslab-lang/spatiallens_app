import React from "react";
import { Link } from "react-router-dom";
import { Layers, Radio, Compass } from "lucide-react";
import logoEIL from "../assets/img/LogoEILTP.png";
import "../Style/HomePage.css";
import heroVideo from "../assets/video/Video_Highlight.mp4";

function HomePage() {
  return (
    <div className="slhp-root font-sans text-[#2D2D2D] bg-[#F4F6F5] overflow-x-hidden">
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
            <a href="#how" className="slhp-navLink">
              How It Works
            </a>
            <a href="#features" className="slhp-navLink">
              Features
            </a>
            <a href="#about" className="slhp-navLink">
              About
            </a>
            <a href="#contact" className="slhp-navLink">
              Contact
            </a>
          </div>
          <a href="#demo" className="slhp-btnPrimary text-sm px-5 py-2">
            Try Demo
          </a>
        </nav>
      </header>

      <section id="home" className="relative w-full overflow-hidden">
        <div className="slhp-heroMask" />
        <div className="slhp-heroVideo">
          <video
            src={heroVideo}
            autoPlay
            muted
            loop
            playsInline
            className="slhp-heroVideo__media"
          />
          <div className="slhp-heroVideo__overlay" />
        </div>

        <div className="container mx-auto px-20 pt-28 pb-20 grid md:grid-cols-2 gap-16 items-center relative z-10">
          <div className="slhp-heroPanel space-y-6 slhp-animSlideUp">
            <h1 className="slhp-heroTitle">
              Mapping Connections
              <br />
              Across the Living World
            </h1>
            <p className="text-white/80 text-lg max-w-md drop-shadow">
              Experience spatial harmony with global clarity — Spatial Lens
              helps you see data as flowing stories across continents.
            </p>
            <div className="flex gap-4 mt-4">
              <a href="#demo" className="slhp-btnPrimary">
                Try Demo
              </a>
              <a href="#docs" className="slhp-btnOutline">
                Learn More
              </a>
            </div>
          </div>

          <div className="slhp-heroGlobe slhp-animScaleIn" aria-hidden="true">
            <div className="slhp-worldMap" />
            <div className="slhp-path slhp-path1" />
            <div className="slhp-path slhp-path2" />
            <div className="slhp-path slhp-path3" />
            <div className="slhp-pin slhp-pin1" />
            <div className="slhp-pin slhp-pin2" />
            <div className="slhp-pin slhp-pin3" />
          </div>
        </div>
      </section>

      <section
        id="how"
        className="py-20 bg-white border-t border-[#A3D9A5]/60 slhp-animFadeIn"
      >
        <div className="container mx-auto px-20 text-center">
          <h2 className="text-3xl font-bold mb-10 text-[#2D2D2D]">
            How It Works
          </h2>
          <div className="grid md:grid-cols-3 gap-14">
            <Step
              num="01"
              title="Import"
              desc="Upload or stream spatial data with minimal setup."
            />
            <Step
              num="02"
              title="Analyze"
              desc="Detect patterns and visualize live connections."
            />
            <Step
              num="03"
              title="Publish"
              desc="Share your map stories with one click."
            />
          </div>
        </div>
      </section>

      <section id="features" className="py-20 bg-[#F4F6F5] slhp-animFadeIn">
        <div className="container mx-auto px-20 text-center">
          <h2 className="text-3xl font-bold mb-3 text-[#2D2D2D]">
            Designed for Modern Mapmakers
          </h2>
          <p className="text-[#2D2D2D]/70 mb-12 max-w-2xl mx-auto">
            Built for performance, clarity, and calm design — every feature
            enhances your spatial storytelling.
          </p>
          <div className="grid md:grid-cols-3 gap-14">
            <Feature
              icon={<Layers />}
              title="Layer Control"
              desc="Organize your map with precision and clarity."
            />
            <Feature
              icon={<Radio />}
              title="Live Data Feeds"
              desc="Stream real-time spatial data seamlessly."
            />
            <Feature
              icon={<Compass />}
              title="Smart Navigation"
              desc="Explore large datasets with ease and fluidity."
            />
          </div>
        </div>
      </section>

      <section
        id="about"
        className="py-20 bg-white border-t border-[#A3D9A5]/60 slhp-animFadeIn"
      >
        <div className="container mx-auto px-20 grid md:grid-cols-2 gap-20 items-center">
          <div className="slhp-geogrid slhp-animScaleIn" aria-hidden="true">
            <div className="slhp-aboutGrid" />
            <div className="slhp-aboutFlow" />
            <div className="slhp-aboutDot slhp-aboutDot1" />
            <div className="slhp-aboutDot slhp-aboutDot2" />
          </div>
          <div className="space-y-5 slhp-animSlideUp">
            <h2 className="text-3xl font-bold text-[#2D2D2D]">
              Mapping that Feels Alive
            </h2>
            <p className="text-[#2D2D2D]/70 leading-relaxed">
              Spatial Lens brings clarity to data through smooth interactions,
              calm color schemes, and intelligent layer management — inspired by
              the movement of Earth itself.
            </p>
            <a href="#contact" className="slhp-btnPrimary inline-block">
              Contact Us
            </a>
          </div>
        </div>
      </section>

      <footer
        id="contact"
        className="slhp-footer bg-[#E7EFE9]/50 border-t border-[#A3D9A5]/60 pt-16 pb-10 slhp-animFadeIn"
      >
        <div className="container mx-auto px-20 grid md:grid-cols-12 gap-12">
          <div className="md:col-span-3 space-y-3">
            <h3 className="text-xl font-bold text-[#154734]">Spatial Lens</h3>
            <p className="text-sm text-[#2D2D2D]/70">
              Calm meets clarity — mapping tools that bring balance to modern
              GIS design.
            </p>
          </div>
          <FooterCol
            title="Explore"
            items={["Features", "Demo", "How It Works"]}
          />
          <FooterCol title="Resources" items={["Docs", "API", "Guides"]} />
          <FooterCol title="Company" items={["About", "Careers", "Support"]} />
          <div className="md:col-span-3">
            <h4 className="slhp-footerTitle">Connect</h4>
            <p className="text-sm text-[#2D2D2D]/70 mb-2">
              hello@spatiallens.io
            </p>
            <div className="flex gap-3">
              <SocialIcon name="Twitter" />
              <SocialIcon name="LinkedIn" />
              <SocialIcon name="GitHub" />
            </div>
          </div>
        </div>
        <div className="text-center text-xs text-[#2D2D2D]/60 mt-8 border-t border-[#A3D9A5]/50 pt-5">
          © {new Date().getFullYear()} Spatial Lens. All rights reserved.
        </div>
      </footer>
    </div>
  );
}

function Step({ num, title, desc }) {
  return (
    <div className="slhp-stepCard slhp-animSlideUp">
      <div className="slhp-stepNum">{num}</div>
      <h3 className="text-base font-semibold text-[#154734] mt-2">{title}</h3>
      <p className="text-[#2D2D2D]/70 text-sm mt-1">{desc}</p>
    </div>
  );
}

function Feature({ icon, title, desc }) {
  return (
    <div className="slhp-featureCard slhp-animFadeIn">
      <div className="text-[#154734] mb-3 flex justify-center">{icon}</div>
      <h3 className="text-base font-semibold text-[#154734]">{title}</h3>
      <p className="text-[#2D2D2D]/70 mt-2 text-sm">{desc}</p>
    </div>
  );
}

function FooterCol({ title, items }) {
  return (
    <div className="md:col-span-2">
      <h4 className="slhp-footerTitle">{title}</h4>
      <ul className="slhp-footerLinks">
        {items.map((item) => (
          <li key={item}>
            <a href="#">{item}</a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialIcon({ name }) {
  return <div className="slhp-socialIcon">{name[0]}</div>;
}

export default HomePage;
