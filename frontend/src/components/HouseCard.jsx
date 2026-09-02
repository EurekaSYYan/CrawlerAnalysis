import { Heart, MapPin } from "lucide-react";
import { useRef } from "react";
import { useNavigate } from "react-router-dom";

import { formatPerSqm, formatWan } from "../utils/format.js";
import { Badge } from "./ui.jsx";

export default function HouseCard({ house, onToggleFavorite }) {
  const navigate = useNavigate();
  const ref = useRef(null);
  const handleMouseMove = (event) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty("--tilt-x", `${(-py * 3).toFixed(2)}deg`);
    el.style.setProperty("--tilt-y", `${(px * 3).toFixed(2)}deg`);
  };
  const resetTilt = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--tilt-x", "0deg");
    el.style.setProperty("--tilt-y", "0deg");
  };
  return (
    <article
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={resetTilt}
      className="house-card panel focus-ring group cursor-pointer overflow-hidden p-4"
      onClick={() => navigate(`/houses/${house.id}`)}
      onKeyDown={(event) => {
        if (event.key === "Enter") navigate(`/houses/${house.id}`);
      }}
      tabIndex={0}
      role="link"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-sm text-slate">
            <MapPin size={16} />
            <span className="truncate">
              {house.district} / {house.community}
            </span>
          </div>
          <h3 className="mt-2 line-clamp-2 text-lg font-semibold leading-6 text-charcoal">
            {house.title}
          </h3>
        </div>
        <button
          className={`focus-ring rounded-lg p-2 transition-colors ${
            house.is_favorite
              ? "text-tangerine"
              : "text-silver hover:bg-white/6 hover:text-tangerine"
          }`}
          onClick={(event) => {
            event.stopPropagation();
            onToggleFavorite?.(house);
          }}
          aria-label={house.is_favorite ? "取消收藏" : "收藏"}
        >
          <Heart size={20} fill={house.is_favorite ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="mt-4 rounded-xl border border-white/10 bg-white/6 p-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="tabular text-3xl font-semibold leading-none text-electric-blue">
              {formatWan(house.price_total)}
            </p>
            <p className="tabular mt-1.5 text-sm text-slate">
              {formatPerSqm(house.price_per_sqm)}
            </p>
          </div>
          <div className="text-right text-sm text-slate">
            <p className="tabular">{house.area} ㎡</p>
            <p className="tabular mt-1">
              {house.rooms}室{house.halls}厅 / {house.building_type || "类型未知"}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {(house.tags || []).slice(0, 3).map((tag, index) => (
          <Badge key={tag} tone={["blue", "green", "orange", "violet"][index % 4]}>
            {tag}
          </Badge>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-slate">
        {house.decoration ? <MetaPill>{house.decoration}</MetaPill> : null}
        {house.building_type ? (
          <MetaPill>{house.building_type}</MetaPill>
        ) : null}
        {house.followers_count != null ? (
          <MetaPill>{house.followers_count} 人关注</MetaPill>
        ) : null}
        {house.listing_days != null ? (
          <MetaPill>挂牌 {house.listing_days} 天</MetaPill>
        ) : null}
        {house.floor ? <MetaPill>{house.floor.split("/")[0]}</MetaPill> : null}
      </div>
    </article>
  );
}

function MetaPill({ children }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/6 px-2.5 py-1 text-sm font-medium text-slate ring-1 ring-white/10">
      {children}
    </span>
  );
}
