export function formatBytes(bytes: number): string {
  if (bytes >= 1073741824) {
    const value = bytes / 1073741824;
    return `${value % 1 === 0 ? value : value.toFixed(1)} GB`;
  }
  if (bytes >= 1048576) {
    const value = bytes / 1048576;
    return `${value % 1 === 0 ? value : value.toFixed(1)} MB`;
  }
  if (bytes >= 1024) {
    const value = bytes / 1024;
    return `${value % 1 === 0 ? value : value.toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

export function formatLimitValue(
  metric: string,
  value: number,
): string {
  if (metric === "STORAGE") {
    return formatBytes(value);
  }
  return value.toLocaleString("en-US");
}

export function formatPlanPrice(
  priceCents: number,
  currency: string,
): string {
  if (priceCents === 0) {
    return "";
  }
  const amount = priceCents / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(amount);
  } catch {
    return `$${amount}`;
  }
}
