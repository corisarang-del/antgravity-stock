import { BookOpen, Crown, Home, Lightbulb, Zap, type LucideIcon } from "lucide-react";

export interface AppShellTab {
  path: string;
  label: string;
  icon: LucideIcon;
}

const BASE_TABS: AppShellTab[] = [
  { path: "/home", label: "홈", icon: Home },
  { path: "/diary", label: "개미의 일기", icon: BookOpen },
  { path: "/tips", label: "꿀팁정보", icon: Lightbulb },
];

export function buildTabs(isPro: boolean): AppShellTab[] {
  return [
    ...BASE_TABS,
    isPro
      ? { path: "/pro", label: "프로 대시보드", icon: Crown }
      : { path: "/upgrade", label: "업그레이드", icon: Zap },
  ];
}
