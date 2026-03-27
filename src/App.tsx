import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "next-themes";
import { Loader2 } from "lucide-react";

// 코드 스플리팅: 14개 페이지 lazy load
const Index = lazy(() => import("./pages/Index"));
const StockDetail = lazy(() => import("./pages/StockDetail"));
const Diagnose = lazy(() => import("./pages/Diagnose"));
const Portfolio = lazy(() => import("./pages/Portfolio"));
const Watchlist = lazy(() => import("./pages/Watchlist"));
const Alerts = lazy(() => import("./pages/Alerts"));
const Diary = lazy(() => import("./pages/Diary"));
const Tips = lazy(() => import("./pages/Tips"));
const TipsDetail = lazy(() => import("./pages/TipsDetail"));
const Upgrade = lazy(() => import("./pages/Upgrade"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const PaymentFail = lazy(() => import("./pages/PaymentFail"));
const ProDashboard = lazy(() => import("./pages/ProDashboard"));
const NotFound = lazy(() => import("./pages/NotFound"));

// 로딩 fallback 컴포넌트
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 컴포넌트 언마운트 후 24시간 캐시 유지 (탭 전환 시 재요청 방지)
      gcTime: 24 * 60 * 60 * 1000,
    },
  },
});

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Diagnose />} />
              <Route path="/home" element={<Index />} />
              <Route path="/stock/:symbol" element={<StockDetail />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/watchlist" element={<Watchlist />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/diary" element={<Diary />} />
              <Route path="/tips" element={<Tips />} />
              <Route path="/tips/:id" element={<TipsDetail />} />
              <Route path="/upgrade" element={<Upgrade />} />
              <Route path="/payment/success" element={<PaymentSuccess />} />
              <Route path="/payment/fail" element={<PaymentFail />} />
              <Route path="/pro" element={<ProDashboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
  </ThemeProvider>
);

export default App;
