// Ported from Tremor Raw's LineChart (https://github.com/tremorlabs/tremor,
// Apache-2.0) and converted from TypeScript to plain JS for this project.
"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  CartesianGrid,
  Dot,
  Label,
  Line,
  Legend as RechartsLegend,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { cn as cx } from "@/lib/utils";
import {
  AvailableChartColors,
  constructCategoryColors,
  getColorClassName,
  getYAxisDomain,
  hasOnlyOneValueForKey,
  useOnWindowResize,
} from "./chart-utils";

const LegendItem = ({ name, color, onClick, activeLegend }) => {
  const hasOnValueChange = !!onClick;
  return (
    <li
      className={cx(
        "group inline-flex flex-nowrap items-center gap-1.5 whitespace-nowrap rounded-sm px-2 py-1 transition",
        hasOnValueChange ? "cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800" : "cursor-default"
      )}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(name, color);
      }}
    >
      <span
        className={cx(
          "h-[3px] w-3.5 shrink-0 rounded-full",
          getColorClassName(color, "bg"),
          activeLegend && activeLegend !== name ? "opacity-40" : "opacity-100"
        )}
        aria-hidden={true}
      />
      <p
        className={cx(
          "truncate whitespace-nowrap text-xs",
          "text-gray-700 dark:text-gray-300",
          hasOnValueChange && "group-hover:text-gray-900 dark:group-hover:text-gray-100",
          activeLegend && activeLegend !== name ? "opacity-40" : "opacity-100"
        )}
      >
        {name}
      </p>
    </li>
  );
};

const ScrollButton = ({ icon, onClick, disabled }) => {
  const Icon = icon;
  const [isPressed, setIsPressed] = React.useState(false);
  const intervalRef = React.useRef(null);

  React.useEffect(() => {
    if (isPressed) {
      intervalRef.current = setInterval(() => {
        onClick?.();
      }, 300);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPressed, onClick]);

  React.useEffect(() => {
    if (disabled) {
      clearInterval(intervalRef.current);
      setIsPressed(false);
    }
  }, [disabled]);

  return (
    <button
      type="button"
      className={cx(
        "group inline-flex size-5 items-center truncate rounded-sm transition",
        disabled
          ? "cursor-not-allowed text-gray-400 dark:text-gray-500"
          : "cursor-pointer text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
      )}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        setIsPressed(true);
      }}
      onMouseUp={(e) => {
        e.stopPropagation();
        setIsPressed(false);
      }}
    >
      <Icon className="size-full" aria-hidden="true" />
    </button>
  );
};

const Legend = React.forwardRef((props, ref) => {
  const {
    categories,
    colors = AvailableChartColors,
    className,
    onClickLegendItem,
    activeLegend,
    enableLegendSlider = false,
    ...other
  } = props;
  const scrollableRef = React.useRef(null);
  const scrollButtonsRef = React.useRef(null);
  const [hasScroll, setHasScroll] = React.useState(null);
  const [isKeyDowned, setIsKeyDowned] = React.useState(null);
  const intervalRef = React.useRef(null);

  const checkScroll = React.useCallback(() => {
    const scrollable = scrollableRef?.current;
    if (!scrollable) return;
    const hasLeftScroll = scrollable.scrollLeft > 0;
    const hasRightScroll = scrollable.scrollWidth - scrollable.clientWidth > scrollable.scrollLeft;
    setHasScroll({ left: hasLeftScroll, right: hasRightScroll });
  }, [setHasScroll]);

  const scrollToTest = React.useCallback(
    (direction) => {
      const element = scrollableRef?.current;
      const scrollButtons = scrollButtonsRef?.current;
      const scrollButtonsWith = scrollButtons?.clientWidth ?? 0;
      const width = element?.clientWidth ?? 0;

      if (element && enableLegendSlider) {
        element.scrollTo({
          left:
            direction === "left"
              ? element.scrollLeft - width + scrollButtonsWith
              : element.scrollLeft + width - scrollButtonsWith,
          behavior: "smooth",
        });
        setTimeout(() => {
          checkScroll();
        }, 400);
      }
    },
    [enableLegendSlider, checkScroll]
  );

  React.useEffect(() => {
    const keyDownHandler = (key) => {
      if (key === "ArrowLeft") {
        scrollToTest("left");
      } else if (key === "ArrowRight") {
        scrollToTest("right");
      }
    };
    if (isKeyDowned) {
      keyDownHandler(isKeyDowned);
      intervalRef.current = setInterval(() => {
        keyDownHandler(isKeyDowned);
      }, 300);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isKeyDowned, scrollToTest]);

  const keyDown = (e) => {
    e.stopPropagation();
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      setIsKeyDowned(e.key);
    }
  };
  const keyUp = (e) => {
    e.stopPropagation();
    setIsKeyDowned(null);
  };

  React.useEffect(() => {
    const scrollable = scrollableRef?.current;
    if (enableLegendSlider) {
      checkScroll();
      scrollable?.addEventListener("keydown", keyDown);
      scrollable?.addEventListener("keyup", keyUp);
    }
    return () => {
      scrollable?.removeEventListener("keydown", keyDown);
      scrollable?.removeEventListener("keyup", keyUp);
    };
  }, [checkScroll, enableLegendSlider]);

  return (
    <ol ref={ref} className={cx("relative overflow-hidden", className)} {...other}>
      <div
        ref={scrollableRef}
        tabIndex={0}
        className={cx(
          "flex h-full",
          enableLegendSlider
            ? hasScroll?.right || hasScroll?.left
              ? "snap-mandatory items-center overflow-auto ps-4 pe-12 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              : ""
            : "flex-wrap"
        )}
      >
        {categories.map((category, index) => (
          <LegendItem
            key={`item-${index}`}
            name={category}
            color={colors[index]}
            onClick={onClickLegendItem}
            activeLegend={activeLegend}
          />
        ))}
      </div>
      {enableLegendSlider && (hasScroll?.right || hasScroll?.left) ? (
        <div className={cx("absolute bottom-0 end-0 top-0 flex h-full items-center justify-center pe-1", "bg-white dark:bg-gray-900")}>
          <ScrollButton
            icon={ChevronLeft}
            onClick={() => {
              setIsKeyDowned(null);
              scrollToTest("left");
            }}
            disabled={!hasScroll?.left}
          />
          <ScrollButton
            icon={ChevronRight}
            onClick={() => {
              setIsKeyDowned(null);
              scrollToTest("right");
            }}
            disabled={!hasScroll?.right}
          />
        </div>
      ) : null}
    </ol>
  );
});

Legend.displayName = "Legend";

const ChartLegend = (
  { payload },
  categoryColors,
  setLegendHeight,
  activeLegend,
  onClick,
  enableLegendSlider,
  legendPosition,
  yAxisWidth
) => {
  const legendRef = React.useRef(null);

  useOnWindowResize(() => {
    const calculateHeight = (height) => (height ? Number(height) + 15 : 60);
    setLegendHeight(calculateHeight(legendRef.current?.clientHeight));
  });

  const legendPayload = payload.filter((item) => item.type !== "none");
  const paddingLeft = legendPosition === "left" && yAxisWidth ? yAxisWidth - 8 : 0;

  return (
    <div
      ref={legendRef}
      style={{ paddingLeft }}
      className={cx("flex items-center", {
        "justify-center": legendPosition === "center",
        "justify-start": legendPosition === "left",
        "justify-end": legendPosition === "right",
      })}
    >
      <Legend
        categories={legendPayload.map((entry) => entry.value)}
        colors={legendPayload.map((entry) => categoryColors.get(entry.value))}
        onClickLegendItem={onClick}
        activeLegend={activeLegend}
        enableLegendSlider={enableLegendSlider}
      />
    </div>
  );
};

const ChartTooltip = ({ active, payload, label, valueFormatter }) => {
  if (active && payload && payload.length) {
    const legendPayload = payload.filter((item) => item.type !== "none");
    return (
      <div className={cx("rounded-md border text-sm shadow-md", "border-gray-200 dark:border-gray-800", "bg-white dark:bg-gray-900")}>
        <div className={cx("border-b border-inherit px-4 py-2")}>
          <p className={cx("font-medium", "text-gray-900 dark:text-gray-100")}>{label}</p>
        </div>
        <div className={cx("space-y-1 px-4 py-2")}>
          {legendPayload.map(({ value, category, color }, index) => (
            <div key={`id-${index}`} className="flex items-center justify-between space-x-8">
              <div className="flex items-center space-x-2">
                <span aria-hidden="true" className={cx("h-[3px] w-3.5 shrink-0 rounded-full", getColorClassName(color, "bg"))} />
                <p className={cx("whitespace-nowrap text-end", "text-gray-700 dark:text-gray-300")}>{category}</p>
              </div>
              <p className={cx("whitespace-nowrap text-end font-medium tabular-nums", "text-gray-900 dark:text-gray-100")}>
                {valueFormatter(value)}
              </p>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export const LineChart = React.forwardRef((props, ref) => {
  const {
    data = [],
    categories = [],
    index,
    colors = AvailableChartColors,
    valueFormatter = (value) => value.toString(),
    startEndOnly = false,
    showXAxis = true,
    showYAxis = true,
    showGridLines = true,
    yAxisWidth = 56,
    intervalType = "equidistantPreserveStart",
    showTooltip = true,
    showLegend = true,
    autoMinValue = false,
    minValue,
    maxValue,
    allowDecimals = true,
    connectNulls = false,
    className,
    onValueChange,
    enableLegendSlider = false,
    tickGap = 5,
    xAxisLabel,
    yAxisLabel,
    legendPosition = "right",
    tooltipCallback,
    customTooltip,
    ...other
  } = props;
  const CustomTooltip = customTooltip;
  const paddingValue = (!showXAxis && !showYAxis) || (startEndOnly && !showYAxis) ? 0 : 20;
  const [legendHeight, setLegendHeight] = React.useState(60);
  const [activeDot, setActiveDot] = React.useState(undefined);
  const [activeLegend, setActiveLegend] = React.useState(undefined);
  const categoryColors = constructCategoryColors(categories, colors);

  const yAxisDomain = getYAxisDomain(autoMinValue, minValue, maxValue);
  const hasOnValueChange = !!onValueChange;
  const prevActiveRef = React.useRef(undefined);
  const prevLabelRef = React.useRef(undefined);

  function onDotClick(itemData, event) {
    event.stopPropagation();
    if (!hasOnValueChange) return;
    if (
      (itemData.index === activeDot?.index && itemData.dataKey === activeDot?.dataKey) ||
      (hasOnlyOneValueForKey(data, itemData.dataKey) && activeLegend && activeLegend === itemData.dataKey)
    ) {
      setActiveLegend(undefined);
      setActiveDot(undefined);
      onValueChange?.(null);
    } else {
      setActiveLegend(itemData.dataKey);
      setActiveDot({ index: itemData.index, dataKey: itemData.dataKey });
      onValueChange?.({ eventType: "dot", categoryClicked: itemData.dataKey, ...itemData.payload });
    }
  }

  function onCategoryClick(dataKey) {
    if (!hasOnValueChange) return;
    if (
      (dataKey === activeLegend && !activeDot) ||
      (hasOnlyOneValueForKey(data, dataKey) && activeDot && activeDot.dataKey === dataKey)
    ) {
      setActiveLegend(undefined);
      onValueChange?.(null);
    } else {
      setActiveLegend(dataKey);
      onValueChange?.({ eventType: "category", categoryClicked: dataKey });
    }
    setActiveDot(undefined);
  }

  return (
    <div ref={ref} className={cx("h-80 w-full", className)} {...other}>
      <ResponsiveContainer>
        <RechartsLineChart
          data={data}
          onClick={
            hasOnValueChange && (activeLegend || activeDot)
              ? () => {
                  setActiveDot(undefined);
                  setActiveLegend(undefined);
                  onValueChange?.(null);
                }
              : undefined
          }
          margin={{
            bottom: xAxisLabel ? 30 : undefined,
            left: yAxisLabel ? 20 : undefined,
            right: yAxisLabel ? 5 : undefined,
            top: 5,
          }}
        >
          {showGridLines ? (
            <CartesianGrid className={cx("stroke-gray-200 dark:stroke-gray-800 stroke-1")} horizontal={true} vertical={false} />
          ) : null}
          <XAxis
            padding={{ left: paddingValue, right: paddingValue }}
            hide={!showXAxis}
            dataKey={index}
            interval={startEndOnly ? "preserveStartEnd" : intervalType}
            tick={{ transform: "translate(0, 6)" }}
            ticks={startEndOnly ? [data[0][index], data[data.length - 1][index]] : undefined}
            fill=""
            stroke=""
            className={cx("text-xs", "fill-gray-500 dark:fill-gray-400")}
            tickLine={false}
            axisLine={false}
            minTickGap={tickGap}
          >
            {xAxisLabel && (
              <Label position="insideBottom" offset={-20} className="fill-gray-800 dark:fill-gray-200 text-sm font-medium">
                {xAxisLabel}
              </Label>
            )}
          </XAxis>
          <YAxis
            width={yAxisWidth}
            hide={!showYAxis}
            axisLine={false}
            tickLine={false}
            type="number"
            domain={yAxisDomain}
            tick={{ transform: "translate(-3, 0)" }}
            fill=""
            stroke=""
            className={cx("text-xs", "fill-gray-500 dark:fill-gray-400")}
            tickFormatter={valueFormatter}
            allowDecimals={allowDecimals}
          >
            {yAxisLabel && (
              <Label position="insideLeft" style={{ textAnchor: "middle" }} angle={-90} offset={-15} className="fill-gray-800 dark:fill-gray-200 text-sm font-medium">
                {yAxisLabel}
              </Label>
            )}
          </YAxis>
          <Tooltip
            wrapperStyle={{ outline: "none" }}
            isAnimationActive={true}
            animationDuration={100}
            cursor={{ stroke: "#d1d5db", strokeWidth: 1 }}
            offset={20}
            position={{ y: 0 }}
            content={({ active, payload, label }) => {
              const cleanPayload = payload
                ? payload.map((item) => ({
                    category: item.dataKey,
                    value: item.value,
                    index: item.payload[index],
                    color: categoryColors.get(item.dataKey),
                    type: item.type,
                    payload: item.payload,
                  }))
                : [];

              if (tooltipCallback && (active !== prevActiveRef.current || label !== prevLabelRef.current)) {
                tooltipCallback({ active, payload: cleanPayload, label });
                prevActiveRef.current = active;
                prevLabelRef.current = label;
              }

              return showTooltip && active ? (
                CustomTooltip ? (
                  <CustomTooltip active={active} payload={cleanPayload} label={label} />
                ) : (
                  <ChartTooltip active={active} payload={cleanPayload} label={label} valueFormatter={valueFormatter} />
                )
              ) : null;
            }}
          />

          {showLegend ? (
            <RechartsLegend
              verticalAlign="top"
              height={legendHeight}
              content={({ payload }) =>
                ChartLegend(
                  { payload },
                  categoryColors,
                  setLegendHeight,
                  activeLegend,
                  hasOnValueChange ? (clickedLegendItem) => onCategoryClick(clickedLegendItem) : undefined,
                  enableLegendSlider,
                  legendPosition,
                  yAxisWidth
                )
              }
            />
          ) : null}
          {categories.map((category) => (
            <Line
              className={cx(getColorClassName(categoryColors.get(category), "stroke"))}
              strokeOpacity={activeDot || (activeLegend && activeLegend !== category) ? 0.3 : 1}
              activeDot={(props) => {
                const { cx: cxCoord, cy: cyCoord, stroke, strokeLinecap, strokeLinejoin, strokeWidth, dataKey } = props;
                return (
                  <Dot
                    className={cx("stroke-white", onValueChange ? "cursor-pointer" : "", getColorClassName(categoryColors.get(dataKey), "fill"))}
                    cx={cxCoord}
                    cy={cyCoord}
                    r={5}
                    fill=""
                    stroke={stroke}
                    strokeLinecap={strokeLinecap}
                    strokeLinejoin={strokeLinejoin}
                    strokeWidth={strokeWidth}
                    onClick={(_, event) => onDotClick(props, event)}
                  />
                );
              }}
              dot={(props) => {
                const { stroke, strokeLinecap, strokeLinejoin, strokeWidth, cx: cxCoord, cy: cyCoord, dataKey, index } = props;

                if (
                  (hasOnlyOneValueForKey(data, category) && !(activeDot || (activeLegend && activeLegend !== category))) ||
                  (activeDot?.index === index && activeDot?.dataKey === category)
                ) {
                  return (
                    <Dot
                      key={index}
                      cx={cxCoord}
                      cy={cyCoord}
                      r={5}
                      stroke={stroke}
                      fill=""
                      strokeLinecap={strokeLinecap}
                      strokeLinejoin={strokeLinejoin}
                      strokeWidth={strokeWidth}
                      className={cx("stroke-white", onValueChange ? "cursor-pointer" : "", getColorClassName(categoryColors.get(dataKey), "fill"))}
                    />
                  );
                }
                return <React.Fragment key={index}></React.Fragment>;
              }}
              key={category}
              name={category}
              type="linear"
              dataKey={category}
              stroke=""
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              isAnimationActive={false}
              connectNulls={connectNulls}
            />
          ))}
          {onValueChange
            ? categories.map((category) => (
                <Line
                  className={cx("cursor-pointer")}
                  strokeOpacity={0}
                  key={category}
                  name={category}
                  type="linear"
                  dataKey={category}
                  stroke="transparent"
                  fill="transparent"
                  legendType="none"
                  tooltipType="none"
                  strokeWidth={12}
                  connectNulls={connectNulls}
                  onClick={(props, event) => {
                    event.stopPropagation();
                    const { name } = props;
                    onCategoryClick(name);
                  }}
                />
              ))
            : null}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
});

LineChart.displayName = "LineChart";
