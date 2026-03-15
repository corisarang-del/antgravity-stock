"use client";

import { useMemo, useState } from "react";
import { isTradingDay, isTradingHoliday, isHoliday } from "korea-business-day";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";

function toDateStr(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

type DayInfo = {
  date: Date;
  dateStr: string;
  isCurrentMonth: boolean;
  isWeekend: boolean;
  isTradingHol: boolean;
  isPublicHol: boolean;
  isTrading: boolean;
};

function buildCalendarDays(month: Date): DayInfo[][] {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const days = eachDayOfInterval({ start, end });

  const allDays: DayInfo[] = [];

  // 앞쪽 빈 날 (일요일=0 기준)
  const startDow = getDay(start); // 0=Sun
  for (let i = 0; i < startDow; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() - (startDow - i));
    const dateStr = toDateStr(d);
    const dow = getDay(d);
    const isWeekend = dow === 0 || dow === 6;
    allDays.push({
      date: d,
      dateStr,
      isCurrentMonth: false,
      isWeekend,
      isTradingHol: isTradingHoliday(dateStr),
      isPublicHol: isHoliday(dateStr),
      isTrading: isTradingDay(dateStr),
    });
  }

  for (const d of days) {
    const dateStr = toDateStr(d);
    const dow = getDay(d);
    const isWeekend = dow === 0 || dow === 6;
    allDays.push({
      date: d,
      dateStr,
      isCurrentMonth: true,
      isWeekend,
      isTradingHol: isTradingHoliday(dateStr),
      isPublicHol: isHoliday(dateStr),
      isTrading: isTradingDay(dateStr),
    });
  }

  // 뒤쪽 빈 날 (6열 맞추기)
  const remaining = (7 - (allDays.length % 7)) % 7;
  const lastDay = allDays[allDays.length - 1].date;
  for (let i = 1; i <= remaining; i++) {
    const d = new Date(lastDay);
    d.setDate(d.getDate() + i);
    const dateStr = toDateStr(d);
    const dow = getDay(d);
    const isWeekend = dow === 0 || dow === 6;
    allDays.push({
      date: d,
      dateStr,
      isCurrentMonth: false,
      isWeekend,
      isTradingHol: isTradingHoliday(dateStr),
      isPublicHol: isHoliday(dateStr),
      isTrading: isTradingDay(dateStr),
    });
  }

  // 주 단위로 분할
  const weeks: DayInfo[][] = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }
  return weeks;
}

const DOW_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export function KoreanTradingCalendar() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const weeks = useMemo(() => buildCalendarDays(currentMonth), [currentMonth]);
  const todayStr = toDateStr(new Date());

  const tradingCount = weeks.flat().filter((d) => d.isCurrentMonth && d.isTrading).length;
  const holidayDays = weeks.flat().filter((d) => d.isCurrentMonth && d.isPublicHol);

  return (
    <div className="glass rounded-2xl border border-border p-5 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-bold text-base">한국 거래소 개장일</h3>
          <p className="text-xs text-muted-foreground">이번 달 거래일 {tradingCount}일</p>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors"
            aria-label="이전 달"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold min-w-[80px] text-center">
            {format(currentMonth, "yyyy년 M월")}
          </span>
          <button
            onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
            className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors"
            aria-label="다음 달"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 gap-1">
        {DOW_LABELS.map((label, i) => (
          <div
            key={label}
            className={`text-center text-[11px] font-semibold py-1 ${i === 0 ? "text-loss" : i === 6 ? "text-primary/70" : "text-muted-foreground"}`}
          >
            {label}
          </div>
        ))}
      </div>

      {/* 날짜 그리드 */}
      <div className="space-y-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7 gap-1">
            {week.map((day) => {
              const isToday = day.dateStr === todayStr;
              const dow = getDay(day.date);

              let cellClass =
                "relative flex items-center justify-center rounded-lg text-xs h-8 transition-colors ";

              if (!day.isCurrentMonth) {
                cellClass += "opacity-25 ";
              }

              if (isToday) {
                cellClass += "ring-2 ring-primary ring-offset-1 ring-offset-background font-bold ";
              }

              if (day.isTrading) {
                cellClass += "text-foreground ";
              } else if (day.isTradingHol) {
                cellClass += "bg-loss/8 text-loss/60 ";
              } else if (day.isWeekend) {
                cellClass += dow === 0 ? "text-loss/50 " : "text-primary/40 ";
              }

              if (day.isPublicHol && day.isCurrentMonth) {
                cellClass += "text-loss ";
              }

              return (
                <div key={day.dateStr} className={cellClass} title={day.isPublicHol ? "공휴일" : day.isTradingHol ? "휴장일" : undefined}>
                  {day.date.getDate()}
                  {day.isTrading && day.isCurrentMonth && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-gain/60" />
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* 범례 */}
      <div className="flex flex-wrap gap-3 pt-1 border-t border-border/50">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-gain/60" />
          거래일
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="w-3 h-3 rounded bg-loss/8 border border-loss/20" />
          휴장일
        </div>
        <div className="flex items-center gap-1.5 text-xs text-loss">
          <span className="text-[10px] font-bold">공</span>
          공휴일
        </div>
      </div>

      {/* 이달 공휴일 목록 */}
      {holidayDays.length > 0 && (
        <div className="pt-1 border-t border-border/50 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground">이달 공휴일</p>
          <div className="flex flex-wrap gap-1.5">
            {holidayDays.map((d) => (
              <span
                key={d.dateStr}
                className="text-[11px] px-2 py-0.5 rounded-full bg-loss/10 border border-loss/20 text-loss"
              >
                {format(d.date, "M/d")}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
