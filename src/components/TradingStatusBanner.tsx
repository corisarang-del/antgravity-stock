"use client";

import { useMemo } from "react";
import { isTradingDay, getNextTradingDay, isTradingHoliday } from "korea-business-day";
import { format, differenceInCalendarDays } from "date-fns";
import { TrendingUp, Clock, CalendarOff } from "lucide-react";

function toDateStr(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function useTradingStatus() {
  return useMemo(() => {
    const today = new Date();
    const todayStr = toDateStr(today);
    const isOpen = isTradingDay(todayStr);
    const isHoliday = isTradingHoliday(todayStr);
    const nextStr = isOpen ? null : getNextTradingDay(todayStr);
    const daysUntil = nextStr
      ? differenceInCalendarDays(new Date(nextStr), today)
      : 0;

    return { isOpen, isHoliday, nextStr, daysUntil };
  }, []);
}

export function TradingStatusBanner() {
  const { isOpen, isHoliday, nextStr, daysUntil } = useTradingStatus();

  if (isOpen) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gain/10 border border-gain/20">
        <div className="w-8 h-8 rounded-lg bg-gain/20 flex items-center justify-center shrink-0">
          <TrendingUp className="w-4 h-4 text-gain" />
        </div>
        <div>
          <p className="text-sm font-semibold text-gain">오늘 주식시장 개장일</p>
          <p className="text-xs text-muted-foreground">한국 주식시장(KRX)이 정상 운영 중입니다</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 text-[11px] text-gain font-semibold px-2 py-1 rounded-full bg-gain/10 border border-gain/20">
          <span className="w-1.5 h-1.5 rounded-full bg-gain animate-pulse" />
          OPEN
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-secondary/60 border border-border">
      <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
        {isHoliday ? (
          <CalendarOff className="w-4 h-4 text-muted-foreground" />
        ) : (
          <Clock className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">
          오늘 {isHoliday ? "휴장일" : "휴장"}
        </p>
        <p className="text-xs text-muted-foreground">
          {nextStr
            ? `다음 거래일: ${nextStr} (${daysUntil}일 후)`
            : "다음 거래일을 계산 중..."}
        </p>
      </div>
      <div className="ml-auto text-[11px] text-muted-foreground px-2 py-1 rounded-full bg-secondary border border-border">
        CLOSED
      </div>
    </div>
  );
}
