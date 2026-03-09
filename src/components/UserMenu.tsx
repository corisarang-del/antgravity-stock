import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, Wallet, Star, Bell, Crown, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { PricingModal } from "@/components/PricingModal";
import antCharacter from "@/assets/ant_character.png";

export function UserMenu() {
  const { user, signOut } = useAuth();
  const { isPro } = useSubscription();
  const [open, setOpen] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const displayName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split("@")[0] || "사용자";
  const avatarUrl = user?.user_metadata?.avatar_url;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <>
      <div className="relative" ref={ref}>
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-8 h-8 rounded-full border border-border object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">
              {initial}
            </div>
          )}
          <div className="hidden sm:flex flex-col items-start">
            <span className="text-sm font-medium max-w-[100px] truncate leading-none">{displayName}</span>
            {isPro ? (
              <span className="text-[10px] text-primary font-bold flex items-center gap-0.5 mt-0.5">
                <Crown className="w-2.5 h-2.5" /> PRO
              </span>
            ) : (
              <span className="text-[10px] text-muted-foreground mt-0.5">Free</span>
            )}
          </div>
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute right-0 top-full mt-2 w-60 glass rounded-xl border border-border shadow-2xl z-50 overflow-hidden"
            >
              {/* Profile header with ant mascot */}
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center gap-3 mb-1">
                  <div className="relative">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={displayName} className="w-9 h-9 rounded-full border border-border object-cover" />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-bold text-primary">
                        {initial}
                      </div>
                    )}
                    {isPro && (
                      <img src={antCharacter} alt="" className="absolute -bottom-1 -right-1 w-5 h-5 object-contain" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold truncate">{displayName}</div>
                      {isPro ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary border border-primary/30 font-bold flex items-center gap-0.5 shrink-0">
                          <Crown className="w-2.5 h-2.5" /> PRO
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border font-medium shrink-0">
                          FREE
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">{user?.email}</div>
                  </div>
                </div>
              </div>

              {/* Upgrade banner (free only) */}
              {!isPro && (
                <button
                  onClick={() => { setShowPricing(true); setOpen(false); }}
                  className="w-full flex items-center gap-2 px-4 py-2.5 bg-primary/10 hover:bg-primary/15 transition-colors border-b border-border"
                >
                  <Zap className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-semibold text-primary">Pro로 업그레이드 · ₩4,900/월</span>
                </button>
              )}

              {/* Links */}
              <div className="py-1">
                <Link to="/portfolio" onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-secondary transition-colors">
                  <Wallet className="w-4 h-4 text-primary" /> 포트폴리오
                </Link>
                <Link to="/watchlist" onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-secondary transition-colors">
                  <Star className="w-4 h-4 text-warning" /> 관심종목
                </Link>
                <Link to="/alerts" onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-secondary transition-colors">
                  <Bell className="w-4 h-4 text-gain" /> 알림 설정
                </Link>
              </div>

              <div className="border-t border-border py-1">
                <button
                  onClick={() => { signOut(); setOpen(false); }}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-loss hover:bg-loss/10 transition-colors w-full text-left"
                >
                  <LogOut className="w-4 h-4" /> 로그아웃
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showPricing && <PricingModal onClose={() => setShowPricing(false)} />}
      </AnimatePresence>
    </>
  );
}
