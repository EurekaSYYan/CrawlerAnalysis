import { Activity, AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { api } from "../api/client.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { barChartOption, EChart } from "../components/Charts.jsx";
import HouseCard from "../components/HouseCard.jsx";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  PageHero,
  Spinner,
  StatCard,
} from "../components/ui.jsx";
import { formatDate, formatNumber, formatPerSqm, formatWan } from "../utils/format.js";

const statusTone = {
  success: "green",
  running: "blue",
  partial: "orange",
  failed: "orange",
};

const statusLabel = {
  success: "成功",
  running: "运行中",
  partial: "部分成功",
  failed: "失败",
};

export default function DashboardView() {
  const { user } = useAuth();
  const isAdmin = user.role === "admin";
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/dashboard")
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  const districtOption = useMemo(() => {
    const districts = data?.districts || data?.market?.districts || [];
    if (districts.length === 0) return null;
    return barChartOption({
      xAxis: districts.map((item) => item.district),
      series: [
        {
          name: "房源数量",
          data: districts.map((item) => item.count),
          color: "#7c3aed",
        },
      ],
    });
  }, [data]);

  if (error) {
    return <EmptyState title="大盘加载失败" description={error} />;
  }
  if (!data) {
    return <Spinner label="正在读取大盘数据…" />;
  }

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="南昌二手房数据大盘"
        title={isAdmin ? "系统运行总览" : "市场脉搏"}
        description={
          isAdmin
            ? "集中查看用户、房源、采集与价格指标。"
            : "关注挂牌规模、区域价格与真实房源样本。"
        }
        action={
          <Badge tone={isAdmin ? "violet" : "blue"}>
            {new Date().toLocaleDateString("zh-CN")}
          </Badge>
        }
      />

      {isAdmin ? (
        <AdminDashboard
          data={data}
          districtOption={districtOption}
        />
      ) : (
        <UserDashboard
          data={data}
          districtOption={districtOption}
        />
      )}
    </div>
  );
}

function AdminDashboard({ data, districtOption }) {
  const metrics = [
    { label: "用户总数", value: data.metrics.user_count, tone: "blue" },
    { label: "房源总数", value: data.metrics.house_count, tone: "violet" },
    { label: "收藏总数", value: data.metrics.favorite_count, tone: "green" },
    {
      label: "平均总价",
      value: formatWan(data.metrics.avg_price),
      tone: "orange",
    },
    {
      label: "平均单价",
      value: formatNumber(data.metrics.avg_price_per_sqm),
      hint: "元/㎡",
      tone: "neutral",
    },
  ];
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {metrics.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.35fr]">
        <Card
          title="采集状态"
          description="最近一次爬虫运行记录"
          action={<Activity size={22} className="text-electric-blue" />}
        >
          {data.metrics.latest_crawl ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge tone={statusTone[data.metrics.latest_crawl.status]}>
                  {statusLabel[data.metrics.latest_crawl.status]}
                </Badge>
                <span className="font-mono text-xs text-slate">
                  {data.metrics.latest_crawl.source}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <StatBlock label="发现" value={data.metrics.latest_crawl.total_found} />
                <StatBlock
                  label="入库"
                  value={data.metrics.latest_crawl.total_imported}
                />
              </div>
              <p className="text-xs text-slate">
                开始于 {formatDate(data.metrics.latest_crawl.started_at)}
              </p>
            </div>
          ) : (
            <EmptyState title="暂无采集记录" description="在控制台触发一次链家采集。" />
          )}
        </Card>
        <Card
          title="区域房源分布"
          description="各行政区挂牌量"
          action={<Link to="/houses">查看房源大厅 →</Link>}
        >
          {districtOption ? (
            <EChart option={districtOption} height={260} />
          ) : (
            <EmptyState title="暂无区域数据" />
          )}
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-1">
        <Card title="最近采集记录">
          {data.crawl_runs.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-130 text-left text-base">
                <thead>
                  <tr className="border-b border-white/10 text-sm text-slate">
                    <th className="py-2 pr-3 font-medium">来源</th>
                    <th className="py-2 pr-3 font-medium">状态</th>
                    <th className="py-2 pr-3 font-medium">发现</th>
                    <th className="py-2 pr-3 font-medium">入库</th>
                    <th className="py-2 font-medium">时间</th>
                  </tr>
                </thead>
                <tbody>
                  {data.crawl_runs.map((run) => (
                    <tr key={run.id} className="border-b border-white/10 last:border-0">
                      <td className="py-3 pr-3 font-mono text-sm">{run.source}</td>
                      <td className="py-2.5 pr-3">
                        <Badge tone={statusTone[run.status]}>
                          {statusLabel[run.status]}
                        </Badge>
                      </td>
                      <td className="tabular py-2.5 pr-3">{run.total_found}</td>
                      <td className="tabular py-2.5 pr-3">{run.total_imported}</td>
                      <td className="py-3 text-sm text-slate">
                        {formatDate(run.started_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState title="暂无采集记录" />
          )}
        </Card>
      </div>

      <Card title="最近入库房源" action={<Link to="/houses">全部房源 →</Link>}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {data.recent_houses.map((house) => (
            <Link
              key={house.id}
              to={`/houses/${house.id}`}
              className="panel hover-lift p-3"
            >
              <p className="line-clamp-2 text-base font-semibold text-charcoal">
                {house.title}
              </p>
              <p className="tabular mt-2 text-xl font-bold text-electric-blue">
                {formatWan(house.price_total)}
              </p>
              <p className="mt-1 text-xs text-slate">
                {house.district} · {house.area}㎡
              </p>
            </Link>
          ))}
        </div>
      </Card>
    </>
  );
}

function UserDashboard({ data, districtOption }) {
  const marketAvg = data.market.avg_price_per_sqm;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="挂牌房源"
          value={data.market.total_houses}
          hint="当前库内总数"
          tone="blue"
        />
        <StatCard
          label="平均总价"
          value={formatWan(data.market.avg_price)}
          hint="全城挂牌均值"
          tone="violet"
        />
        <StatCard
          label="平均单价"
          value={formatNumber(data.market.avg_price_per_sqm)}
          hint="元/㎡"
          tone="green"
        />
        <StatCard
          label="覆盖区域"
          value={data.market.districts.length}
          hint="个行政区"
          tone="orange"
        />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-charcoal">区域脉搏</h2>
          <p className="mt-0.5 text-xs text-slate">
              横向滚动查看各行政区挂牌均价相对城市均值的偏差。
            </p>
          </div>
          <Badge tone="blue">价格脉冲</Badge>
        </div>
        <div className="pulse-scroll flex gap-3 overflow-x-auto pb-2">
          {data.market.districts
            .filter((item) => item.district && item.district !== "未知")
            .map((item) => {
            const delta = marketAvg
              ? ((item.avg_price_per_sqm - marketAvg) / marketAvg) * 100
              : 0;
            return (
              <div key={item.district} className="panel hover-lift min-w-56 shrink-0 p-5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-base font-bold text-charcoal">
                    {item.district}
                  </span>
                  <Badge tone={delta >= 0 ? "green" : "orange"}>
                    {delta >= 0 ? "+" : ""}
                    {delta.toFixed(1)}%
                  </Badge>
                </div>
                <p className="tabular mt-3 text-2xl font-bold text-charcoal">
                  {formatNumber(item.avg_price_per_sqm)}
                </p>
                <p className="mt-1 text-xs text-slate">
                  元/㎡ · {item.count} 套
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-charcoal">热门房源推荐</h2>
            <p className="mt-0.5 text-xs text-slate">
              最近更新的高关注度挂牌，点击进入详情。
            </p>
          </div>
          <Link
            to="/houses"
            className="focus-ring inline-flex items-center rounded-xl border border-white/10 bg-white/6 px-4 py-2.5 text-base font-semibold text-charcoal hover:bg-white/10 hover:shadow-sm"
          >
            全部房源
          </Link>
        </div>
        {data.hot_houses.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.hot_houses.map((house) => (
              <HouseCard key={house.id} house={house} />
            ))}
          </div>
        ) : (
          <EmptyState title="暂无热门房源" />
        )}
      </section>
    </>
  );
}

function StatBlock({ label, value }) {
  return (
    <div className="rounded-xl bg-white/6 p-4 ring-1 ring-white/10">
      <p className="text-sm font-semibold text-slate">{label}</p>
      <p className="tabular mt-1 text-2xl font-bold text-charcoal">{value}</p>
    </div>
  );
}
