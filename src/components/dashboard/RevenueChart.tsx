"use client";

import { ApexOptions } from "apexcharts";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";

const ReactApexChart = dynamic(() => import("react-apexcharts"), {
  ssr: false,
});

interface RevenueChartProps {
  thisYear: number[];
  lastYear: number[];
  primaryColor: string;
  secondaryColor: string;
  currency: string;
}

function formatCompactCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  } catch {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(value);
  }
}

export default function RevenueChart({
  thisYear,
  lastYear,
  primaryColor,
  secondaryColor,
  currency,
}: RevenueChartProps) {
  const t = useTranslations("dashboard");
  const tMonths = useTranslations("dashboard.months");

  const monthKeys = [
    "jan",
    "feb",
    "mar",
    "apr",
    "may",
    "jun",
    "jul",
    "aug",
    "sep",
    "oct",
    "nov",
    "dec",
  ];

  const options: ApexOptions = {
    colors: [primaryColor, secondaryColor],
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "area",
      height: 300,
      toolbar: {
        show: false,
      },
      zoom: {
        enabled: false,
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: "smooth",
      width: 3,
    },
    xaxis: {
      categories: monthKeys.map((key) => tMonths(key)),
      axisBorder: {
        show: false,
      },
      axisTicks: {
        show: false,
      },
      tickPlacement: "on",
      labels: {
        style: {
          colors: ["#6B7280", "#6B7280", "#6B7280", "#6B7280", "#6B7280", "#6B7280", "#6B7280", "#6B7280", "#6B7280", "#6B7280", "#6B7280", "#6B7280"],
          fontSize: "12px",
          fontWeight: 400,
        },
      },
    },
    yaxis: {
      labels: {
        formatter: (val: number) => formatCompactCurrency(val, currency),
        style: {
          colors: ["#6B7280"],
          fontSize: "12px",
          fontWeight: 400,
        },
      },
    },
    legend: {
      show: true,
      position: "top",
      horizontalAlign: "left",
      fontFamily: "Outfit",
    },
    grid: {
      strokeDashArray: 4,
      yaxis: {
        lines: {
          show: true,
        },
      },
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.35,
        opacityTo: 0.05,
        stops: [0, 90, 100],
      },
    },
    states: {
      hover: {
        filter: {
          type: "none",
        },
      },
      active: {
        filter: {
          type: "none",
        },
      },
    },
    tooltip: {
      x: {
        show: false,
      },
      y: {
        formatter: (val: number) => formatCompactCurrency(val, currency),
      },
    },
  };

  const series = [
    {
      name: t("revenueChart.thisYear"),
      data: thisYear,
    },
    {
      name: t("revenueChart.lastYear"),
      data: lastYear,
    },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-5 pt-5 sm:px-6 sm:pt-6 dark:border-gray-800 dark:bg-white/3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {t("revenueChart.title")}
          </h3>
          <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
            {t("revenueChart.desc")}
          </p>
        </div>
      </div>

      <div className="custom-scrollbar max-w-full overflow-x-auto">
        <div className="min-w-162.5 xl:min-w-full">
          <ReactApexChart
            options={options}
            series={series}
            type="area"
            height={300}
          />
        </div>
      </div>
    </div>
  );
}
