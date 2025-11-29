// src/Components/Tabs/AccessTab.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  User,
  Check,
  X,
  Loader2,
} from "lucide-react";
import { API_BASE } from "../../config";

// --- role constants ---
const ROLE_OPTIONS = [
  { code: "ADMIN", label: "Administrator", edit: true, publish: true },
  { code: "EDITOR", label: "Data Editor", edit: true, publish: false },
  { code: "VIEWER", label: "Public Viewer", edit: false, publish: false },
];

// --- jwt helper (decode payload only) ---
function readToken() {
  const token = localStorage.getItem("sl:token");
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  try {
    const json = JSON.parse(
      atob(parts[1].replace(/-/g, "+").replace(/_/g, "/"))
    );
    return {
      token,
      sub: json.sub ? Number(json.sub) : undefined,
      email: json.email,
      role: json.role, // "ADMIN" | "EDITOR" | "VIEWER"
      exp: json.exp,
    };
  } catch {
    return null;
  }
}

// --- tiny toast ---
function Toast({ t, onClose }) {
  return (
    <div className="pointer-events-auto flex items-center gap-2 rounded-xl border border-[#A3D9A5] bg-white px-3 py-2 shadow">
      <div className={t.type === "error" ? "text-red-600" : "text-[#154734]"}>
        {t.type === "error" ? (
          <X className="w-4 h-4" />
        ) : (
          <Check className="w-4 h-4" />
        )}
      </div>
      <div className="text-[13px] text-[#2D2D2D]/80">{t.msg}</div>
      <button
        className="ml-2 text-slate-400 hover:text-slate-600"
        onClick={() => onClose(t.id)}
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
function ToastStack({ items, onClose }) {
  if (!items.length) return null;
  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[10000] flex flex-col gap-2">
      {items.map((t) => (
        <Toast key={t.id} t={t} onClose={onClose} />
      ))}
    </div>
  );
}

// --- fetch util (auto bearer) ---
async function api(path, opts = {}) {
  const token = localStorage.getItem("sl:token");
  const headers = {
    ...(opts.headers || {}),
    ...(opts.body && !(opts.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `${res.status} ${res.statusText}`);
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : null;
}

function PermRow({ ok, icon: Icon, text }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className={`w-4 h-4 ${ok ? "text-[#154734]" : "text-gray-400"}`} />
      <span className="text-[13px] text-[#2D2D2D]/80">{text}</span>
    </div>
  );
}

export default function AccessTab() {
  const claims = useMemo(readToken, []);
  const [me] = useState(
    claims ? { id: claims.sub, email: claims.email, role: claims.role } : null
  );
  const isAdmin = me?.role === "ADMIN";

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(null);
  const [toasts, setToasts] = useState([]);

  const addToast = (msg, type = "ok") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((p) => [...p, { id, msg, type }]);
    setTimeout(() => setToasts((p) => p.filter((x) => x.id !== id)), 3200);
  };
  const closeToast = (id) => setToasts((p) => p.filter((x) => x.id !== id));

  // Fetch real users (semua role boleh melihat)
  useEffect(() => {
    setLoading(true);
    api(`/api/admin/users`)
      .then((d) => setUsers(Array.isArray(d) ? d : []))
      .catch((e) => addToast(`Failed to load users: ${e.message}`, "error"))
      .finally(() => setLoading(false));
  }, []);

  const handleChangeRole = async (user, nextRole) => {
    if (!isAdmin) return;
    if (user.role === nextRole) return;

    const old = user.role;
    setPending(user.id);
    setUsers((prev) =>
      prev.map((u) => (u.id === user.id ? { ...u, role: nextRole } : u))
    );

    try {
      await api(`/api/admin/users/${user.id}/role`, {
        method: "PUT",
        body: JSON.stringify({ role: nextRole }),
      });
      addToast(`Role updated: ${user.email} → ${nextRole}`);
      if (user.id === me?.id && nextRole !== "ADMIN") {
        addToast(
          "You changed your own role. Admin features will be disabled after refresh."
        );
      }
    } catch (e) {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, role: old } : u))
      );
      addToast(`Failed to update role: ${e.message}`, "error");
    } finally {
      setPending(null);
    }
  };

  return (
    <div className="slacc-root fade-in">
      <ToastStack items={toasts} onClose={closeToast} />

      {/* Current user bar */}
      <div className="mb-4">
        <div className="inline-flex items-center gap-2 rounded-lg border border-[#A3D9A5]/60 bg-white px-3 py-2 shadow-sm">
          <User className="w-4 h-4 text-[#154734]" />
          <span className="text-sm text-[#2D2D2D]/80">
            {me ? (
              <>
                Signed in as <b>{me.email}</b> • Role: <b>{me.role}</b>
              </>
            ) : (
              <>Not signed in</>
            )}
          </span>
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-sm text-[#2D2D2D]/70 mb-3">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading users…
        </div>
      )}

      <div className="slacc-grid grid grid-cols-[repeat(auto-fill,minmax(300px,1fr))] gap-6 mt-4">
        {users.map((u) => {
          const roleMeta =
            ROLE_OPTIONS.find((r) => r.code === u.role) || ROLE_OPTIONS[2];
          const highlight = me && u.id === me.id;

          return (
            <div
              key={u.id}
              className={`bg-white rounded-xl p-5 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all border overflow-visible ${
                highlight ? "border-[#154734]" : "border-[#A3D9A5]/40"
              }`}
            >
              {/* Header */}
              <div className="grid grid-cols-[1fr_auto] items-start gap-3 mb-3">
                <div className="min-w-0">
                  <h3
                    className="font-semibold text-[#154734] text-sm truncate"
                    title={u.fullName || u.email || "User"}
                  >
                    {u.fullName || u.email || "User"}
                  </h3>
                  <p
                    className="text-[12px] text-[#2D2D2D]/60 truncate max-w-[240px] sm:max-w-[280px]"
                    title={u.email || ""}
                  >
                    {u.email || "—"}
                  </p>
                </div>

                {/* Role select (ADMIN only) */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-[#154734] whitespace-nowrap">
                    Role
                  </span>
                  <div className="relative z-10">
                    <select
                      disabled={!isAdmin || pending === u.id}
                      value={u.role}
                      onChange={(e) => handleChangeRole(u, e.target.value)}
                      className="text-[12px] border border-[#A3D9A5]/60 rounded-md px-2 py-1 bg-white focus:ring-2 focus:ring-[#A3D9A5] w-[130px] max-w-[130px]"
                    >
                      {ROLE_OPTIONS.map((o) => (
                        <option key={o.code} value={o.code}>
                          {o.code}
                        </option>
                      ))}
                    </select>
                    {pending === u.id && (
                      <div className="absolute right-1 top-1.5">
                        <Loader2 className="w-4 h-4 animate-spin text-[#154734]" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Permissions preview */}
              <div className="flex flex-col gap-3">
                <PermRow
                  ok={roleMeta.edit}
                  icon={ShieldCheck}
                  text="Edit Access (create/update/delete layers)"
                />
                <PermRow
                  ok={roleMeta.publish}
                  icon={ShieldAlert}
                  text="Publish Rights (Draft ↔ Published)"
                />
              </div>

              {/* Role label pill */}
              <div className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#154734]/10 text-[#154734] px-2 py-1 text-[11px] font-semibold">
                {ROLE_OPTIONS.find((r) => r.code === u.role)?.label || u.role}
              </div>
            </div>
          );
        })}
      </div>

      {!loading && users.length === 0 && (
        <div className="mt-6 text-sm text-[#2D2D2D]/60">No users found.</div>
      )}
    </div>
  );
}
