import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Home, BookOpen, Lightbulb, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { UserMenu } from "@/components/UserMenu";
import { MarketTicker } from "@/components/MarketOverview";
import { AuthModal } from "@/components/AuthModal";
import antCharacter from "@/assets/ant_character.png";

const TABS = [
  { path: "/",        label: "홈",          icon: Home },
  { path: "/diary",   label: "개미의 일기",  icon: BookOpen },
  { path: "/tips",    label: "꿀팁정보",    icon: Lightbulb },
  { path: "/upgrade", label: "업그레이드",  icon: Zap },
];

interface AppShellProps {
  children: ReactNode;
  hideTicker?: boolean;
}

export function AppShell({ children, hideTicker }: AppShellProps) {
  const { user } = useAuth();
  const location = useLocation();
  const [showAuth, setShowAuth] = useState(false);

  const isActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Top Header */}
      <header className="border-b border-border px-4 md:px-6 py-2 flex items-center justify-between shrink-0 sticky top-0 z-40 bg-background/95 backdrop-blur-sm">
        <Link to="/" className="flex items-center gap-2.5">
          {/* Ant character logo */}
          <motion.div
            className="w-10 h-10 shrink-0"
            whileHover={{ scale: 1.1, rotate: -5 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <img src={antCharacter} alt="AntGravity" className="w-full h-full object-contain" />
          </motion.div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold gradient-text-primary text-lg tracking-tight leading-none">AntGravity</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-mono hidden sm:inline">PRO</span>
            </div>
            <div className="text-[10px] text-muted-foreground hidden sm:block leading-none mt-0.5">개미들의 AI 투자 플랫폼</div>
          </div>
        </Link>

        {/* Desktop Tab Nav */}
        <nav className="hidden md:flex items-center gap-1 bg-secondary/60 rounded-xl p-1">
          {TABS.map(({ path, label, icon: Icon }) => {
            const active = isActive(path);
            return (
              <Link key={path} to={path}>
                <motion.div
                  className={`relative flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {active && (
                    <motion.div
                      layoutId="desktop-tab-indicator"
                      className="absolute inset-0 bg-primary rounded-lg"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className="w-3.5 h-3.5 relative z-10" />
                  <span className="relative z-10">{label}</span>
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* Auth */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-gain animate-pulse-glow" />
            <span className="text-xs text-muted-foreground">실시간</span>
          </div>
          {user ? (
            <UserMenu />
          ) : (
            <button
              onClick={() => setShowAuth(true)}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              로그인
            </button>
          )}
        </div>
      </header>

      {/* Ticker */}
      {!hideTicker && <MarketTicker />}

      {/* Page Content */}
      <main className="flex-1 pb-20 md:pb-0">
        {children}
      </main>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm">
        <div className="flex items-center justify-around px-2 py-1.5">
          {TABS.map(({ path, label, icon: Icon }) => {
            const active = isActive(path);
            return (
              <Link key={path} to={path} className="flex-1">
                <div className="flex flex-col items-center gap-0.5 py-1">
                  {path === "/" && active ? (
                    /* Use ant character for home tab when active */
                    <div className="relative w-9 h-9 flex items-center justify-center">
                      <motion.div layoutId="mobile-tab-indicator" className="absolute inset-0 bg-primary/15 rounded-xl" transition={{ type: "spring", stiffness: 380, damping: 30 }} />
                      <img src={antCharacter} alt="홈" className="w-6 h-6 object-contain relative z-10" />
                    </div>
                  ) : (
                    <div className={`relative p-2 rounded-xl transition-all ${active ? "bg-primary/15" : ""}`}>
                      {active && (
                        <motion.div
                          layoutId="mobile-tab-indicator"
                          className="absolute inset-0 bg-primary/15 rounded-xl"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                        />
                      )}
                      <Icon className={`w-5 h-5 relative z-10 transition-colors ${active ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                  )}
                  <span className={`text-[10px] font-medium transition-colors ${active ? "text-primary" : "text-muted-foreground"}`}>
                    {label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>

      <AnimatePresence>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      </AnimatePresence>
    </div>
  );
}
