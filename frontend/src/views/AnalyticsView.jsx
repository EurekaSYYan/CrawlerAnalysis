import {
  BarChart3,
  Building2,
  CircleDollarSign,
  Clock3,
  Gauge,
  HeartPulse,
  Layers,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { api } from "../api/client.js";
import {
  barChartOption,
  districtBubbleOption,
  dualAxisBarLineOption,
  EChart,
  pieChartOption,
  scatterChartOption,
} from "../components/Charts.jsx";
import {
  Badge,
  Card,
  EmptyState,
  PageHero,
  Spinner,
  StatCard,
} from "../components/ui.jsx";
import { formatNumber, formatPerSqm, formatWan } from "../utils/format.js";

export default function AnalyticsView() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [areaLog, setAreaLog] = useState(false);

  useEffect(() => {
    api
      .get("/analytics/summary")
      .then(setData)
      .catch((err) => setError(err.message));
  }, []);

  const districtOption = useMemo(() => {
    if (!data || data.districts.length === 0) return null;
    const districts = [...data.districts]
      .filter((item) => item.avg_price_per_sqm)
      .sort((a, b) => a.avg_price_per_sqm - b.avg_price_per_sqm);
    const values = districts.map((item) => item.avg_price_per_sqm);
    const min = Math.min(...values);
    const max = Math.max(...values);
    return barChartOption({
      horizontal: true,
      xAxis: districts.map((item) => item.district),
      series: [
        {
          name: "平均单价",
          data: values,
          itemStyle: {
            color: (params) => {
              const ratio =
                (values[params.dataIndex] - min) / Math.max(1, max - min);
              return `rgba(43, 89, 209, ${0.35 + ratio * 0.65})`;
            },
            borderRadius: [0, 6, 6, 0],
          },
        },
      ],
      unit: " 元/㎡",
    });
  }, [data]);

  const districtBubble = useMemo(() => {
    if (!data || data.districts.length === 0) return null;
    return districtBubbleOption({
      districts: data.districts,
      avgPrice: data.summary.avg_price_per_sqm,
    });
  }, [data]);

  const roomOption = useMemo(() => {
    if (!data || data.room_types.length === 0) return null;
    return pieChartOption({
      name: "户型占比",
      data: data.room_types
        .filter((item) => item.count > 0)
        .map((item) => ({
          name: item.label,
          value: item.count,
        })),
    });
  }, [data]);

  const binOption = useMemo(() => {
    if (!data || data.price_bins.length === 0) return null;
    return barChartOption({
      xAxis: data.price_bins.map((item) => item.label),
      series: [
        {
          name: "房源数量",
          data: data.price_bins.map((item) => item.count),
          color: "#2b59d1",
        },
      ],
    });
  }, [data]);

  const areaScatter = useMemo(() => {
    if (!data || data.area_price_scatter.length === 0) return null;
    return scatterChartOption({
      points: data.area_price_scatter,
      xKey: "area",
      yKey: "price_total",
      xName: "建筑面积",
      yName: "挂牌总价",
      xUnit: " ㎡",
      yUnit: " 元",
      yLog: areaLog,
      sizeKey: "followers_count",
      regression: true,
      tooltipLines: (raw) => [
        `单价：${formatPerSqm(raw.price_per_sqm)}`,
        `户型：${raw.rooms ?? "—"}室`,
        `装修：${raw.decoration || "—"}`,
        `建筑类型：${raw.building_type || "—"}`,
      ],
    });
  }, [data, areaLog]);

  const lifecycleOption = useMemo(() => {
    if (!data || data.listing_lifecycle.length === 0) return null;
    return dualAxisBarLineOption({
      xAxis: data.listing_lifecycle.map((item) => item.label),
      barData: data.listing_lifecycle.map((item) => item.count),
      lineData: data.listing_lifecycle.map((item) => item.avg_price_per_sqm),
      barName: "挂牌量",
      lineName: "平均单价",
      lineUnit: " 元/㎡",
      barColor: "#0f9d76",
      lineColor: "#2b59d1",
    });
  }, [data]);

  const floorOption = useMemo(() => {
    if (!data || data.floor_analysis.length === 0) return null;
    return dualAxisBarLineOption({
      xAxis: data.floor_analysis.map((item) => item.label),
      barData: data.floor_analysis.map((item) => item.count),
      lineData: data.floor_analysis.map((item) => item.avg_price_per_sqm),
      barName: "挂牌量",
      lineName: "平均单价",
      lineUnit: " 元/㎡",
      barColor: "#8d99d8",
      lineColor: "#0f9d76",
    });
  }, [data]);

  const buildingTypeOption = useMemo(() => {
    if (!data || data.building_types.length === 0) return null;
    return pieChartOption({
      name: "建筑类型占比",
      data: data.building_types
        .filter((item) => item.count > 0)
        .map((item) => ({
          name: item.label,
          value: item.count,
        })),
    });
  }, [data]);

  const topDistrict = useMemo(() => {
    if (!data || data.districts.length === 0) return null;
    return [...data.districts].sort(
      (a, b) => b.avg_price_per_sqm - a.avg_price_per_sqm
    )[0];
  }, [data]);

  if (error) {
    return <EmptyState title="分析数据加载失败" description={error} />;
  }
  if (!data) {
    return <Spinner label="正在计算南昌真实房源指标..." />;
  }

  const summary = data.summary;
  return (
    <div className="space-y-5">
      <PageHero
        eyebrow="数据分析"
        title="南昌二手房真实挂牌透视"
        description={`基于链家南昌 ${summary.total_houses} 条真实挂牌，从总价、单价、区域、户型、面积、装修与楼层观察市场结构。`}
        action={<Badge tone="blue">真实数据 {summary.total_houses} 条</Badge>}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
        <StatCard
          label="挂牌房源"
          value={formatNumber(summary.total_houses)}
          tone="blue"
          hint="真实链家样本"
        />
        <StatCard
          label="覆盖区域"
          value={summary.total_districts}
          tone="violet"
          hint="商圈数量"
        />
        <StatCard
          label="平均总价"
          value={formatWan(summary.avg_price_total)}
          tone="orange"
          hint="挂牌均值"
        />
        <StatCard
          label="中位总价"
          value={formatWan(summary.median_price_total)}
          tone="green"
          hint="更接近中间市场"
        />
        <StatCard
          label="平均单价"
          value={formatNumber(summary.avg_price_per_sqm)}
          tone="neutral"
          hint="元/㎡"
        />
        <StatCard
          label="平均关注"
          value={formatNumber(summary.avg_followers_count)}
          tone="blue"
          hint="每套关注人数"
        />
        <StatCard
          label="平均挂牌"
          value={formatNumber(summary.avg_listing_days)}
          tone="violet"
          hint="挂牌天数"
        />
        <StatCard
          label="热门挂牌"
          value={`${(summary.hot_listing_ratio * 100).toFixed(1)}%`}
          tone="orange"
          hint="关注 ≥ 200 人"
        />
      </div>

      <Card
        title="相关性洞察"
        description="关注人数与总价之间的相关系数，负值表示高关注未必对应高总价。"
        action={<HeartPulse size={22} className="text-lavender" />}
      >
        <div className="grid gap-3">
          <InsightRow
            label="关注 × 总价"
            value={formatCorrelation(summary.correlation_attention_price)}
            tone="blue"
          />
          <InsightRow
            label="样本密度"
            value={`${formatNumber(summary.total_houses)} 套`}
            tone="green"
          />
          <InsightRow
            label="区域跨度"
            value={`${summary.total_districts} 个商圈`}
            tone="violet"
          />
          {topDistrict ? (
            <InsightRow
              label="高价区域"
              value={`${topDistrict.district} ${formatNumber(topDistrict.avg_price_per_sqm)}/㎡`}
              tone="orange"
            />
          ) : null}
        </div>
      </Card>

      <Card
        title="面积 × 总价散点图"
        description="气泡大小表示关注人数，虚线为最小二乘趋势线；切换对数坐标可放大低总价区段。"
        action={
          <ScaleToggle value={areaLog} onChange={setAreaLog} label="总价坐标" />
        }
        className="chart-card"
      >
        {areaScatter ? (
          <EChart option={areaScatter} height={340} cruise />
        ) : (
          <EmptyState title="暂无面积数据" />
        )}
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card
          title="挂牌生命周期"
          description="按挂牌天数分组，柱形为挂牌量，折线为该区间平均单价。"
          action={<Clock3 size={22} className="text-vivid-green" />}
          className="chart-card"
        >
          {lifecycleOption ? (
            <EChart option={lifecycleOption} height={320} cruise />
          ) : (
            <EmptyState title="暂无挂牌天数数据" />
          )}
        </Card>
        <Card
          title="楼层价格分层"
          description="低 / 中 / 高楼层挂牌量与平均单价对比。"
          action={<Layers size={22} className="text-lavender" />}
          className="chart-card"
        >
          {floorOption ? (
            <EChart option={floorOption} height={320} cruise />
          ) : (
            <EmptyState title="暂无楼层数据" />
          )}
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card
          title="建筑类型分布"
          description="板楼、塔楼、板塔结合等建筑类型的挂牌占比。"
          action={<Building2 size={22} className="text-lavender" />}
        >
          {buildingTypeOption ? (
            <EChart option={buildingTypeOption} height={320} cruise />
          ) : (
            <EmptyState title="暂无建筑类型数据" />
          )}
        </Card>
        <Card
          title="区域市场重心气泡图"
          description="纵轴为商圈平均单价，气泡大小表示挂牌样本量，虚线标出全市均价。"
          action={<CircleDollarSign size={22} className="text-lavender" />}
          className="chart-card"
        >
          {districtBubble ? (
            <EChart option={districtBubble} height={320} cruise />
          ) : (
            <EmptyState title="暂无区域气泡数据" />
          )}
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card
          title="商圈平均单价"
          description="按挂牌单价从低到高排列。"
          action={<Gauge size={22} className="text-electric-blue" />}
          className="chart-card"
        >
          {districtOption ? (
            <EChart option={districtOption} height={320} cruise />
          ) : (
            <EmptyState title="暂无区域数据" />
          )}
        </Card>
        <div className="grid gap-4">
          <Card
            title="户型结构占比"
            description="按房间数量统计挂牌房源比例。"
            action={<BarChart3 size={22} className="text-vivid-green" />}
          >
            {roomOption ? (
              <EChart option={roomOption} height={280} cruise />
            ) : (
              <EmptyState title="暂无户型数据" />
            )}
          </Card>
          <Card
            title="总价区间分布"
            description="按挂牌总价分箱统计。"
            action={<BarChart3 size={22} className="text-tangerine" />}
          >
            {binOption ? (
              <EChart option={binOption} height={280} cruise />
            ) : (
              <EmptyState title="暂无价格分箱数据" />
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}

const insightTone = {
  blue: "bg-electric-blue/16 text-electric-blue ring-1 ring-electric-blue/20",
  violet: "bg-lavender/16 text-lavender ring-1 ring-lavender/20",
  green: "bg-vivid-green/16 text-vivid-green ring-1 ring-vivid-green/20",
  orange: "bg-tangerine/16 text-tangerine ring-1 ring-tangerine/20",
};

function formatCorrelation(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  const number = Number(value);
  return `${number > 0 ? "+" : ""}${number.toFixed(2)}`;
}

function InsightRow({ label, value, tone }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/6 px-3 py-3">
      <span className="text-sm font-medium text-slate">{label}</span>
      <span
        className={`rounded-full px-3 py-1 text-sm font-semibold ${insightTone[tone]}`}
      >
        {value}
      </span>
    </div>
  );
}

function ScaleToggle({ value, onChange, label }) {
  return (
    <div className="flex items-center gap-2">
      <span className="hidden text-xs font-medium text-slate sm:inline">
        {label}
      </span>
      <div className="flex rounded-full border border-white/10 bg-white/6 p-1 backdrop-blur">
        {[
          { key: false, label: "线性" },
          { key: true, label: "对数" },
        ].map((option) => (
          <button
            key={option.label}
            type="button"
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-all ${
              value === option.key
                ? "bg-lake-blue text-white shadow-sm"
                : "text-slate hover:text-white"
            }`}
            onClick={() => onChange(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
