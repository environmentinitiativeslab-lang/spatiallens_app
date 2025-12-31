import React from "react";
import { Link } from "react-router-dom";
import { Mail, MapPin, Clock, MessageSquare } from "lucide-react";
import HomeNavbar from "../Components/HomeNavbar";
import HomeFooter from "../Components/HomeFooter";
import "../Style/Contact.css";

const highlightNotes = [
  "Replies within 1-2 business days",
  "Jakarta-led team collaborating across Southeast Asia",
  "Metadata-first, public-friendly map experiences",
];

const contactChannels = [
  {
    label: "Email",
    value: "environmentinitiativeslab@gmail.com",
    href: "mailto:environmentinitiativeslab@gmail.com",
    icon: Mail,
  },
  {
    label: "Working hours",
    value: "Mon–Fri, Jakarta time (GMT+7)",
    href: null,
    icon: Clock,
  },
  {
    label: "Where we collaborate",
    value: "Jakarta | Bandung | Taipei | across Southeast Asia",
    href: null,
    icon: MapPin,
  },
  {
    label: "Project intake",
    value: "Share context, data sources, and the decision you need to inform.",
    href: null,
    icon: MessageSquare,
  },
];

const services = [
  "Spatial consulting for policy, environment, and infrastructure",
  "Metadata discipline, data pipelines, and governance",
  "Public-friendly map UX and storytelling",
  "Training and team enablement for GIS practitioners",
];

const steps = [
  {
    title: "Send context",
    desc: "Tell us the decision you are informing, the audiences involved, and the datasets in play.",
  },
  {
    title: "Clarify scope",
    desc: "We set a 30-minute call to align on outcomes, access, and timelines.",
  },
  {
    title: "Proposal & start",
    desc: "Receive a concise plan with deliverables, then we move into delivery with you.",
  },
];

function Contact() {
  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    const name = (formData.get("name") || "").trim() || "New contact";
    const email = (formData.get("email") || "").trim() || "-";
    const organization = (formData.get("organization") || "").trim() || "-";
    const focus = (formData.get("focus") || "").trim() || "-";
    const details = (formData.get("details") || "").trim() || "-";

    const subject = `Spatial Lens contact - ${name}`;
    const body = `Name: ${name}\nEmail: ${email}\nOrganization: ${organization}\nProject focus: ${focus}\n\nDetails:\n${details}`;

    const mailto = `mailto:environmentinitiativeslab@gmail.com?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`;

    window.location.href = mailto;
  };

  return (
    <div className="contact-root">
      <HomeNavbar />

      <main className="contact-main">
        <section className="contact-hero">
          <div className="contact-heroBg" aria-hidden="true" />

          <div className="container mx-auto px-6 md:px-10 lg:px-20">
            <div className="contact-heroContent">
              <div className="contact-heroText">
                <p className="contact-kicker">Contact</p>

                <h1 className="contact-title">
                  Plan your next map with Spatial Lens
                </h1>

                <p className="contact-lead">
                  We support spatial work that needs calm interfaces, clear
                  metadata, and reliable handovers. Share a few lines about your
                  project, and we will route you to the right person.
                </p>

                <div className="contact-badges">
                  {highlightNotes.map((note) => (
                    <span key={note} className="contact-badge">
                      {note}
                    </span>
                  ))}
                </div>

                <div className="contact-heroMeta">
                  {contactChannels.slice(0, 2).map((item) => (
                    <div key={item.label} className="contact-heroMetaItem">
                      <p className="contact-heroMetaLabel">{item.label}</p>
                      <p className="contact-heroMetaValue">{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="contact-heroPanel">
                <div className="contact-panelHeader">
                  <p className="contact-panelTitle">Direct lines</p>
                  <p className="contact-panelDesc">
                    Tell us about your datasets, audience, and timelines. We
                    respond with a focused next step.
                  </p>
                </div>

                <ul className="contact-channelList">
                  {contactChannels.map((channel) => {
                    const Icon = channel.icon;

                    return (
                      <li key={channel.label} className="contact-channelItem">
                        <span
                          className="contact-channelIcon"
                          aria-hidden="true"
                        >
                          <Icon size={18} />
                        </span>

                        <div className="contact-channelText">
                          <p className="contact-channelLabel">
                            {channel.label}
                          </p>

                          {channel.href ? (
                            <a
                              href={channel.href}
                              className="contact-channelLink"
                            >
                              {channel.value}
                            </a>
                          ) : (
                            <p className="contact-channelValue">
                              {channel.value}
                            </p>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <div className="contact-panelFooter">
                  <a
                    href="#contact-form"
                    className="slhp-btnPrimary contact-panelBtn"
                  >
                    Start a message
                  </a>
                  <Link
                    to="/map"
                    className="slhp-btnOutline contact-panelBtn contact-panelBtn--ghost"
                  >
                    View map panel
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="contact-form" className="contact-section">
          <div className="container mx-auto px-6 md:px-10 lg:px-20 grid lg:grid-cols-3 gap-8 lg:gap-10">
            <div className="lg:col-span-2 contact-card contact-card--form">
              <div className="contact-cardHeader">
                <p className="contact-kicker">Message us</p>
                <h2 className="contact-heading">
                  What do you need help mapping?
                </h2>
                <p className="contact-body">
                  Share key details so we can pair you with the right people:
                  spatial scope, data sources, target audiences, and the
                  decision you need to inform.
                </p>
              </div>

              <form className="contact-form" onSubmit={handleSubmit}>
                <div className="contact-gridTwo">
                  <label className="contact-field">
                    <span className="contact-fieldLabel">Name</span>
                    <input
                      type="text"
                      name="name"
                      className="contact-input"
                      placeholder="Your name"
                      autoComplete="name"
                      required
                    />
                  </label>

                  <label className="contact-field">
                    <span className="contact-fieldLabel">Email</span>
                    <input
                      type="email"
                      name="email"
                      className="contact-input"
                      placeholder="you@example.com"
                      autoComplete="email"
                      required
                    />
                  </label>
                </div>

                <div className="contact-gridTwo">
                  <label className="contact-field">
                    <span className="contact-fieldLabel">Organization</span>
                    <input
                      type="text"
                      name="organization"
                      className="contact-input"
                      placeholder="Agency, university, or company"
                      autoComplete="organization"
                    />
                  </label>

                  <label className="contact-field">
                    <span className="contact-fieldLabel">Project focus</span>
                    <input
                      type="text"
                      name="focus"
                      className="contact-input"
                      placeholder="Policy, environment, infrastructure, or training"
                    />
                  </label>
                </div>

                <label className="contact-field">
                  <span className="contact-fieldLabel">
                    What should we know?
                  </span>
                  <textarea
                    name="details"
                    rows="5"
                    className="contact-input contact-textarea"
                    placeholder="Datasets, locations, timelines, and outcomes you want the map to support."
                    required
                  />
                </label>

                <div className="contact-submit">
                  <button
                    type="submit"
                    className="slhp-btnPrimary contact-submitBtn"
                  >
                    Send message
                  </button>
                  <p className="contact-muted">
                    We keep shared datasets and context confidential.
                  </p>
                </div>
              </form>
            </div>

            <div className="contact-aside space-y-4">
              <div className="contact-card">
                <h3 className="contact-cardTitle">Where we help</h3>
                <p className="contact-body">
                  Pick a focus area or tell us more about your spatial
                  challenge.
                </p>

                <div className="contact-chips">
                  {services.map((item) => (
                    <span key={item} className="contact-chip">
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="contact-card">
                <h3 className="contact-cardTitle">How we respond</h3>
                <div className="contact-steps">
                  {steps.map((step, idx) => (
                    <div key={step.title} className="contact-step">
                      <div className="contact-stepNum">{idx + 1}</div>
                      <div className="contact-stepCopy">
                        <p className="contact-stepTitle">{step.title}</p>
                        <p className="contact-stepDesc">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="contact-card contact-card--soft">
                <h3 className="contact-cardTitle">Prefer email?</h3>
                <p className="contact-body">
                  Drop a note with a link to your data room or map, and we will
                  reply with a next step.
                </p>
                <a
                  href="mailto:environmentinitiativeslab@gmail.com"
                  className="contact-mailLink"
                >
                  environmentinitiativeslab@gmail.com
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <HomeFooter />
    </div>
  );
}

export default Contact;
