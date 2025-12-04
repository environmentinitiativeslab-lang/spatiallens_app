import React from "react";
import { Layers, Radio, Compass } from "lucide-react";
import "../Style/HomePage.css";
import heroVideo from "../assets/video/Video_Highlight.mp4";
import HomeNavbar from "../Components/HomeNavbar";
import HomeFooter from "../Components/HomeFooter";
import collabImg14 from "../assets/img/14.jpg";
import collabImg15 from "../assets/img/15.png";
import collabImg16 from "../assets/img/16.png";
import collabImg1 from "../assets/img/1.png";
import collabImg2 from "../assets/img/2.png";
import collabImg3 from "../assets/img/3.png";
import collabImg4 from "../assets/img/4.png";
import collabImg5 from "../assets/img/5.png";
import collabImg6 from "../assets/img/6.png";
import collabImg7 from "../assets/img/7.png";

function HomePage() {
  return (
    <div className="slhp-root font-sans text-[#2D2D2D] bg-[#F4F6F5] overflow-x-hidden">
      <HomeNavbar />

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
              <a href="/map" className="slhp-btnPrimary">
                Map Panel
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

      <section id="collab" className="slhp-collab slhp-animFadeIn">
        <div className="container mx-auto px-20 py-16">
          <div className="text-center mb-10 space-y-2">
            <h2 className="slhp-collabTitle">Environment Initiatives Lab</h2>
            <p className="slhp-collabLead">
              We focus on geospatial work: consulting, research, and training —
              all aimed at making spatial data clear and actionable.
            </p>
          </div>

          <div className="slhp-collabGrid">
            {[
              {
                title: "Consulting",
                desc: "Spatial data procurement for zoning, industry, and infrastructure decisions.",
                img: collabImg14,
              },
              {
                title: "Research",
                desc: "Analytical studies and conference-grade insights to support policy and planning.",
                img: collabImg16,
              },
              {
                title: "Training",
                desc: "Hands-on mapping training for technical teams and government partners.",
                img: collabImg15,
              },
            ].map((item) => (
              <div key={item.title} className="slhp-collabCard">
                <div
                  className="slhp-collabThumb"
                  aria-hidden="true"
                  style={
                    item.img
                      ? {
                          backgroundImage: `linear-gradient(135deg, rgba(255,255,255,0.15), rgba(0,0,0,0.15)), url(${item.img})`,
                        }
                      : undefined
                  }
                />
                <h3 className="slhp-collabCardTitle">{item.title}</h3>
                <p className="slhp-collabCardDesc">{item.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 text-center">
            <p className="uppercase text-sm font-semibold tracking-wide text-[#154734]/80 mb-4">
              Partners
            </p>

            <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6 lg:gap-8 justify-center">
              {[
                { name: "Kementerian Lingkungan Hidup", logo: collabImg6 },
                { name: "Kementerian PPN/Bappenas", logo: collabImg2 },
                { name: "Kementerian Perindustrian", logo: collabImg3 },
                {
                  name: "Kementerian Agraria dan Tata Ruang/BPN",
                  logo: collabImg4,
                },
                { name: "National Taipei University", logo: collabImg5 },
                {
                  name: "National Taiwan Normal University",
                  logo: collabImg1,
                },
                {
                  name: "Young Urbanists of Southeast Asia",
                  logo: collabImg7,
                },
              ].map((item) => (
                <div
                  key={item.name}
                  className="slhp-partnerBadge slhp-partnerBadge--light flex flex-col items-center text-center"
                >
                  <img
                    src={item.logo}
                    alt={item.name}
                    className="slhp-partnerLogo mb-2"
                  />
                  <span className="leading-tight">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="py-20 bg-[#F4F6F5] slhp-animFadeIn">
        <div className="container mx-auto px-20 text-center">
          <h2 className="text-3xl font-bold mb-3 text-[#2D2D2D]">
            Designed for Public Map Visitors
          </h2>
          <p className="text-[#2D2D2D]/70 mb-12 max-w-2xl mx-auto">
            Built so the public can easily explore layers, attributes, legends,
            and metadata in a calm, informative interface.
          </p>
          <div className="grid md:grid-cols-3 gap-14">
            <Feature
              icon={<Layers />}
              title="View Layers"
              desc="Public visitors can turn layers on/off and view legends clearly."
            />
            <Feature
              icon={<Radio />}
              title="Attributes & Details"
              desc="Click a feature to read attributes and relevant metadata."
            />
            <Feature
              icon={<Compass />}
              title="Metadata at a Glance"
              desc="Per-layer metadata is available so context stays clear."
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
              Mapping that Serves Everyone
            </h2>
            <p className="text-[#2D2D2D]/70 leading-relaxed">
              Spatial Lens delivers clear maps: the public can view data,
              attributes, legends, and metadata effortlessly, while content
              stays well managed.
            </p>
            <a href="#contact" className="slhp-btnPrimary inline-block">
              Contact Us
            </a>
          </div>
        </div>
      </section>

      <HomeFooter />
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

export default HomePage;
