import {
  ArrowRight,
  BarChart3,
  Building2,
  KeyRound,
  Moon,
  ShieldCheck,
  Sun,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { Badge, Button, Input } from "../components/ui.jsx";
import { useTheme } from "../theme/ThemeContext.jsx";

const pulseBars = [
  { height: "38%", delay: "0s", color: "#2b59d1" },
  { height: "62%", delay: "0.15s", color: "#8d99d8" },
  { height: "48%", delay: "0.3s", color: "#0f9d76" },
  { height: "78%", delay: "0.45s", color: "#f37a0a" },
  { height: "54%", delay: "0.6s", color: "#4f8cd6" },
  { height: "86%", delay: "0.75s", color: "#a0b5eb" },
  { height: "42%", delay: "0.9s", color: "#a7fccd" },
  { height: "68%", delay: "1.05s", color: "#ff9473" },
];

function PulseColumn({ position }) {
  return (
    <div
      className={`pointer-events-none absolute top-0 hidden h-full w-64 items-end justify-center gap-3 px-8 pb-24 md:flex ${
        position === "left" ? "left-0" : "right-0"
      }`}
      aria-hidden="true"
    >
      {pulseBars.map((bar, index) => (
        <span
          key={`${position}-${index}`}
          className="bar-pulse w-3 rounded-t-full opacity-80"
          style={{
            height: bar.height,
            background: `linear-gradient(180deg, ${bar.color}, rgba(37,99,235,0.08))`,
            animationDelay: bar.delay,
          }}
        />
      ))}
    </div>
  );
}

export default function LoginView() {
  const { login, register, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState("user");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [totalHouses, setTotalHouses] = useState(null);

  useEffect(() => {
    if (user) {
      navigate("/", { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    api
      .get("/houses", { per_page: 1 })
      .then((data) => setTotalHouses(data.total))
      .catch(() => setTotalHouses(null));
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(username.trim(), password);
      } else {
        await register({
          username: username.trim(),
          password,
          nickname: nickname.trim() || username.trim(),
          role,
        });
      }
      navigate(location.state?.from || "/", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-stage relative min-h-screen overflow-hidden">
      <div className="mesh-background" aria-hidden="true" />
      <div className="bg-effects" aria-hidden="true" />
      <PulseColumn position="left" />
      <PulseColumn position="right" />

      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            "linear-gradient(var(--login-grid) 1px, transparent 1px), linear-gradient(90deg, var(--login-grid) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "linear-gradient(180deg, rgba(0,0,0,0.7), transparent 75%)",
          WebkitMaskImage:
            "linear-gradient(180deg, rgba(0,0,0,0.7), transparent 75%)",
        }}
        aria-hidden="true"
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10 sm:px-8">
        <button
          className="focus-ring fixed right-4 top-4 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-semibold text-charcoal shadow-sm backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-white/10 hover:shadow-md"
          onClick={toggleTheme}
          aria-label={theme === "light" ? "切换到夜间模式" : "切换到日间模式"}
        >
          {theme === "light" ? (
            <Moon size={18} className="text-electric-blue" />
          ) : (
            <Sun size={18} className="text-electric-blue" />
          )}
          {theme === "light" ? "夜间模式" : "日间模式"}
        </button>
        <div className="w-full max-w-xl">
          <div className="mb-8 flex flex-col items-center text-center">
            <span className="gradient-blue flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-md">
              <Building2 size={30} />
            </span>
            <div className="mt-4 flex items-center gap-2">
              <span className="font-display text-4xl font-normal tracking-tight text-charcoal">
                房脉
              </span>
              <Badge tone="blue">PHASE 3</Badge>
            </div>
            <p className="mt-2 text-sm text-slate">
              南昌二手房数据工作台 · 采集 / 清洗 / 分析 / 管理
            </p>
          </div>

          <div className="panel p-6 shadow-[0_24px_60px_rgba(3,7,18,0.26)] sm:p-8">
            <div className="mb-6 grid grid-cols-2 gap-2 rounded-full bg-white/5 p-1">
              {[
                { key: "login", label: "登录" },
                { key: "register", label: "注册" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  className={`rounded-full py-3.5 text-lg font-bold transition-all ${
                    mode === tab.key
                      ? "gradient-blue text-white shadow-sm"
                      : "text-slate hover:text-white"
                  }`}
                  onClick={() => setMode(tab.key)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <h1 className="text-center font-display text-3xl font-normal tracking-tight text-charcoal sm:text-4xl">
              {mode === "login" ? "欢迎回到数据工作台" : "创建你的房脉账号"}
            </h1>
            <p className="mt-2 text-center text-lg leading-7 text-slate">
              {mode === "login"
                ? "登录后继续查看大盘、房源与分析面板。"
                : "注册后即可收藏房源、管理资料并查看分析面板。"}
            </p>

            <form className="mt-8 space-y-6" onSubmit={submit}>
              {mode === "register" ? (
                <div>
                  <span className="label text-sm">选择角色</span>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      {
                        value: "user",
                        label: "普通用户",
                        icon: UserRound,
                        active: "gradient-blue text-white shadow-sm",
                      },
                      {
                        value: "admin",
                        label: "管理员",
                        icon: ShieldCheck,
                        active: "gradient-warm text-white shadow-sm",
                      },
                    ].map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        className={`focus-ring flex items-center justify-center gap-2 rounded-xl border px-3 py-4 text-lg font-semibold transition-all hover:-translate-y-0.5 hover:shadow-md ${
                          role === item.value
                            ? `${item.active} border-transparent`
                            : "border-white/10 bg-white/5 text-slate hover:border-electric-blue/40 hover:text-white"
                        }`}
                        onClick={() => setRole(item.value)}
                      >
                        <item.icon size={22} />
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              {mode === "register" ? (
                <Input
                  label="昵称（可选）"
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  placeholder="展示给其他用户的名称"
                  className="min-h-12 text-base"
                />
              ) : null}

              <Input
                label="用户名"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="至少 3 个字符"
                autoComplete="username"
                required
                className="min-h-12 text-base"
              />
              <Input
                label="密码"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="至少 6 个字符"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                required
                className="min-h-12 text-base"
              />

              {error ? (
                <p className="rounded-xl border border-tangerine/30 bg-tangerine/10 px-4 py-3 text-base text-tangerine">
                  {error}
                </p>
              ) : null}

              <Button className="w-full !py-4 text-lg" disabled={loading}>
                {loading
                  ? "处理中…"
                  : mode === "login"
                    ? "登录并进入大盘"
                    : "注册并进入大盘"}
              </Button>
            </form>

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Badge tone="blue">演示账号 demo / demo123</Badge>
              <Badge tone="violet">管理员 admin / admin123</Badge>
            </div>
            <div className="mt-4 flex items-start gap-2 rounded-xl bg-white/5 p-3">
              <KeyRound size={20} className="mt-0.5 shrink-0 text-electric-blue" />
              <p className="text-base leading-7 text-slate">
                登录状态由 Bearer Token 维护，退出后需要重新登录才能访问数据接口。
              </p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-base text-slate">
            {["采集", "清洗", "入库", "分析", "管理"].map((step, index) => (
              <div key={step} className="flex items-center gap-2">
                <span className="rounded-full bg-white/6 px-4 py-2 font-semibold text-charcoal shadow-sm ring-1 ring-white/10">
                  {step}
                </span>
                {index < 4 ? <ArrowRight size={18} className="text-silver" /> : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute bottom-5 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-2 rounded-full bg-white/6 px-5 py-2.5 text-base text-slate shadow-sm ring-1 ring-white/10 md:flex">
        <BarChart3 size={18} className="text-electric-blue" />
        当前库内房源
        <span className="tabular font-semibold text-charcoal">
          {totalHouses ?? "—"}
        </span>
        套
      </div>
    </div>
  );
}
