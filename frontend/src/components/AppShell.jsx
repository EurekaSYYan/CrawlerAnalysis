import {
  BarChart3,
  Building2,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Search,
  SlidersHorizontal,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { useTheme } from "../theme/ThemeContext.jsx";
import { Badge } from "./ui.jsx";

const accentClasses = {
  blue: "text-electric-blue",
  green: "text-vivid-green",
  violet: "text-lavender",
  orange: "text-tangerine",
};

const activeClasses = {
  blue: "bg-electric-blue text-white shadow-sm",
  green: "bg-vivid-green text-white shadow-sm",
  violet: "bg-lavender text-white shadow-sm",
  orange: "bg-tangerine text-white shadow-sm",
};

const baseNavItems = [
  { to: "/", label: "数据大盘", icon: LayoutDashboard, tone: "blue", end: true },
  { to: "/houses", label: "房源大厅", icon: Search, tone: "green", end: false },
  { to: "/analytics", label: "数据分析", icon: BarChart3, tone: "violet", end: false },
  { to: "/profile", label: "个人中心", icon: UserRound, tone: "blue", end: false },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin = user.role === "admin";
  const navItems = isAdmin
    ? [
        ...baseNavItems.slice(0, 3),
        {
          to: "/console",
          label: "综合控制台",
          icon: SlidersHorizontal,
          tone: "orange",
          end: false,
        },
        baseNavItems[3],
      ]
    : baseNavItems;

  const endSession = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Local logout still proceeds when the token is already invalid.
    }
    logout();
  };

  const handleLogout = async () => {
    await endSession();
    navigate("/login", { replace: true });
  };

  const closeMobile = () => setMobileOpen(false);

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-20 items-center gap-3 border-b border-white/10 px-5">
        <span className="gradient-blue flex h-11 w-11 items-center justify-center rounded-xl text-white shadow-sm">
          <Building2 size={22} />
        </span>
        <span className="font-display text-2xl font-normal tracking-tight text-charcoal">
          房脉
        </span>
        <span className="ml-1 rounded-full bg-electric-blue/15 px-2.5 py-1 text-[11px] font-bold text-electric-blue ring-1 ring-electric-blue/20">
          PHASE 3
        </span>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={closeMobile}
            className={({ isActive }) =>
              `nav-shimmer ${isActive ? "is-active " : ""}focus-ring group relative flex items-center gap-3 overflow-hidden px-4 py-3 text-base font-semibold transition-all duration-200 ${
                isActive
                  ? `${activeClasses[item.tone]}`
                  : "text-slate hover:translate-x-0.5 hover:bg-white/5 hover:text-white hover:ring-1 hover:ring-white/10"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`nav-active-bar absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full transition-opacity ${
                    isActive ? "" : "opacity-0"
                  }`}
                />
                <item.icon
                  size={22}
                  className={isActive ? "text-white" : "text-slate"}
                />
                <span>{item.label}</span>
                {isActive ? (
                  <span className="nav-on-chip ml-auto rounded-full px-2.5 py-1 text-[11px] font-bold">
                    ON
                  </span>
                ) : (
                  <span
                    className={`ml-auto h-2.5 w-2.5 rounded-full opacity-0 transition-opacity group-hover:opacity-100 ${
                      accentClasses[item.tone]
                    }`}
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="space-y-2 px-4 pb-3">
        <button
          className="focus-ring flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/6 px-4 py-3 text-base font-semibold text-charcoal transition-all hover:-translate-y-0.5 hover:bg-white/10 hover:shadow-md"
          onClick={toggleTheme}
          aria-label={theme === "light" ? "切换到夜间模式" : "切换到日间模式"}
        >
          {theme === "light" ? (
            <Moon size={20} className="text-electric-blue" />
          ) : (
            <Sun size={20} className="text-electric-blue" />
          )}
          {theme === "light" ? "夜间模式" : "日间模式"}
        </button>
        <button
          className="gradient-border focus-ring flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-base font-semibold text-charcoal transition-all hover:-translate-y-0.5 hover:shadow-md"
          onClick={handleLogout}
        >
          <LogIn size={20} className="text-electric-blue" />
          登录 / 切换账号
        </button>
        <div className="gradient-border-mint flex items-center gap-3 rounded-xl p-3 transition-all hover:-translate-y-0.5 hover:shadow-md">
          <span className="gradient-mint flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-base font-bold text-white">
            {(user.nickname || user.username || "U").slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-bold text-charcoal">
              {user.nickname || user.username}
            </p>
            <Badge tone={isAdmin ? "violet" : "blue"}>
              {isAdmin ? "管理员" : "普通用户"}
            </Badge>
          </div>
          <button
            className="focus-ring rounded-lg p-2 text-slate transition-colors hover:bg-white/6 hover:text-tangerine"
            onClick={handleLogout}
            aria-label="退出登录"
            title="退出登录"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="relative min-h-screen">
      <div className="mesh-background" aria-hidden="true" />
      <div className="bg-effects" aria-hidden="true" />
      <aside className="sidebar-gradient fixed inset-y-0 left-0 z-40 hidden w-72 border-r border-white/10 lg:block">
        {sidebarContent}
      </aside>

      <header className="shell-topbar sticky top-0 z-30 flex h-16 items-center gap-3 px-4 lg:hidden">
        <button
          className="focus-ring rounded-lg p-2 text-charcoal hover:bg-white/5"
          onClick={() => setMobileOpen(true)}
          aria-label="打开导航"
        >
          <Menu size={24} />
        </button>
        <span className="gradient-blue flex h-10 w-10 items-center justify-center rounded-xl text-white">
          <Building2 size={20} />
        </span>
        <span className="font-display text-2lg font-normal tracking-tight text-charcoal">
          房脉
        </span>
        <span className="ml-auto rounded-full bg-white/6 px-3 py-1.5 text-xs font-bold text-slate ring-1 ring-white/10">
          {isAdmin ? "管理员" : "普通用户"}
        </span>
        <button
          className="focus-ring rounded-lg p-2 text-charcoal transition-colors hover:bg-white/6"
          onClick={toggleTheme}
          aria-label={theme === "light" ? "切换到夜间模式" : "切换到日间模式"}
          title={theme === "light" ? "夜间模式" : "日间模式"}
        >
          {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </header>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="drawer-mask absolute inset-0 bg-midnight-ink/35"
            onClick={closeMobile}
          />
          <div className="sidebar-gradient sidebar-panel absolute inset-y-0 left-0 w-72 shadow-lg">
            <button
              className="focus-ring absolute right-3 top-4 rounded-lg p-2 text-slate hover:bg-white/5 hover:text-charcoal"
              onClick={closeMobile}
              aria-label="关闭导航"
            >
              <X size={18} />
            </button>
            {sidebarContent}
          </div>
        </div>
      ) : null}

      <main className="page-enter relative z-10 min-h-screen px-4 py-6 lg:pl-80 lg:pr-8">
        <div className="mx-auto max-w-7xl lg:pl-2">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
