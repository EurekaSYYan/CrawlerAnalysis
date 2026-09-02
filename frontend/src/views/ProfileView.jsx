import {
  CalendarDays,
  CheckCircle2,
  Heart,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { EChart, pieChartOption } from "../components/Charts.jsx";
import HouseCard from "../components/HouseCard.jsx";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageHero,
  Spinner,
} from "../components/ui.jsx";
import { formatDate } from "../utils/format.js";

export default function ProfileView() {
  const { user, refresh, logout } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState({
    nickname: user.nickname || "",
    email: user.email || "",
    phone: user.phone || "",
  });
  const [favorites, setFavorites] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadFavorites = useCallback(() => {
    api
      .get("/favorites")
      .then((data) => setFavorites(data.items))
      .catch((err) => setError(err.message));
  }, []);

  useEffect(loadFavorites, [loadFavorites]);

  const memberDays = useMemo(() => {
    if (!user.created_at) return 1;
    const created = new Date(user.created_at);
    return Math.max(1, Math.floor((Date.now() - created.getTime()) / 86400000));
  }, [user.created_at]);

  const completion = useMemo(() => {
    const filled = [user.nickname, user.email, user.phone].filter(
      (value) => value && String(value).trim()
    ).length;
    return Math.round((filled / 3) * 100);
  }, [user]);

  const profileOption = useMemo(
    () =>
      pieChartOption({
        name: "资料完整度",
        data: [
          { name: "已完成", value: completion },
          { name: "待补充", value: 100 - completion },
        ],
      }),
    [completion]
  );

  const saveProfile = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    try {
      await api.patch("/auth/me", profile);
      await refresh();
      setMessage("个人资料已更新");
    } catch (err) {
      setError(err.message);
    }
  };

  const reLogin = async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // Continue with local logout even if the session is already invalid.
    }
    logout();
    navigate("/login", {
      replace: true,
      state: { from: "/profile", reLogin: true },
    });
  };

  const removeFavorite = async (house) => {
    await api.delete(`/houses/${house.id}/favorite`);
    loadFavorites();
  };

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="个人中心"
        title="我的资料、收藏与登录会话"
        description="管理个人资料、查看数据足迹，并随时重新登录。"
        action={
          <Button variant="secondary" icon={RotateCcw} onClick={reLogin}>
            重新登录
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <ProfileStat
          label="角色"
          value={user.role === "admin" ? "管理员" : "普通用户"}
          icon={ShieldCheck}
          gradient="gradient-blue"
        />
        <ProfileStat
          label="收藏房源"
          value={favorites?.length ?? "—"}
          icon={Heart}
          gradient="gradient-warm"
        />
        <ProfileStat
          label="在籍天数"
          value={memberDays}
          icon={CalendarDays}
          gradient="gradient-mint"
        />
        <ProfileStat
          label="资料完整度"
          value={`${completion}%`}
          icon={Sparkles}
          gradient="gradient-blue"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card
          title="账号概览"
          description="当前登录会话信息"
          action={<UserRound size={22} className="text-electric-blue" />}
          className="gradient-border"
        >
          <div className="flex items-center gap-4">
            <span className="gradient-blue flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-3xl font-bold text-white shadow-md">
              {(user.nickname || user.username || "U").slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-2xl font-bold text-charcoal">
                {user.nickname || user.username}
              </p>
              <Badge tone={user.role === "admin" ? "violet" : "blue"}>
                {user.role === "admin" ? "管理员" : "普通用户"}
              </Badge>
            </div>
          </div>
          <div className="mt-6 space-y-3 text-lg">
            <InfoRow label="用户名" value={user.username} />
            <InfoRow label="注册时间" value={formatDate(user.created_at)} />
            <InfoRow
              label="邮箱"
              value={user.email || "未填写"}
              muted={!user.email}
            />
            <InfoRow
              label="手机号"
              value={user.phone || "未填写"}
              muted={!user.phone}
            />
          </div>
        </Card>

        <Card
          title="编辑个人资料"
          description="保存后会立即刷新当前会话信息"
          action={<Save size={22} className="text-vivid-green" />}
          className="gradient-border-mint"
        >
          <form className="space-y-4" onSubmit={saveProfile}>
            <Input
              label="用户名"
              value={user.username}
              disabled
              className="min-h-12 text-base opacity-60"
            />
            <Input
              label="昵称"
              value={profile.nickname}
              onChange={(event) =>
                setProfile({ ...profile, nickname: event.target.value })
              }
              className="min-h-12 text-base"
            />
            <Input
              label="邮箱"
              type="email"
              value={profile.email}
              onChange={(event) =>
                setProfile({ ...profile, email: event.target.value })
              }
              className="min-h-12 text-base"
            />
            <Input
              label="手机号"
              value={profile.phone}
              onChange={(event) =>
                setProfile({ ...profile, phone: event.target.value })
              }
              className="min-h-12 text-base"
            />
            {error ? (
              <p className="rounded-xl border border-tangerine/30 bg-tangerine/10 px-4 py-3 text-sm text-tangerine">
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="rounded-xl bg-vivid-green/10 px-4 py-3 text-sm text-vivid-green">
                {message}
              </p>
            ) : null}
            <Button icon={Save} className="w-full !py-3">
              保存修改
            </Button>
          </form>
        </Card>

        <Card
          title="数据足迹"
          description="资料完善度与账户动态"
          action={<Sparkles size={22} className="text-lavender" />}
        >
          <EChart option={profileOption} height={220} />
          <div className="mt-3 space-y-2.5">
            <TimelineItem
              icon={CheckCircle2}
              tone="text-vivid-green"
              title="账号已创建"
              desc={formatDate(user.created_at)}
            />
            <TimelineItem
              icon={Heart}
              tone="text-tangerine"
              title="收藏管理"
              desc={`${favorites?.length || 0} 套房源待关注`}
            />
            <TimelineItem
              icon={RotateCcw}
              tone="text-electric-blue"
              title="重新登录"
              desc="随时安全切换账号"
            />
          </div>
        </Card>
      </div>

      <Card
        title="我的收藏"
        description={`已收藏 ${favorites?.length || 0} 套房源`}
        action={<RefreshCw size={20} className="text-slate" />}
      >
        {favorites === null ? (
          <Spinner />
        ) : favorites.length ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {favorites.map((house) => (
              <HouseCard
                key={house.id}
                house={house}
                onToggleFavorite={removeFavorite}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="还没有收藏"
            description="在房源大厅点击心形按钮，把关注的房源收进来。"
            action={
              <Button variant="secondary" onClick={() => navigate("/houses")}>
                去房源大厅
              </Button>
            }
          />
        )}
      </Card>
    </div>
  );
}

function ProfileStat({ label, value, icon: Icon, gradient }) {
  return (
    <div className="panel hover-lift relative overflow-hidden p-4">
      <span className={`${gradient} absolute inset-x-0 top-0 h-1`} />
      <div className="flex items-center gap-2 text-sm font-semibold text-slate">
        <Icon size={20} />
        {label}
      </div>
      <p className="tabular mt-2 text-3xl font-bold text-charcoal">{value}</p>
    </div>
  );
}

function InfoRow({ label, value, muted = false }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/6 px-4 py-3 transition-all hover:-translate-y-0.5 hover:border-electric-blue/40 hover:bg-white/10 hover:shadow-sm">
      <span className="text-base text-slate">{label}</span>
      <span
        className={`tabular truncate text-base font-semibold ${
          muted ? "text-silver" : "text-charcoal"
        }`}
      >
        {value}
      </span>
    </div>
  );
}

function TimelineItem({ icon: Icon, tone, title, desc }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/6 p-3.5 transition-all hover:-translate-y-0.5 hover:border-electric-blue/40 hover:shadow-md">
      <Icon size={22} className={tone} />
      <div className="min-w-0">
        <p className="text-base font-bold text-charcoal">{title}</p>
        <p className="truncate text-sm text-slate">{desc}</p>
      </div>
    </div>
  );
}
