'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { useWeekPlanStore } from '@/app/store/weekPlanStore';
import { useWizardStore } from '@/app/store/wizardStore';
import { getMonthWeeks, getWeekDates, formatWeekRange } from '@/app/lib/weekUtils';
import type { DayPlan, Recipe } from '@/app/types';

// Label → bar colour (wider than a dot, full class strings for Tailwind scanner)
const LABEL_BAR: Record<string, string> = {
  healthy:    'bg-emerald-400',
  'low-carb': 'bg-sky-400',
  cheat:      'bg-orange-400',
  none:       'bg-zinc-300',
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface DayCellProps {
  date: Date;
  dayPlan: DayPlan | undefined;
  inMonth: boolean;
}

function DayCell({ date, dayPlan, inMonth }: DayCellProps) {
  const today = new Date();
  const isToday = inMonth &&
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();

  const dateNum = date.getDate();
  const barColor = dayPlan ? (LABEL_BAR[dayPlan.label] ?? 'bg-zinc-300') : undefined;

  return (
    <div
      className={`flex flex-col items-center justify-start pt-1 pb-1 min-h-[56px] rounded-xl
        ${inMonth ? 'text-zinc-800' : 'text-zinc-300'}
      `}
    >
      {/* Date number — filled circle on today */}
      {isToday ? (
        <span className="w-5 h-5 flex items-center justify-center rounded-full bg-zinc-900 text-white text-[10px] font-black leading-none mb-1">
          {dateNum}
        </span>
      ) : (
        <span className="text-xs font-semibold leading-none mb-1">{dateNum}</span>
      )}

      {/* Colour bar + recipe name if planned, subtle dot if empty in-month day */}
      {dayPlan ? (
        <div className="w-full px-0.5 flex flex-col items-center gap-0.5">
          <div className={`w-full h-1.5 rounded-full ${barColor}`} />
          <span className="text-[8px] font-medium text-center leading-tight line-clamp-2 text-zinc-500 w-full">
            {dayPlan.label === 'none'
              ? (dayPlan.freeNote || 'Free')
              : (dayPlan.recipe?.name ?? '')}
          </span>
        </div>
      ) : inMonth ? (
        <div className="w-1.5 h-1.5 rounded-full bg-zinc-100" />
      ) : null}
    </div>
  );
}

interface WeekRowProps {
  weekStart: string;
  currentMonth: number;
}

function WeekRow({ weekStart, currentMonth }: WeekRowProps) {
  const { weeks, setActiveWeek, openWizardForWeek, deleteWeek } = useWeekPlanStore();
  const { setTargetWeekStart, resetWizard } = useWizardStore();
  const weekPlan = weeks[weekStart];
  const dates = getWeekDates(weekStart);

  // Detect if this week contains today
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStartDate = new Date(weekStart);
  const weekEndDate = new Date(weekStart);
  weekEndDate.setDate(weekEndDate.getDate() + 6);
  const isCurrentWeek = today >= weekStartDate && today <= weekEndDate;

  const handlePlanWeek = (e: React.MouseEvent) => {
    e.stopPropagation();
    resetWizard();                  // reset first — clears old plan/step
    setTargetWeekStart(weekStart);  // then set target (after reset so it isn't cleared)
    openWizardForWeek(weekStart);
  };

  const handleDeleteWeek = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Delete the plan for ${formatWeekRange(weekStart)}?`)) {
      deleteWeek(weekStart);
    }
  };

  const handleRowClick = () => {
    if (weekPlan) setActiveWeek(weekStart);
  };

  return (
    <div
      onClick={handleRowClick}
      className={`group relative rounded-2xl border transition-all
        ${isCurrentWeek ? 'ring-2 ring-zinc-900 ring-offset-1' : ''}
        ${weekPlan
          ? 'border-zinc-200 hover:border-zinc-400 bg-white cursor-pointer hover:shadow-sm'
          : 'border-dashed border-zinc-200 bg-zinc-50'
        }`}
    >
      {isCurrentWeek && (
        <span className="absolute -top-2.5 left-3 text-[9px] font-bold uppercase tracking-wider bg-zinc-900 text-white px-2 py-0.5 rounded-full">
          This week
        </span>
      )}
      {/* Day cells grid */}
      <div className="grid grid-cols-7 gap-0.5 px-2 pt-2 pb-1">
        {dates.map((date, i) => {
          const dayPlan = weekPlan?.days[i];
          const inMonth = date.getMonth() === currentMonth;
          return (
            <DayCell key={i} date={date} dayPlan={dayPlan} inMonth={inMonth} />
          );
        })}
      </div>

      {/* Week footer: range label + action */}
      <div className="flex items-center justify-between px-3 pb-2 pt-0.5">
        <span className="text-[10px] font-semibold text-zinc-400">
          {formatWeekRange(weekStart)}
        </span>
        {weekPlan ? (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleDeleteWeek}
              className="p-1 rounded-full hover:bg-red-50 text-zinc-300 hover:text-red-400 transition-colors cursor-pointer"
              aria-label="Delete week plan"
            >
              <X size={11} />
            </button>
            <ChevronRight size={12} className="text-zinc-400" />
          </div>
        ) : (
          <button
            onClick={handlePlanWeek}
            className="flex items-center gap-1 text-[10px] font-semibold text-zinc-400 hover:text-zinc-900 transition-colors cursor-pointer"
          >
            <Plus size={11} />
            Plan week
          </button>
        )}
      </div>
    </div>
  );
}

interface MonthCalendarProps {
  recipes: Recipe[];
}

export default function MonthCalendar({ recipes: _recipes }: MonthCalendarProps) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed

  const { openWizardForWeek } = useWeekPlanStore();
  const { setTargetWeekStart, resetWizard } = useWizardStore();

  const weekStarts = getMonthWeeks(viewYear, viewMonth);

  const goToPrevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };

  const goToNextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const handleNewPlan = () => {
    resetWizard();
    setTargetWeekStart(null);
    openWizardForWeek(null);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50">
      {/* Month nav header */}
      <div className="bg-white border-b border-zinc-200 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <button
          onClick={goToPrevMonth}
          className="w-9 h-9 rounded-xl border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 transition-colors cursor-pointer"
          aria-label="Previous month"
        >
          <ChevronLeft size={16} className="text-zinc-600" />
        </button>

        <div className="text-center">
          <h2 className="text-base font-black text-zinc-900">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </h2>
        </div>

        <button
          onClick={goToNextMonth}
          className="w-9 h-9 rounded-xl border border-zinc-200 flex items-center justify-center hover:bg-zinc-50 transition-colors cursor-pointer"
          aria-label="Next month"
        >
          <ChevronRight size={16} className="text-zinc-600" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="bg-white px-4 pb-2 flex-shrink-0">
        <div className="grid grid-cols-7 gap-0.5 px-2">
          {DAY_HEADERS.map((d) => (
            <div key={d} className="text-center text-[10px] font-bold text-zinc-400 uppercase tracking-wider py-1">
              {d}
            </div>
          ))}
        </div>
      </div>

      {/* Week rows */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="max-w-2xl mx-auto flex flex-col gap-2">
          {weekStarts.map((ws) => (
            <WeekRow key={ws} weekStart={ws} currentMonth={viewMonth} />
          ))}
        </div>

        {/* Plan a new week CTA at bottom */}
        <div className="max-w-2xl mx-auto mt-4 text-center">
          <button
            onClick={handleNewPlan}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-400 hover:text-zinc-700 transition-colors cursor-pointer"
          >
            <Plus size={13} />
            Plan a different week
          </button>
        </div>
      </div>
    </div>
  );
}
