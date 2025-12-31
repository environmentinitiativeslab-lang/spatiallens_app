import React from "react";
import { Link } from "react-router-dom";
import HomeNavbar from "../Components/HomeNavbar";
import HomeFooter from "../Components/HomeFooter";
import "../Style/AboutUs.css";

const stats = [
  { label: "Years in applied research", value: "7+" },
  { label: "Public sector partners", value: "20+" },
  { label: "Cities & provinces mapped", value: "38" },
  { label: "Training cohorts", value: "40+" },
];

const focusAreas = [
  {
    title: "Spatial Consulting",
    desc: "End-to-end GIS advisory for zoning, infrastructure, and environmental planning.",
  },
  {
    title: "Data & Platform",
    desc: "Clean pipelines, metadata discipline, and map experiences that stay reliable over time.",
  },
  {
    title: "Policy Research",
    desc: "Evidence-backed studies that connect spatial data with policy narratives.",
  },
  {
    title: "Training & Enablement",
    desc: "Workshops that level up teams on geospatial analysis, storytelling, and stewardship.",
  },
];

const principles = [
  {
    title: "Clarity first",
    desc: "We translate complex layers into concise stories so decision makers act with confidence.",
  },
  {
    title: "Responsible mapping",
    desc: "We treat spatial data ethically, with transparent sources, metadata, and governance.",
  },
  {
    title: "Co-creation",
    desc: "We design with agencies, researchers, and communities - never in isolation.",
  },
];

const timeline = [
  {
    year: "2018",
    title: "Founded Environment Initiatives Lab",
    detail:
      "Started as a research collective focused on climate and urban studies.",
  },
  {
    year: "2020",
    title: "Training practice launched",
    detail:
      "Delivered hands-on GIS workshops for government and academic partners.",
  },
  {
    year: "2023",
    title: "Spatial Lens platform",
    detail:
      "Built a calm, public-first map interface with metadata-rich layers.",
  },
  {
    year: "2025",
    title: "Regional collaborations",
    detail:
      "Supporting Southeast Asia projects with shared standards and open dialogue.",
  },
];

const teamMembers = [
  {
    name: "Michael Andhika",
    role: "Founder & Lead Planner",
    focus: "Urban systems, policy translation, facilitation",
    location: "Jakarta",
    accent: "#154734",
    photo: null,
  },
  {
    name: "Maya Santoso",
    role: "GIS Specialist",
    focus: "Spatial analysis, remote sensing, data pipelines",
    location: "Bandung",
    accent: "#0F6B42",
    photo: null,
  },
  {
    name: "Tara Ling",
    role: "Design & Storytelling",
    focus: "Map UX, visual systems, data narratives",
    location: "Taipei",
    accent: "#1E7F73",
    photo: null,
  },
  {
    name: "Rafi Pradana",
    role: "Training Lead",
    focus: "Workshops, curriculum, capability building",
    location: "Yogyakarta",
    accent: "#2F5DA6",
    photo: null,
  },
];

function initialsFromName(name) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function AboutUs() {
  return (
    <div className="about-root">
      <HomeNavbar />

      <main className="about-main">
        {/* HERO (SUPER CLEAN, NO CARDS) */}
        <section className="about-hero about-hero--clean">
          <div className="about-heroCleanBg" aria-hidden="true" />

          {/* margins konsisten dengan section lain */}
          <div className="container mx-auto px-6 md:px-10 lg:px-20 relative z-10">
            <div className="about-heroOneCol">
              <div className="about-heroCleanKicker">
                <p className="about-kicker">About Spatial Lens</p>
                <span className="about-heroCleanChip">
                  Environment Initiatives Lab
                </span>
              </div>

              <h1 className="about-title">Calm public maps, built to last.</h1>

              <p className="about-lead about-heroLead">
                We blend research, policy, and UX to ship geospatial tools with
                clear sources, metadata discipline, and a handover plan teams
                can sustain.
              </p>

              <ul className="about-heroHighlights">
                <li>Public-first GIS with readable legends</li>
                <li>Metadata & sources documented by default</li>
                <li>Stewardship handover: training + governance</li>
              </ul>

              <div className="about-ctaRow about-ctaRow--tight">
                <Link to="/contact" className="slhp-btnPrimary">
                  Contact us
                </Link>
                <Link to="/map" className="slhp-btnOutline">
                  View map panel
                </Link>
              </div>

              <div className="about-heroCleanStats">
                {stats.map((item) => (
                  <div key={item.label} className="about-heroCleanStat">
                    <div className="about-heroCleanStat__value">
                      {item.value}
                    </div>
                    <div className="about-heroCleanStat__label">
                      {item.label}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Focus Areas */}
        <section className="about-section">
          <div className="container mx-auto px-6 md:px-10 lg:px-20">
            <div className="about-sectionHeader">
              <p className="about-kicker">What we deliver</p>
              <h2 className="about-heading">Focus areas</h2>
              <p className="about-body">
                We solve spatial challenges - from unlocking datasets to
                guiding policies - while keeping clarity and accountability at
                the center.
              </p>
            </div>

            <div className="about-tiles">
              {focusAreas.map((item) => (
                <div key={item.title} className="about-tile">
                  <h3 className="about-tile__title">{item.title}</h3>
                  <p className="about-tile__desc">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="about-section about-team about-team--feature">
          <div className="container mx-auto px-6 md:px-10 lg:px-20">
            <div className="about-sectionHeader">
              <p className="about-kicker">People</p>
              <h2 className="about-heading">Faces behind Spatial Lens</h2>
              <p className="about-body">
                A small, hands-on team. We keep people front and center, so you
                know who is designing, building, and guiding each map.
              </p>
            </div>

            <div className="about-teamGrid about-teamGrid--feature">
              {teamMembers.map((member) => (
                <div
                  key={member.name}
                  className="about-teamCard about-teamCard--feature"
                  style={{ "--accent": member.accent || "#154734" }}
                >
                  <div
                    className="about-portrait about-portrait--feature"
                    aria-hidden="true"
                    style={
                      member.photo
                        ? {
                            backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.4)), url(${member.photo})`,
                            backgroundColor: member.accent,
                          }
                        : { backgroundColor: member.accent }
                    }
                  >
                    {!member.photo && (
                      <span className="about-portrait__initials about-portrait__initials--feature">
                        {initialsFromName(member.name)}
                      </span>
                    )}
                  </div>

                  <div className="about-teamMeta about-teamMeta--feature">
                    <h3 className="about-teamName">{member.name}</h3>
                    <p className="about-teamRole">{member.role}</p>
                    <p className="about-teamFocus">{member.focus}</p>
                    <p className="about-teamLocation">{member.location}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Principles */}
        <section className="about-section about-section--alt">
          <div className="container mx-auto px-6 md:px-10 lg:px-20 grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            <div className="lg:col-span-5">
              <div className="about-card">
                <p className="about-kicker">How we work</p>
                <h2 className="about-heading">
                  Principles that guide every map
                </h2>
                <p className="about-body">
                  Each project follows a transparent, documented process so
                  stakeholders can trust the outputs and steward them forward.
                </p>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="about-principles">
                {principles.map((item) => (
                  <div key={item.title} className="about-principle">
                    <h3 className="about-principle__title">{item.title}</h3>
                    <p className="about-principle__desc">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="about-section">
          <div className="container mx-auto px-6 md:px-10 lg:px-20">
            <div className="about-sectionHeader">
              <p className="about-kicker">Milestones</p>
              <h2 className="about-heading">A steady arc of spatial work</h2>
              <p className="about-body">
                We keep expanding with partners who value open dialogue and
                strong documentation.
              </p>
            </div>

            <div className="about-timeline">
              {timeline.map((item) => (
                <div key={item.year} className="about-timeline__item">
                  <div className="about-timeline__year">{item.year}</div>
                  <div className="about-timeline__content">
                    <h3 className="about-timeline__title">{item.title}</h3>
                    <p className="about-timeline__desc">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="about-cta">
          <div className="container mx-auto px-6 md:px-10 lg:px-20 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <p className="about-kicker text-white/80">
                Let&apos;s collaborate
              </p>
              <h3 className="about-cta__title text-white">
                Ready to map your next decision?
              </h3>
              <p className="about-cta__desc text-white/80">
                Tell us about your spatial challenge - policy, infrastructure,
                environment, or training. We will design a path and a map that
                people can trust.
              </p>
            </div>

            <div className="flex gap-3">
              <Link to="/contact" className="slhp-btnPrimary about-cta__btn">
                Contact us
              </Link>
              <Link to="/map" className="slhp-btnOutline about-cta__btn">
                View map panel
              </Link>
            </div>
          </div>
        </section>
      </main>

      <HomeFooter />
    </div>
  );
}

export default AboutUs;
