import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { publicApi } from "../api/api";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a, b) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

function isFuture(date) {
  return startOfDay(date).getTime() > startOfDay(new Date()).getTime();
}

function getCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPadding = firstDay.getDay();
  const days = [];

  for (let i = 0; i < startPadding; i++) {
    days.push({
      date: new Date(year, month, i - startPadding + 1),
      currentMonth: false,
    });
  }

  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push({ date: new Date(year, month, d), currentMonth: true });
  }

  while (days.length % 7 !== 0) {
    const nextDay = days.length - startPadding - lastDay.getDate() + 1;
    days.push({
      date: new Date(year, month + 1, nextDay),
      currentMonth: false,
    });
  }

  return days;
}

function buildDayChartData(readings, selectedDate) {
  return readings
    .filter((r) => isSameDay(r.created_at, selectedDate))
    .reverse()
    .map((r) => {
      const rd = new Date(r.created_at);
      return {
        label: rd.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        }),
        value: parseFloat(r.distance_cm),
      };
    });
}

export default function DashboardHistoryPanel({ backLink = "/" }) {
  const today = startOfDay(new Date());
  const [selectedDate, setSelectedDate] = useState(today);
  const [showCalendar, setShowCalendar] = useState(false);
  const [viewMonth, setViewMonth] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [historicalReadings, setHistoricalReadings] = useState([]);

  const fetchHours = useMemo(() => {
    const hours = Math.ceil(
      (Date.now() - selectedDate.getTime()) / (1000 * 60 * 60),
    );
    return Math.min(Math.max(hours + 48, 168), 2160);
  }, [selectedDate]);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const historyData = await publicApi.getReadingHistory({
          hours: fetchHours,
          limit: 500,
        });
        setHistoricalReadings(historyData.readings || []);
      } catch (err) {
        console.error("Failed to load history:", err);
      }
    }

    fetchHistory();
    const interval = setInterval(fetchHistory, 15000);
    return () => clearInterval(interval);
  }, [fetchHours]);

  const calendarDays = [];
  for (let i = 6; i >= 0; i--) {
    const d = startOfDay(new Date());
    d.setDate(d.getDate() - i);
    calendarDays.push({
      day: d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
      date: d.getDate().toString(),
      fullDate: d,
      active: isSameDay(d, selectedDate),
    });
  }

  const chartData = buildDayChartData(historicalReadings, selectedDate);

  const avgDistance =
    chartData.length > 0
      ? (
          chartData.reduce((acc, curr) => acc + curr.value, 0) / chartData.length
        ).toFixed(0)
      : 0;

  const currentMonthName = selectedDate
    .toLocaleDateString("en-US", { month: "long" })
    .toUpperCase();
  const currentYear = selectedDate.getFullYear();

  const pickerDays = getCalendarDays(
    viewMonth.getFullYear(),
    viewMonth.getMonth(),
  );

  const canGoNextMonth =
    viewMonth.getFullYear() < today.getFullYear() ||
    (viewMonth.getFullYear() === today.getFullYear() &&
      viewMonth.getMonth() < today.getMonth());

  function handleSelectDate(date) {
    if (isFuture(date)) return;
    setSelectedDate(startOfDay(date));
    setShowCalendar(false);
  }

  return (
    <div className="w-full lg:w-1/2 bg-slate-900 flex flex-col z-0 rounded-3xl overflow-hidden shadow-2xl border border-slate-800 relative">
      {/* Header */}
      <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between border-b border-slate-800">
        <Link
          to={backLink}
          className="p-2 hover:bg-slate-800 rounded-xl transition duration-300 text-slate-400 hover:text-white"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </Link>
        <h2 className="text-[15px] font-medium tracking-wide text-slate-200">
          Detail Chart
        </h2>
        <button
          onClick={() => {
            setViewMonth(
              new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1),
            );
            setShowCalendar((prev) => !prev);
          }}
          className="p-2 hover:bg-slate-800 rounded-xl transition duration-300 text-slate-400 hover:text-cyan-400"
          aria-label="Open calendar"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </button>
      </div>

      {/* Calendar popover */}
      {showCalendar && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowCalendar(false)}
          />
          <div className="absolute top-[4.5rem] right-4 z-50 w-[300px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() =>
                  setViewMonth(
                    (prev) =>
                      new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                  )
                }
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
              <span className="text-sm font-semibold text-slate-200">
                {viewMonth.toLocaleDateString("en-US", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <button
                onClick={() =>
                  canGoNextMonth &&
                  setViewMonth(
                    (prev) =>
                      new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                  )
                }
                disabled={!canGoNextMonth}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-30 disabled:pointer-events-none"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-1">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="text-center text-[9px] font-bold text-slate-500 py-1"
                >
                  {day.charAt(0)}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {pickerDays.map(({ date, currentMonth }, i) => {
                const selected = isSameDay(date, selectedDate);
                const isToday = isSameDay(date, today);
                const future = isFuture(date);

                return (
                  <button
                    key={i}
                    onClick={() => handleSelectDate(date)}
                    disabled={future}
                    className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all ${
                      selected
                        ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40"
                        : isToday
                          ? "bg-slate-800 text-cyan-300"
                          : future
                            ? "text-slate-600 cursor-not-allowed"
                            : currentMonth
                              ? "text-slate-300 hover:bg-slate-800"
                              : "text-slate-600 hover:bg-slate-800/50"
                    }`}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Month Selector */}
      <div className="flex items-center justify-between px-10 py-6">
        <button className="text-slate-600 hover:text-slate-400 transition">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
        </button>
        <div className="flex flex-col items-center cursor-pointer">
          <div className="flex items-center gap-2 text-slate-300 font-bold tracking-widest uppercase text-sm">
            {currentMonthName}
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
          <span className="text-slate-500 text-xs font-semibold tracking-wider mt-0.5">
            {currentYear}
          </span>
        </div>
        <button className="text-slate-600 hover:text-slate-400 transition">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
        </button>
      </div>

      {/* Week strip */}
      <div className="flex justify-between items-center px-8 pb-6 border-b border-slate-800">
        {calendarDays.map((d, i) => (
          <div
            key={i}
            onClick={() => setSelectedDate(d.fullDate)}
            className="flex flex-col items-center gap-3 cursor-pointer group"
          >
            <span className="text-[10px] font-bold text-slate-500 tracking-wider group-hover:text-slate-400 transition">
              {d.day}
            </span>
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold transition-all ${
                d.active
                  ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-lg shadow-cyan-500/10"
                  : "text-slate-400 group-hover:bg-slate-800 group-hover:text-slate-200"
              }`}
            >
              {d.date}
            </div>
          </div>
        ))}
      </div>

      {/* Line Chart */}
      <div className="flex-1 w-full px-4 pt-10 pb-4 min-h-[300px]">
        {chartData.length === 0 ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">
            No readings for this day
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#334155"
              />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 500 }}
                dy={15}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#94a3b8", fontSize: 11, fontWeight: 500 }}
                tickFormatter={(val) => `${val}cm`}
              />
              <Tooltip
                cursor={{
                  stroke: "#475569",
                  strokeWidth: 1,
                  strokeDasharray: "4 4",
                }}
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid #334155",
                  backgroundColor: "#1e293b",
                  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.3)",
                }}
                labelStyle={{ fontWeight: "bold", color: "#e2e8f0" }}
                itemStyle={{ color: "#22d3ee" }}
                formatter={(value) => [
                  `${Number(value).toFixed(1)} cm`,
                  "Distance",
                ]}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#22d3ee"
                strokeWidth={3}
                dot={false}
                activeDot={{
                  r: 6,
                  fill: "#22d3ee",
                  stroke: "#0f172a",
                  strokeWidth: 2,
                }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Summary Footer */}
      <div className="py-6 flex flex-col items-center justify-center border-t border-slate-800 bg-slate-950/50">
        <h3 className="text-3xl font-medium text-slate-200 tracking-tight">
          {avgDistance}
          <span className="text-xl ml-1 text-slate-500">CM</span>
        </h3>
        <p className="text-[10px] font-bold tracking-[0.2em] text-slate-500 uppercase mt-1">
          Avg Distance
        </p>
      </div>
    </div>
  );
}
