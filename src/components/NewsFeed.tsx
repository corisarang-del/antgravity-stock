import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, ExternalLink } from "lucide-react";

interface NewsFeedProps {
  news: NewsFeedItem[];
  emptyMessage?: string;
}

export interface NewsFeedItem {
  id: string;
  title: string;
  source: string;
  time: string;
  sentiment: "positive" | "negative" | "neutral";
  description?: string;
  url?: string;
}

const SentimentIcon = ({ sentiment }: { sentiment: NewsFeedItem["sentiment"] }) => {
  if (sentiment === "positive") return <TrendingUp className="w-3.5 h-3.5 text-gain" />;
  if (sentiment === "negative") return <TrendingDown className="w-3.5 h-3.5 text-loss" />;
  return <Minus className="w-3.5 h-3.5 text-warning" />;
};

const sentimentLabel: Record<NewsFeedItem["sentiment"], string> = {
  positive: "긍정",
  negative: "부정",
  neutral: "중립",
};

const sentimentClass: Record<NewsFeedItem["sentiment"], string> = {
  positive: "bg-gain/10 text-gain border-gain/20",
  negative: "bg-loss/10 text-loss border-loss/20",
  neutral: "bg-warning/10 text-warning border-warning/20",
};

export function NewsFeed({ news, emptyMessage = "표시할 뉴스가 없다." }: NewsFeedProps) {
  if (news.length === 0) {
    return (
      <div className="glass rounded-xl p-5 text-sm text-muted-foreground text-center">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {news.map((item, i) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
        className="glass rounded-xl p-4 hover:border-primary/30 transition-colors group"
      >
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            <SentimentIcon sentiment={item.sentiment} />
          </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-sm font-medium leading-snug group-hover:text-primary transition-colors line-clamp-2">
                  {item.title}
                </p>
                {item.url ? (
                  <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                ) : null}
              </div>
              {item.description ? (
                <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                  {item.description}
                </p>
              ) : null}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground font-medium">{item.source}</span>
                <span className="text-muted-foreground/40 text-xs">·</span>
                <span className="text-xs text-muted-foreground">{item.time}</span>
                <span className={`text-xs px-1.5 py-0.5 rounded border font-medium flex items-center gap-1 ${sentimentClass[item.sentiment]}`}>
                  {sentimentLabel[item.sentiment]}
                </span>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
