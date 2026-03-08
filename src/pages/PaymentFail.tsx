import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { XCircle, Brain } from "lucide-react";

const PaymentFail = () => {
  const [searchParams] = useSearchParams();
  const message = searchParams.get("message") ?? "결제가 취소되었습니다.";
  const code = searchParams.get("code");

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="glass rounded-2xl p-8 max-w-sm w-full text-center border border-border shadow-2xl"
      >
        <Link to="/" className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center">
            <Brain className="w-4 h-4 text-primary" />
          </div>
          <span className="font-bold gradient-text-primary text-lg">StockAI</span>
        </Link>

        <XCircle className="w-16 h-16 text-loss mx-auto mb-4" />
        <h1 className="text-xl font-bold mb-2">결제 실패</h1>
        <p className="text-sm text-muted-foreground mb-1">{message}</p>
        {code && <p className="text-xs text-muted-foreground/60 font-mono mb-6">코드: {code}</p>}

        <Link
          to="/"
          className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-secondary text-sm font-semibold hover:bg-secondary/80 transition-colors"
        >
          돌아가기
        </Link>
      </motion.div>
    </div>
  );
};

export default PaymentFail;
