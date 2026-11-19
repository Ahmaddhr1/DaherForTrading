// Ported from Tremor Raw (https://github.com/tremorlabs/tremor, Apache-2.0)
// and converted from TypeScript to plain JS for this project.

import { useEffect } from "react";

export function useOnWindowResize(handler) {
  useEffect(() => {
    const handleResize = () => {
      handler();
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [handler]);
}

// Fixed categorical color slots, assigned by position (never cycled or
// reassigned once a series has a slot) - see the dataviz skill's
// color-formula guidance. Validated as colorblind-safe via
// scripts/validate_palette.js before use.
export const chartColors = {
  blue: { bg: "bg-blue-500", stroke: "stroke-blue-500", fill: "fill-blue-500", text: "text-blue-500" },
  amber: { bg: "bg-amber-500", stroke: "stroke-amber-500", fill: "fill-amber-500", text: "text-amber-500" },
  emerald: { bg: "bg-emerald-500", stroke: "stroke-emerald-500", fill: "fill-emerald-500", text: "text-emerald-500" },
  violet: { bg: "bg-violet-500", stroke: "stroke-violet-500", fill: "fill-violet-500", text: "text-violet-500" },
  gray: { bg: "bg-gray-500", stroke: "stroke-gray-500", fill: "fill-gray-500", text: "text-gray-500" },
};

export const AvailableChartColors = Object.keys(chartColors);

export function constructCategoryColors(categories, colors) {
  const categoryColors = new Map();
  categories.forEach((category, index) => {
    categoryColors.set(category, colors[index % colors.length]);
  });
  return categoryColors;
}

export function getColorClassName(color, type) {
  const fallbackColor = { bg: "bg-gray-500", stroke: "stroke-gray-500", fill: "fill-gray-500", text: "text-gray-500" };
  return chartColors[color]?.[type] ?? fallbackColor[type];
}

export function getYAxisDomain(autoMinValue, minValue, maxValue) {
  const minDomain = autoMinValue ? "auto" : (minValue ?? 0);
  const maxDomain = maxValue ?? "auto";
  return [minDomain, maxDomain];
}

export function hasOnlyOneValueForKey(array, keyToCheck) {
  const val = [];
  for (const obj of array) {
    if (Object.prototype.hasOwnProperty.call(obj, keyToCheck)) {
      val.push(obj[keyToCheck]);
      if (val.length > 1) return false;
    }
  }
  return true;
}
