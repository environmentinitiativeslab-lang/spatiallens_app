// src/Page/AdminAuth.jsx
import React, { useMemo, useState } from "react";
import { LogIn, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { API_BASE } from "../config";
import "../Style/AdminAuth.css";

const initial = { email: "", password: "" };

export default function AdminAuth() {
  const [form, setForm] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  // Hanya izinkan redirect ke /admin...
  const nextAdmin = useMemo(() => {
    const raw = new URLSearchParams(window.location.search).get("next");
    if (!raw) return "/admin";
    try {
      const u = new URL(raw, window.location.origin);
      const target = (u.pathname || "") + (u.search || "");
      return target.startsWith("/admin") ? target : "/admin";
    } catch {
      return "/admin";
    }
  }, []);

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setOk("");
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          password: form.password,
        }),
      });

      let data = {};
      try {
        data = await res.json();
      } catch {}

      if (!res.ok)
        throw new Error(data?.message || `${res.status} ${res.statusText}`);
      if (!data?.token) throw new Error("Login success but token missing.");

      localStorage.setItem("sl:token", data.token);
      localStorage.setItem(
        "sl:user",
        JSON.stringify({
          id: data.id,
          fullName: data.fullName,
          email: data.email,
          role: data.role,
        })
      );

      setOk("Signed in successfully");
      setTimeout(() => window.location.replace(nextAdmin), 150);
    } catch (err) {
      setError(err.message || "Auth failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="slaa-root"
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 720,
          background: "var(--slaa-surface, #fff)",
          borderRadius: 20,
          boxShadow: "0 20px 40px rgba(0,0,0,.08)",
          padding: 28,
        }}
      >
        <div className="slaa-tabs" style={{ justifyContent: "center" }}>
          <button className="slaa-tab is-active" type="button" disabled>
            <LogIn className="mr-2 h-4 w-4" /> Login
          </button>
        </div>

        <form className="slaa-form" onSubmit={submit}>
          <Field
            label="Email"
            name="email"
            type="email"
            value={form.email}
            onChange={onChange}
            placeholder="you@example.com"
            autoFocus
          />

          <Field
            label="Password"
            name="password"
            type={showPwd ? "text" : "password"}
            value={form.password}
            onChange={onChange}
            placeholder="••••••••"
            suffix={
              <button
                type="button"
                className="slaa-iconBtn"
                onClick={() => setShowPwd((v) => !v)}
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />

          {error && <div className="slaa-alert slaa-alert--error">{error}</div>}
          {ok && (
            <div className="slaa-alert slaa-alert--ok">
              <CheckCircle2 className="mr-1" /> {ok}
            </div>
          )}

          <button
            type="submit"
            className="slaa-btnPrimary"
            disabled={loading || !form.email || !form.password}
          >
            {loading ? "Please wait..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  autoFocus,
  suffix,
}) {
  return (
    <div className="slaa-field">
      <label className="slaa-label">{label}</label>
      <div className="slaa-inputWrap">
        <input
          className="slaa-input"
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoFocus={!!autoFocus}
          required
        />
        {suffix && <div className="slaa-suffix">{suffix}</div>}
      </div>
    </div>
  );
}
