import { FilterX, Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useState } from "react";

import { api } from "../api/client.js";
import HouseCard from "../components/HouseCard.jsx";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Input,
  PageHero,
  Pagination,
  Select,
  Spinner,
} from "../components/ui.jsx";

const defaultFilters = {
  q: "",
  district: "",
  rooms: "",
  minPrice: "",
  maxPrice: "",
  minArea: "",
  maxArea: "",
  sort: "newest",
};

export default function ListingsView() {
  const [filters, setFilters] = useState(defaultFilters);
  const [applied, setApplied] = useState(defaultFilters);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    api
      .get("/houses", {
        ...applied,
        page,
        per_page: 12,
      })
      .then(setData)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [applied, page]);

  const applyFilters = (event) => {
    event.preventDefault();
    setPage(1);
    setApplied(filters);
  };

  const clearFilters = () => {
    setFilters(defaultFilters);
    setApplied(defaultFilters);
    setPage(1);
  };

  const toggleFavorite = async (house) => {
    try {
      if (house.is_favorite) {
        await api.delete(`/houses/${house.id}/favorite`);
      } else {
        await api.post(`/houses/${house.id}/favorite`);
      }
      setData((current) => ({
        ...current,
        items: current.items.map((item) =>
          item.id === house.id
            ? { ...item, is_favorite: !item.is_favorite }
            : item
        ),
      }));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow="房源大厅"
        title="筛选南昌二手房挂牌"
        description="按价格、面积、户型和区域快速定位目标房源，保留收藏、分页与详情跳转的原有流程。"
        action={data ? <Badge tone="blue">共 {data.total} 套</Badge> : null}
      />

      {data ? (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <MiniMetric label="匹配房源" value={data.total} tone="blue" />
          <MiniMetric label="覆盖区域" value={data.districts.length} tone="violet" />
          <MiniMetric label="当前显示" value={data.items.length} tone="green" />
          <MiniMetric label="当前页码" value={data.page} tone="orange" />
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <Card
          title="筛选条件"
          description="输入关键词或缩小价格、面积范围。"
          action={<SlidersHorizontal size={22} className="text-electric-blue" />}
          className="h-fit lg:sticky lg:top-6"
        >
          <form className="space-y-3" onSubmit={applyFilters}>
            <Input
              label="关键词"
              value={filters.q}
              onChange={(event) =>
                setFilters({ ...filters, q: event.target.value })
              }
              placeholder="小区 / 地址 / 标题"
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="区域"
                value={filters.district}
                onChange={(event) =>
                  setFilters({ ...filters, district: event.target.value })
                }
              >
                <option value="">全部</option>
                {(data?.districts || []).map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name}（{item.count}）
                  </option>
                ))}
              </Select>
              <Select
                label="户型"
                value={filters.rooms}
                onChange={(event) =>
                  setFilters({ ...filters, rooms: event.target.value })
                }
              >
                <option value="">不限</option>
                {[1, 2, 3, 4].map((value) => (
                  <option key={value} value={value}>
                    {value} 室
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="最低总价"
                type="number"
                min={0}
                value={filters.minPrice}
                onChange={(event) =>
                  setFilters({ ...filters, minPrice: event.target.value })
                }
                placeholder="万元"
              />
              <Input
                label="最高总价"
                type="number"
                min={0}
                value={filters.maxPrice}
                onChange={(event) =>
                  setFilters({ ...filters, maxPrice: event.target.value })
                }
                placeholder="万元"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="最小面积"
                type="number"
                min={0}
                value={filters.minArea}
                onChange={(event) =>
                  setFilters({ ...filters, minArea: event.target.value })
                }
                placeholder="㎡"
              />
              <Input
                label="最大面积"
                type="number"
                min={0}
                value={filters.maxArea}
                onChange={(event) =>
                  setFilters({ ...filters, maxArea: event.target.value })
                }
                placeholder="㎡"
              />
            </div>
            <Select
              label="排序"
              value={filters.sort}
              onChange={(event) =>
                setFilters({ ...filters, sort: event.target.value })
              }
            >
              <option value="newest">最新上架</option>
              <option value="price_asc">总价从低到高</option>
              <option value="price_desc">总价从高到低</option>
              <option value="area_desc">面积从大到小</option>
              <option value="followers_desc">关注人数最多</option>
              <option value="listing_asc">挂牌时间最短</option>
            </Select>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Button type="submit" icon={Search}>
                应用
              </Button>
              <Button
                type="button"
                variant="secondary"
                icon={FilterX}
                onClick={clearFilters}
              >
                重置
              </Button>
            </div>
          </form>
        </Card>

        <div>
          {error ? <EmptyState title="加载失败" description={error} /> : null}
          {loading ? <Spinner label="正在筛选房源..." /> : null}
          {!loading && !error && data?.items?.length ? (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {data.items.map((house) => (
                  <HouseCard
                    key={house.id}
                    house={house}
                    onToggleFavorite={toggleFavorite}
                  />
                ))}
              </div>
              <div className="mt-5">
                <Pagination
                  page={data.page}
                  perPage={data.per_page}
                  total={data.total}
                  onChange={setPage}
                />
              </div>
            </>
          ) : null}
          {!loading && !error && data?.items?.length === 0 ? (
            <EmptyState
              title="没有匹配的房源"
              description="尝试放宽价格、面积或区域条件。"
              action={
                <Button variant="secondary" onClick={clearFilters}>
                  清除全部条件
                </Button>
              }
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

const miniTones = {
  blue: {
    text: "text-electric-blue",
    dot: "bg-electric-blue",
    bar: "linear-gradient(90deg, var(--color-electric-blue), var(--color-sky-blue))",
  },
  violet: {
    text: "text-lavender",
    dot: "bg-lavender",
    bar: "linear-gradient(90deg, var(--color-lavender), var(--color-sky-blue))",
  },
  green: {
    text: "text-vivid-green",
    dot: "bg-vivid-green",
    bar: "linear-gradient(90deg, var(--color-vivid-green), var(--color-mint))",
  },
  orange: {
    text: "text-tangerine",
    dot: "bg-tangerine",
    bar: "linear-gradient(90deg, var(--color-tangerine), var(--color-gold))",
  },
};

function MiniMetric({ label, value, tone = "blue" }) {
  const t = miniTones[tone] || miniTones.blue;
  return (
    <div className="panel relative overflow-hidden p-4">
      <span
        className="absolute inset-x-0 top-0 h-1"
        style={{ background: t.bar }}
        aria-hidden="true"
      />
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm font-semibold text-slate">
          <span className={`h-2 w-2 rounded-full ${t.dot}`} />
          {label}
        </span>
        <span className={`tabular text-2xl font-semibold ${t.text}`}>
          {value}
        </span>
      </div>
    </div>
  );
}
