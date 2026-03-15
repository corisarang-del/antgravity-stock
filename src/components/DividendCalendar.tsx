"use client";

import { useState } from "react";
import { format, addMonths, subMonths } from "date-fns";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useDividendCalendar } from "@/hooks/useDividendCalendar";

export function DividendCalendar() {
  const [month, setMonth] = useState(() => new Date());
  const year = month.getFullYear();
  const mon = month.getMonth() + 1;

  const { data, isLoading, isError } = useDividendCalendar(year, mon);

  const sortedDates = data ? Object.keys(data.calendar).sort() : [];

  return (
    <div className="glass rounded-2xl border border-border p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-base">배당 캘린더</h3>
        <div className="flex items-center gap-1">
          <button onClick={() => setMonth((m) => subMonths(m, 1))} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors" aria-label="이전 달">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold min-w-[80px] text-center">{format(month, "yyyy년 M월")}</span>
          <button onClick={() => setMonth((m) => addMonths(m, 1))} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-secondary transition-colors" aria-label="다음 달">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      )}

      {isError && (
        <p className="text-sm text-muted-foreground text-center py-4">배당 데이터를 불러올 수 없습니다.</p>
      )}

      {!isLoading && !isError && sortedDates.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">이달 배당 이벤트 없음</p>
      )}

      {!isLoading && !isError && sortedDates.length > 0 && (
        <div className="space-y-2">
          {sortedDates.map((date) => {
            const events = data!.calendar[date];
            return (
              <div key={date} className="flex gap-3">
                <div className="w-14 shrink-0">
                  <p className="text-xs font-bold text-muted-foreground">{date.slice(5)}</p>
                </div>
                <div className="flex-1 space-y-1">
                  {events.map((ev) => (
                    <div key={ev.symbol} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-secondary/50 border border-border/50">
                      <div>
                        <span className="text-xs font-semibold">{ev.symbol}</span>
                        <span className="text-xs text-muted-foreground ml-2">{ev.name}</span>
                      </div>
                      <span className="text-xs font-mono text-gain">${ev.amount.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
