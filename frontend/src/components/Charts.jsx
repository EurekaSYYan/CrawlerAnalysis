import * as echarts from "echarts";
import { useEffect, useMemo, useRef } from "react";

import { useTheme } from "../theme/ThemeContext.jsx";

const palette = {
  blue: "#5b8cff",
  blueDeep: "#4a73ee",
  cyan: "#22d3ee",
  green: "#34d399",
  orange: "#ff9b58",
  violet: "#9aa6ff",
  amber: "#f0c969",
  pink: "#ff8a72",
  coral: "#ff8a72",
  mint: "#49d6ae",
  gold: "#f0c969",
  sky: "#79a8ff",
};

/* Semantic chart tokens — resolved per active theme before rendering */
const themeTokens = {
  dark: {
    ink: "#e5e7eb",
    fog: "#94a3b8",
    silver: "#64748b",
    grid: "#334155",
    paper: "#111827",
    tooltipBg: "rgba(15, 23, 42, 0.96)",
    tooltipBorder: "rgba(148, 163, 184, 0.18)",
    tooltipText: "#ffffff",
    tooltipShadow: "rgba(3, 7, 18, 0.38)",
  },
  light: {
    ink: "#1c222f",
    fog: "#5e6f81",
    silver: "#94a3b8",
    grid: "#d8dde5",
    paper: "#ffffff",
    tooltipBg: "rgba(255, 255, 255, 0.97)",
    tooltipBorder: "rgba(23, 32, 48, 0.14)",
    tooltipText: "#1c222f",
    tooltipShadow: "rgba(15, 23, 42, 0.18)",
  },
};

const semantic = (key) => `@sem:${key}`;

function resolveThemeOption(option, theme) {
  const tokens = themeTokens[theme] || themeTokens.dark;
  const resolveString = (value) =>
    value.replace(/@sem:([A-Za-z0-9_]+)/g, (_, key) => tokens[key] ?? `@sem:${key}`);
  const clone = (value) => {
    if (typeof value === "string") return resolveString(value);
    if (Array.isArray(value)) return value.map(clone);
    if (value && typeof value === "object") {
      // Keep class instances (e.g. echarts gradients) untouched.
      if (value.constructor !== Object) return value;
      const result = {};
      for (const key of Object.keys(value)) {
        result[key] = clone(value[key]);
      }
      return result;
    }
    return value;
  };
  return clone(option);
}

export function EChart({
  option,
  height = 280,
  className = "",
  cruise = false,
  cruiseInterval = 2600,
}) {
  const ref = useRef(null);
  const { theme } = useTheme();
  const resolvedOption = useMemo(
    () => resolveThemeOption(option, theme),
    [option, theme]
  );
  useEffect(() => {
    if (!ref.current) return undefined;
    const chart = echarts.init(ref.current);
    chart.setOption(resolvedOption, true);

    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(() => {
        if (!chart.isDisposed()) chart.resize();
      });
    });
    observer.observe(ref.current);

    let timer = null;
    let dataIndex = 0;
    let paused = false;
    const stopCruise = () => {
      if (timer) window.clearInterval(timer);
      timer = null;
    };
    const startCruise = () => {
      if (!cruise) return;
      stopCruise();
      timer = window.setInterval(() => {
        if (paused) return;
        const firstSeries = resolvedOption.series?.[0];
        const count = firstSeries?.data?.length || 0;
        if (!count) return;
        dataIndex = (dataIndex + 1) % count;
        chart.dispatchAction({
          type: "showTip",
          seriesIndex: 0,
          dataIndex,
        });
      }, cruiseInterval);
    };
    const handleMouseOver = () => {
      paused = true;
      stopCruise();
    };
    const handleMouseOut = () => {
      paused = false;
      startCruise();
    };

    chart.on("mouseover", handleMouseOver);
    chart.on("mouseout", handleMouseOut);
    startCruise();

    return () => {
      stopCruise();
      chart.off("mouseover", handleMouseOver);
      chart.off("mouseout", handleMouseOut);
      observer.disconnect();
      chart.dispose();
    };
  }, [resolvedOption, cruise, cruiseInterval]);

  return (
    <div className={`chart-stage relative ${className}`} style={{ height }}>
      <div className="chart-stage-bg" aria-hidden="true" />
      <div ref={ref} className="relative z-10 h-full w-full" />
    </div>
  );
}

const baseGrid = {
  left: 16,
  right: 16,
  top: 36,
  bottom: 12,
  containLabel: true,
};

const baseTooltip = {
  trigger: "axis",
  backgroundColor: semantic("tooltipBg"),
  borderColor: semantic("tooltipBorder"),
  borderWidth: 1,
  textStyle: { color: semantic("tooltipText"), fontSize: 13 },
  padding: [10, 14],
  extraCssText:
    "box-shadow: 0 18px 44px @sem:tooltipShadow; border-radius: 14px; backdrop-filter: blur(10px);",
};

const axisLabel = { color: semantic("fog"), fontSize: 12, fontWeight: 500 };
const valueAxisLabel = {
  ...axisLabel,
  formatter: (value) => Number(value).toLocaleString(),
};
const splitLine = {
  lineStyle: { color: semantic("grid"), type: "dashed" },
};
const animation = {
  animation: true,
  animationDuration: 900,
  animationDurationUpdate: 520,
  animationEasing: "cubicOut",
  animationEasingUpdate: "cubicInOut",
};

function formatAxisValue(value, formatter, unit = "") {
  const number = Number(value);
  if (typeof formatter === "function") return formatter(number);
  return `${Number.isFinite(number) ? number.toLocaleString() : "—"}${unit}`;
}

export function barChartOption({
  xAxis,
  series,
  unit = "",
  horizontal = false,
}) {
  return {
    ...animation,
    color: [palette.blue, palette.cyan, palette.violet, palette.orange],
    tooltip: {
      ...baseTooltip,
      valueFormatter: (value) => `${Number(value).toLocaleString()}${unit}`,
    },
    grid: baseGrid,
    xAxis: horizontal
      ? {
          type: "value",
          scale: true,
          axisLabel: valueAxisLabel,
          splitLine,
        }
      : {
          type: "category",
          data: xAxis,
          axisLine: { lineStyle: { color: semantic("grid") } },
          axisTick: { show: false },
          axisLabel,
        },
    yAxis: horizontal
      ? {
          type: "category",
          data: xAxis,
          axisLine: { lineStyle: { color: semantic("grid") } },
          axisTick: { show: false },
          axisLabel,
        }
      : {
          type: "value",
          scale: true,
          boundaryGap: ["8%", "12%"],
          axisLabel: valueAxisLabel,
          splitLine,
        },
    series: series.map((item) => {
      const color = item.color || palette.blue;
      const barColor =
        typeof color === "string"
          ? new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color },
              { offset: 1, color: `${color}24` },
            ])
          : color;
      return {
        type: "bar",
        barMaxWidth: 32,
        animationDelay: (params) => (params?.dataIndex || 0) * 45,
        itemStyle: {
          borderRadius: horizontal ? [0, 8, 8, 0] : [8, 8, 0, 0],
          color: barColor,
        },
        emphasis: {
          focus: "series",
          itemStyle: { shadowBlur: 18, shadowColor: "rgba(43,89,209,.28)" },
        },
        markLine:
          item.markLine === false
            ? undefined
            : {
                symbol: "none",
                label: {
                  color: semantic("fog"),
                  formatter: "均值",
                  fontSize: 11,
                },
                lineStyle: { color: semantic("silver"), type: "dashed" },
                data: [{ type: "average" }],
              },
        ...item,
      };
    }),
  };
}

export function pieChartOption({ data, name = "占比" }) {
  const total = data.reduce((sum, item) => sum + Number(item.value || 0), 0);
  return {
    ...animation,
    color: [
      palette.blue,
      palette.cyan,
      palette.green,
      palette.orange,
      palette.violet,
      palette.coral,
      palette.gold,
    ],
    tooltip: {
      ...baseTooltip,
      trigger: "item",
      valueFormatter: (value) => `${Number(value).toLocaleString()} 套`,
    },
    legend: {
      bottom: 0,
      icon: "circle",
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 14,
      textStyle: axisLabel,
    },
    series: [
      {
        name,
        type: "pie",
        radius: ["50%", "74%"],
        center: ["50%", "44%"],
        avoidLabelOverlap: true,
        itemStyle: {
          borderColor: semantic("paper"),
          borderWidth: 3,
          shadowBlur: 20,
          shadowColor: "rgba(43,89,209,.16)",
        },
        label: {
          color: semantic("ink"),
          fontSize: 12,
          fontWeight: 600,
          formatter: "{b} {c}",
        },
        emphasis: {
          scaleSize: 8,
          itemStyle: { shadowBlur: 26, shadowColor: "rgba(15,157,118,.26)" },
        },
        data,
      },
      {
        type: "pie",
        radius: ["0%", "32%"],
        center: ["50%", "44%"],
        silent: true,
        label: {
          position: "center",
          formatter: `{total|${total.toLocaleString()}}\n{label|总套数}`,
          rich: {
            total: {
              color: semantic("ink"),
              fontSize: 24,
              fontWeight: 700,
              lineHeight: 30,
            },
            label: { color: semantic("fog"), fontSize: 12, lineHeight: 18 },
          },
        },
        itemStyle: { color: "transparent" },
        data: [{ value: 1 }],
      },
    ],
  };
}

export function districtBubbleOption({ districts, avgPrice }) {
  const sorted = [...districts]
    .filter((item) => item.avg_price_per_sqm && item.count)
    .sort((a, b) => b.avg_price_per_sqm - a.avg_price_per_sqm);
  const counts = sorted.map((item) => item.count);
  const minCount = counts.length ? Math.min(...counts) : 0;
  const maxCount = counts.length ? Math.max(...counts) : 1;
  return {
    ...animation,
    tooltip: {
      ...baseTooltip,
      formatter: (params) => {
        const item = Array.isArray(params) ? params[0]?.data : params.data;
        return `${item[3]}<br/>平均单价：${Number(item[1]).toLocaleString()} 元/㎡<br/>平均总价：${Number(item[4]).toLocaleString()} 万<br/>样本量：${item[2]} 套`;
      },
    },
    grid: { ...baseGrid, top: 24, bottom: 26, right: 24 },
    xAxis: {
      type: "category",
      data: sorted.map((item) => item.district),
      axisLine: { lineStyle: { color: semantic("grid") } },
      axisTick: { show: false },
      axisLabel: { ...axisLabel, rotate: sorted.length > 8 ? 30 : 0 },
    },
    yAxis: {
      type: "value",
      name: "元/㎡",
      scale: true,
      boundaryGap: ["10%", "12%"],
      nameTextStyle: { color: semantic("fog"), fontSize: 12, fontWeight: 600 },
      axisLabel: valueAxisLabel,
      splitLine,
    },
    series: [
      {
        name: "区域市场位置",
        type: "scatter",
        data: sorted.map((item, index) => [
          index,
          item.avg_price_per_sqm,
          item.count,
          item.district,
          Math.round(item.avg_price_total / 10000),
          item.avg_area,
        ]),
        symbolSize: (value) => {
          const ratio =
            (value[2] - minCount) / Math.max(1, maxCount - minCount);
          return 18 + ratio * 34;
        },
        itemStyle: {
          color: new echarts.graphic.RadialGradient(0.35, 0.35, 0.9, [
            { offset: 0, color: "rgba(255,255,255,.95)" },
            { offset: 0.26, color: "rgba(96,165,250,.92)" },
            { offset: 0.62, color: "rgba(34,211,238,.86)" },
            { offset: 1, color: "rgba(141,153,216,.78)" },
          ]),
          borderColor: "rgba(255,255,255,.9)",
          borderWidth: 2,
          shadowBlur: 24,
          shadowColor: "rgba(43,89,209,.24)",
        },
        label: {
          show: true,
          position: "top",
          color: semantic("fog"),
          fontSize: 11,
          formatter: (params) =>
            params.value[2] >= maxCount * 0.6 ? params.value[3] : "",
        },
        emphasis: {
          scale: true,
          label: { show: true, color: semantic("ink"), fontWeight: 700 },
          itemStyle: { shadowBlur: 32, shadowColor: "rgba(43,89,209,.36)" },
        },
        markLine: {
          symbol: "none",
          label: {
            color: semantic("fog"),
            formatter: "全市均价",
            fontSize: 11,
          },
          lineStyle: {
            color: palette.orange,
            type: "dashed",
            width: 1.5,
          },
          data: [{ yAxis: avgPrice || 0 }],
        },
      },
    ],
  };
}

const scatterPalette = [
  palette.blue,
  palette.cyan,
  palette.green,
  palette.orange,
  palette.violet,
  palette.coral,
  palette.gold,
  palette.pink,
  palette.blueDeep,
  "#3aa8a0",
];

function linearFit(points, xKey, yKey) {
  const pairs = points
    .map((point) => [Number(point[xKey]), Number(point[yKey])])
    .filter(
      ([x, y]) =>
        Number.isFinite(x) &&
        Number.isFinite(y) &&
        x > 0 &&
        y > 0
    );
  if (pairs.length < 3) return null;
  const meanX = pairs.reduce((sum, [x]) => sum + x, 0) / pairs.length;
  const meanY = pairs.reduce((sum, [, y]) => sum + y, 0) / pairs.length;
  let numerator = 0;
  let denominator = 0;
  for (const [x, y] of pairs) {
    numerator += (x - meanX) * (y - meanY);
    denominator += (x - meanX) ** 2;
  }
  if (denominator === 0) return null;
  const slope = numerator / denominator;
  const intercept = meanY - slope * meanX;
  const minX = Math.min(...pairs.map(([x]) => x));
  const maxX = Math.max(...pairs.map(([x]) => x));
  return {
    slope,
    intercept,
    minX,
    maxX,
    minY: slope * minX + intercept,
    maxY: slope * maxX + intercept,
  };
}

export function scatterChartOption({
  points,
  xKey,
  yKey,
  xName = "",
  yName = "",
  xUnit = "",
  yUnit = "",
  xLog = false,
  yLog = false,
  sizeKey = null,
  tooltipLines = null,
  regression = false,
}) {
  const districtColors = {};
  const valid = points.filter((point) => {
    const x = Number(point[xKey]);
    const y = Number(point[yKey]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
    if (xLog && x <= 0) return false;
    if (yLog && y <= 0) return false;
    return true;
  });
  const data = valid.map((point) => {
    const district = point.district || "未知";
    if (!districtColors[district]) {
      districtColors[district] =
        scatterPalette[Object.keys(districtColors).length % scatterPalette.length];
    }
    const sizeValue = sizeKey ? Number(point[sizeKey]) || 0 : 14;
    const size = Math.max(9, Math.min(34, sizeValue / 8));
    return {
      value: [Number(point[xKey]), Number(point[yKey]), size],
      raw: point,
      itemStyle: {
        color: districtColors[district],
        shadowBlur: 10,
        shadowColor: "rgba(43,89,209,.22)",
      },
    };
  });

  const fit = regression ? linearFit(valid, xKey, yKey) : null;
  const series = [
    {
      name: `${xName} × ${yName}`,
      type: "scatter",
      data,
      symbolSize: (params) => params.value?.[2] || 12,
      emphasis: {
        scale: 1.6,
        itemStyle: {
          shadowBlur: 22,
          shadowColor: "rgba(43,89,209,.4)",
        },
      },
      tooltip: {
        trigger: "item",
        formatter: (params) => {
          const raw = params.data?.raw || {};
          const lines = [
            `<b>${raw.district || "未知区域"}</b>`,
            `${xName}：${formatAxisValue(raw[xKey], null, xUnit)}`,
            `${yName}：${formatAxisValue(raw[yKey], null, yUnit)}`,
          ];
          if (typeof tooltipLines === "function") {
            lines.push(...tooltipLines(raw));
          }
          return lines.join("<br/>");
        },
      },
    },
  ];

  if (fit) {
    series.push({
      name: "趋势线",
      type: "line",
      data: [
        [fit.minX, fit.minY],
        [fit.maxX, fit.maxY],
      ],
      symbol: "none",
      smooth: false,
      lineStyle: { color: palette.coral, width: 2, type: "dashed" },
      tooltip: { show: false },
      emphasis: { disabled: true },
    });
  }

  return {
    ...animation,
    color: scatterPalette,
    tooltip: baseTooltip,
    grid: { ...baseGrid, top: 30, bottom: 30 },
    xAxis: {
      type: xLog ? "log" : "value",
      name: xName,
      scale: true,
      boundaryGap: ["8%", "8%"],
      nameTextStyle: { color: semantic("fog"), fontSize: 12, fontWeight: 600 },
      axisLabel: {
        ...axisLabel,
        formatter: (value) => formatAxisValue(value, null, xUnit),
      },
      splitLine,
    },
    yAxis: {
      type: yLog ? "log" : "value",
      name: yName,
      scale: true,
      boundaryGap: ["10%", "12%"],
      nameTextStyle: { color: semantic("fog"), fontSize: 12, fontWeight: 600 },
      axisLabel: {
        ...axisLabel,
        formatter: (value) => formatAxisValue(value, null, yUnit),
      },
      splitLine,
    },
    series,
  };
}

export function dualAxisBarLineOption({
  xAxis,
  barData,
  lineData,
  barName,
  lineName,
  barUnit = "",
  lineUnit = "",
  barColor = palette.blue,
  lineColor = palette.orange,
}) {
  return {
    ...animation,
    color: [barColor, lineColor],
    tooltip: {
      ...baseTooltip,
      trigger: "axis",
      formatter: (params) => {
        const rows = Array.isArray(params) ? params : [params];
        return rows
          .map(
            (item) =>
              `${item.seriesName}：${Number(item.value).toLocaleString()}${
                item.seriesIndex === 1 ? lineUnit : barUnit
              }`
          )
          .join("<br/>");
      },
    },
    legend: {
      top: 0,
      right: 0,
      icon: "circle",
      itemWidth: 10,
      itemHeight: 10,
      itemGap: 14,
      textStyle: axisLabel,
    },
    grid: { ...baseGrid, top: 40 },
    xAxis: {
      type: "category",
      data: xAxis,
      axisLine: { lineStyle: { color: semantic("grid") } },
      axisTick: { show: false },
      axisLabel,
    },
    yAxis: [
      {
        type: "value",
        name: barName,
        scale: true,
        boundaryGap: ["8%", "12%"],
        nameTextStyle: { color: semantic("fog"), fontSize: 12, fontWeight: 600 },
        axisLabel: valueAxisLabel,
        splitLine,
      },
      {
        type: "value",
        name: lineName,
        scale: true,
        boundaryGap: ["10%", "12%"],
        nameTextStyle: { color: semantic("fog"), fontSize: 12, fontWeight: 600 },
        axisLabel: valueAxisLabel,
        splitLine: { show: false },
      },
    ],
    series: [
      {
        name: barName,
        type: "bar",
        data: barData,
        barMaxWidth: 30,
        animationDelay: (params) => (params?.dataIndex || 0) * 50,
        itemStyle: {
          borderRadius: [8, 8, 0, 0],
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: barColor },
            { offset: 1, color: `${barColor}24` },
          ]),
        },
        emphasis: {
          focus: "series",
          itemStyle: { shadowBlur: 18, shadowColor: "rgba(43,89,209,.28)" },
        },
      },
      {
        name: lineName,
        type: "line",
        yAxisIndex: 1,
        data: lineData,
        smooth: true,
        symbol: "circle",
        symbolSize: 8,
        lineStyle: { width: 3, color: lineColor },
        emphasis: { focus: "series", lineStyle: { width: 4 } },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: `${lineColor}30` },
            { offset: 1, color: `${lineColor}05` },
          ]),
        },
      },
    ],
  };
}
