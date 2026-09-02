import {
  ArrowLeft,
  Building2,
  CalendarDays,
  Clock3,
  Compass,
  Heart,
  Layers,
  MapPin,
  Ruler,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { api } from "../api/client.js";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Spinner,
} from "../components/ui.jsx";
import { formatDate, formatPerSqm, formatWan } from "../utils/format.js";

export default function ListingDetailView() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    setError("");
    api
      .get(`/houses/${id}`)
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [id]);

  if (loading) return <Spinner label="正在读取房源详情…" />;
  if (error || !data) {
    return <EmptyState title="房源不存在或加载失败" description={error} />;
  }

  const house = data.house;
  const stats = [
    { label: "面积", value: `${house.area} ㎡`, icon: Ruler },
    { label: "户型", value: `${house.rooms}室${house.halls}厅${house.bathrooms}卫`, icon: Layers },
    { label: "朝向", value: house.orientation || "—", icon: Compass },
    { label: "楼层", value: house.floor || "—", icon: Building2 },
    { label: "装修情况", value: house.decoration || "—", icon: CalendarDays },
    { label: "建筑类型", value: house.building_type || "—", icon: Building2 },
    { label: "关注度", value: house.followers_count != null ? `${house.followers_count} 人` : "—", icon: Heart },
    { label: "挂牌天数", value: house.listing_days != null ? `${house.listing_days} 天` : "—", icon: Clock3 },
  ];

  const toggleFavorite = async () => {
    try {
      if (house.is_favorite) {
        await api.delete(`/houses/${house.id}/favorite`);
      } else {
        await api.post(`/houses/${house.id}/favorite`);
      }
      setData((current) => ({
        ...current,
        house: { ...current.house, is_favorite: !current.house.is_favorite },
      }));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-5">
      <Button variant="secondary" icon={ArrowLeft} onClick={() => history.back()}>
        返回房源大厅
      </Button>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <Card>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-sm text-slate">
                <MapPin size={18} />
                {house.city} · {house.district} · {house.community}
              </div>
              <h1 className="mt-2 font-display text-3xl font-normal leading-9 tracking-tight text-charcoal">
                {house.title}
              </h1>
            </div>
            <Button
              variant={house.is_favorite ? "danger" : "secondary"}
              icon={Heart}
              onClick={toggleFavorite}
            >
              {house.is_favorite ? "已收藏" : "收藏"}
            </Button>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            {(house.tags || []).map((tag) => (
              <Badge key={tag} tone="blue">
                {tag}
              </Badge>
            ))}
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg bg-white/6 p-4 ring-1 ring-white/10">
              <p className="text-xs font-medium text-slate">挂牌总价</p>
              <p className="tabular mt-1 text-4xl font-bold text-electric-blue">
                {formatWan(house.price_total)}
              </p>
              <p className="tabular mt-2 text-sm text-slate">
                {formatPerSqm(house.price_per_sqm)}
              </p>
            </div>
            <div className="panel p-4">
              <p className="text-xs font-medium text-slate">数据来源</p>
              <p className="mt-1 text-sm font-medium text-charcoal">
                {house.source || "演示数据源"}
              </p>
              <p className="mt-2 text-xs text-slate">
                上架时间 {formatDate(house.published_at)}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {stats.map((item) => (
              <div key={item.label} className="rounded-lg border border-white/10 bg-white/6 p-3">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-slate">
                  <item.icon size={18} />
                  {item.label}
                </div>
                <p className="tabular mt-2 text-base font-bold text-charcoal">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card title="挂牌动态" description="最近一次数据更新">
            <div className="space-y-3">
              <div className="flex items-center justify-between text-base">
                <span className="text-slate">挂牌状态</span>
                <Badge tone="green">在售</Badge>
              </div>
              <div className="flex items-center justify-between text-base">
                <span className="text-slate">信息来源</span>
                <span className="font-mono text-sm text-slate">
                  {house.source || "seed"}
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
