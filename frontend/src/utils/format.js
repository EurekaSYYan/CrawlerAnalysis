export function formatWan(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  const number = Number(value);
  if (number >= 10000) {
    return `${Math.round(number / 1000) / 10}万`;
  }
  if (number >= 1000) {
    return `${Math.round(number / 100) / 10}千`;
  }
  return String(Math.round(number));
}

export function formatNumber(value, digits = 0) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return Number(value).toLocaleString("zh-CN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatPerSqm(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `${formatNumber(value)} 元/㎡`;
}

export function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}
