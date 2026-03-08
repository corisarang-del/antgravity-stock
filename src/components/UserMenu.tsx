import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LogOut, User, Wallet, Star, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export function UserMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
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
        <span className="hidden sm:block text-sm font-medium max-w-[100px] truncate">{displayName}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-52 glass rounded-xl border border-border shadow-2xl z-50 overflow-hidden"
          >
            {/* Profile header */}
            <div className="px-4 py-3 border-b border-border">
              <div className="text-xs font-semibold truncate">{displayName}</div>
              <div className="text-xs text-muted-foreground truncate">{user?.email}</div>
            </div>

            {/* Links */}
            <div className="py-1">
              <Link
                to="/portfolio"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-secondary transition-colors"
              >
                <Wallet className="w-4 h-4 text-primary" /> 포트폴리오
              </Link>
              <Link
                to="/watchlist"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-secondary transition-colors"
              >
                <Star className="w-4 h-4 text-warning" /> 관심종목
              </Link>
              <Link
                to="/alerts"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-secondary transition-colors"
              >
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
  );
}
