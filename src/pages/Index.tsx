import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { AppShell } from "@/components/AppShell";
import { StockDetailPanel } from "@/components/StockDetailPanel";

const Index = () => {
  const location = useLocation();
  const [selectedSymbol, setSelectedSymbol] = useState("NVDA");

  useEffect(() => {
    const sym = (location.state as { symbol?: string } | null)?.symbol;
    if (sym) setSelectedSymbol(sym);
  }, [location.state]);

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <StockDetailPanel symbol={selectedSymbol} />
      </div>
    </AppShell>
  );
};

export default Index;
