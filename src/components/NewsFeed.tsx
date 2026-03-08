import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, ExternalLink } from "lucide-react";
import { NewsItem } from "@/data/stockData";

interface NewsFeedProps {
  news: NewsItem[];
}

const SentimentIcon = ({ sentiment }: { sentiment: NewsItem["sentiment"] }) => {
  if (sentiment === "positive") return <TrendingUp className="w-3.5 h-3.5 text-gain" />;
  if (sentiment === "negative") return <TrendingDown className="w-3.5 h-3.5 text-loss" />;
  return <Minus className="w-3.5 h-3.5 text-warning" />;
};

const sentimentLabel: Record<NewsItem["sentiment"], string> = {
  positive: "긍정",
  negative: "부정",
  neutral: "중립",
};

const sentimentClass: Record<NewsItem["sentiment"], string> = {
  positive: "bg-gain/10 text-gain border-gain/20",
  negative: "bg-loss/10 text-loss border-loss/20",
  neutral: "bg-warning/10 text-warning border-warning/20",
};

export function NewsFeed({ news }: NewsFeedProps) {
  return (
    <div className="space-y-2">
      {news.map((item, i) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          className="glass rounded-xl p-4 hover:border-primary/30 transition-colors cursor-pointer group"
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
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
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
