import React, { useState, useEffect, useMemo } from "react";
import {
  Layers,
  Globe2,
  Database,
  Users,
  FileText,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  HardDrive,
} from "lucide-react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { API_BASE } from "../../config";

// Helper untuk format bytes
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

// Helper untuk format number
function formatNumber(num) {
  if (!num) return "0";
  return num.toLocaleString();
}

// Color palette
const COLORS = {
  primary: "#154734",
  accent: "#A3D9A5",
  success: "#4CAF50",
  warning: "#FFA726",
  info: "#42A5F5",
  draft: "#ef5350",
  published: "#66BB6A",
};

const CHART_COLORS = [
  "#154734",
  "#A3D9A5",
  "#66BB6A",
  "#42A5F5",
  "#FFA726",
  "#ef5350",
];

function StatisticsTab() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalLayers: 0,
    publishedLayers: 0,
    draftLayers: 0,
    totalFeatures: 0,
    totalSize: 0,
    totalUsers: 0,
    adminUsers: 0,
    editorUsers: 0,
    viewerUsers: 0,
    layersByType: [],
    recentLayers: [],
    topLayers: [],
  });

  // Auth helper
  const authHeaders = () => {
    const token = localStorage.getItem("sl:token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // API helper
  const api = async (path, opts = {}) => {
    const headers = {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...(opts.headers || {}),
    };

    const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const ct = res.headers.get("content-type") || "";
    return ct.includes("application/json") ? res.json() : null;
  };

  // Fetch statistics
  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        // Parallel fetch untuk performance
        const [layersData, metaData, usersData] = await Promise.all([
          api("/api/layers").catch(() => []),
          api("/api/layers/meta").catch(() => []),
          api("/api/admin/users").catch(() => []),
        ]);

        // Calculate stats
        const totalLayers = metaData.length;
        const publishedLayers = metaData.filter(
          (l) => l.status === "Published"
        ).length;
        const draftLayers = metaData.filter((l) => l.status === "Draft").length;

        const totalFeatures = metaData.reduce(
          (sum, l) => sum + (l.featureCount || 0),
          0
        );

        const totalSize = layersData.reduce(
          (sum, l) => sum + (l.sizeBytes || 0),
          0
        );

        // User stats
        const totalUsers = usersData.length;
        const adminUsers = usersData.filter((u) => u.role === "ADMIN").length;
        const editorUsers = usersData.filter((u) => u.role === "EDITOR").length;
        const viewerUsers = usersData.filter((u) => u.role === "VIEWER").length;

        // Group by type
        const typeGroups = {};
        layersData.forEach((l) => {
          const type = l.type || "Unknown";
          typeGroups[type] = (typeGroups[type] || 0) + 1;
        });

        const layersByType = Object.entries(typeGroups).map(
          ([name, value]) => ({
            name,
            value,
          })
        );

        // Recent layers (last 5)
        const recentLayers = [...metaData]
          .sort((a, b) => {
            const dateA = new Date(a.updatedAt || a.createdAt || 0);
            const dateB = new Date(b.updatedAt || b.createdAt || 0);
            return dateB - dateA;
          })
          .slice(0, 5)
          .map((l) => ({
            name: l.name,
            features: l.featureCount || 0,
            status: l.status,
          }));

        // Top layers by feature count
        const topLayers = [...metaData]
          .filter((l) => l.featureCount > 0)
          .sort((a, b) => (b.featureCount || 0) - (a.featureCount || 0))
          .slice(0, 5)
          .map((l) => ({
            name: l.name.length > 20 ? l.name.substring(0, 20) + "..." : l.name,
            features: l.featureCount || 0,
          }));

        setStats({
          totalLayers,
          publishedLayers,
          draftLayers,
          totalFeatures,
          totalSize,
          totalUsers,
          adminUsers,
          editorUsers,
          viewerUsers,
          layersByType,
          recentLayers,
          topLayers,
        });
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Compute derived data
  const statusData = useMemo(
    () => [
      {
        name: "Published",
        value: stats.publishedLayers,
        color: COLORS.published,
      },
      { name: "Draft", value: stats.draftLayers, color: COLORS.draft },
    ],
    [stats.publishedLayers, stats.draftLayers]
  );

  const userRoleData = useMemo(
    () => [
      { name: "Admin", value: stats.adminUsers, color: COLORS.primary },
      { name: "Editor", value: stats.editorUsers, color: COLORS.accent },
      { name: "Viewer", value: stats.viewerUsers, color: COLORS.info },
    ],
    [stats.adminUsers, stats.editorUsers, stats.viewerUsers]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[#154734] font-semibold">
          Loading statistics...
        </div>
      </div>
    );
  }

  return (
    <div className="slad-stats fade-in space-y-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <StatCard
          icon={<Layers className="w-5 h-5" />}
          label="Total Layers"
          value={stats.totalLayers}
          color="bg-[#154734]"
        />
        <StatCard
          icon={<Globe2 className="w-5 h-5" />}
          label="Published Layers"
          value={stats.publishedLayers}
          color="bg-[#66BB6A]"
        />
        <StatCard
          icon={<FileText className="w-5 h-5" />}
          label="Draft Layers"
          value={stats.draftLayers}
          color="bg-[#ef5350]"
        />
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="Total Features"
          value={formatNumber(stats.totalFeatures)}
          color="bg-[#42A5F5]"
        />
        <StatCard
          icon={<HardDrive className="w-5 h-5" />}
          label="Total Storage"
          value={formatBytes(stats.totalSize)}
          color="bg-[#FFA726]"
        />
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Total Users"
          value={stats.totalUsers}
          color="bg-[#AB47BC]"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Layer Status Pie Chart */}
        <ChartCard title="Layer Status Distribution" icon={<PieChartIcon />}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, percent }) =>
                  `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Layer Type Distribution */}
        <ChartCard title="Layer Types" icon={<BarChart3 />}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.layersByType}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis dataKey="name" stroke="#666" />
              <YAxis stroke="#666" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #A3D9A5",
                  borderRadius: "8px",
                }}
              />
              <Bar
                dataKey="value"
                fill={COLORS.primary}
                radius={[8, 8, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Charts Row 2 */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Top Layers by Features */}
        <ChartCard title="Top 5 Layers by Features" icon={<TrendingUp />}>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={stats.topLayers}
              layout="vertical"
              margin={{ left: 100 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" />
              <XAxis type="number" stroke="#666" />
              <YAxis dataKey="name" type="category" stroke="#666" width={90} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #A3D9A5",
                  borderRadius: "8px",
                }}
              />
              <Bar
                dataKey="features"
                fill={COLORS.accent}
                radius={[0, 8, 8, 0]}
              >
                {stats.topLayers.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* User Roles Pie Chart */}
        <ChartCard title="User Roles Distribution" icon={<Users />}>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={userRoleData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, percent }) =>
                  value > 0
                    ? `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                    : ""
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {userRoleData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Recent Activity */}
      <ChartCard title="Recent Layers" icon={<Activity />}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#A3D9A5]/40">
                <th className="text-left py-3 px-4 text-sm font-semibold text-[#154734]">
                  Layer Name
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-[#154734]">
                  Features
                </th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-[#154734]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {stats.recentLayers.length === 0 ? (
                <tr>
                  <td colSpan="3" className="text-center py-6 text-gray-500">
                    No layers yet
                  </td>
                </tr>
              ) : (
                stats.recentLayers.map((layer, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-[#A3D9A5]/20 hover:bg-[#F4F6F5] transition"
                  >
                    <td className="py-3 px-4 text-sm text-[#2D2D2D]">
                      {layer.name}
                    </td>
                    <td className="py-3 px-4 text-sm text-center text-[#2D2D2D]">
                      {formatNumber(layer.features)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          layer.status === "Published"
                            ? "bg-[#66BB6A]/20 text-[#2E7D32]"
                            : "bg-[#ef5350]/20 text-[#C62828]"
                        }`}
                      >
                        {layer.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </ChartCard>

      {/* Summary Statistics Grid */}
      <div className="grid md:grid-cols-3 gap-4">
        <SummaryCard
          label="Average Features per Layer"
          value={
            stats.totalLayers > 0
              ? Math.round(stats.totalFeatures / stats.totalLayers)
              : 0
          }
          icon={<BarChart3 className="w-5 h-5" />}
        />
        <SummaryCard
          label="Average Layer Size"
          value={
            stats.totalLayers > 0
              ? formatBytes(Math.round(stats.totalSize / stats.totalLayers))
              : "0 B"
          }
          icon={<Database className="w-5 h-5" />}
        />
        <SummaryCard
          label="Publish Rate"
          value={
            stats.totalLayers > 0
              ? `${Math.round(
                  (stats.publishedLayers / stats.totalLayers) * 100
                )}%`
              : "0%"
          }
          icon={<TrendingUp className="w-5 h-5" />}
        />
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({ icon, label, value, color }) {
  return (
    <div className="bg-white border border-[#A3D9A5]/40 rounded-xl p-6 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all">
      <div
        className={`${color} w-12 h-12 rounded-lg flex items-center justify-center text-white mb-4 shadow-md`}
      >
        {icon}
      </div>
      <h3 className="text-[#154734] font-semibold text-sm mb-1">{label}</h3>
      <p className="text-[#2D2D2D] text-2xl font-extrabold">{value}</p>
    </div>
  );
}

// Chart Card Component
function ChartCard({ title, icon, children }) {
  return (
    <div className="bg-white border border-[#A3D9A5]/40 rounded-xl p-6 shadow-md">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-10 h-10 rounded-lg bg-[#154734]/10 text-[#154734] flex items-center justify-center">
          {icon}
        </div>
        <h3 className="text-[#154734] font-bold text-lg">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// Summary Card Component
function SummaryCard({ label, value, icon }) {
  return (
    <div className="bg-gradient-to-br from-[#154734]/5 to-[#A3D9A5]/10 border border-[#A3D9A5]/40 rounded-xl p-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[#154734]/10 text-[#154734] flex items-center justify-center">
          {icon}
        </div>
        <div>
          <p className="text-xs text-[#2D2D2D]/60 font-medium">{label}</p>
          <p className="text-xl font-bold text-[#154734]">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default StatisticsTab;
