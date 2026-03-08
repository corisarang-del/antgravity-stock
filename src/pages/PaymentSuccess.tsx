import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Loader2, XCircle, Brain } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/contexts/AuthContext";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const { confirmPayment } = useSubscription();
  const { user } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const authKey = searchParams.get("authKey");
    const customerKey = searchParams.get("customerKey");

    if (!authKey || !customerKey) {
      setErrorMsg("잘못된 결제 정보입니다.");
      setStatus("error");
      return;
    }

    if (!user) {
      // 유저 로드 대기
      return;
    }

    confirmPayment(authKey, customerKey).then(({ success, error }) => {
      if (success) {
        setStatus("success");
      } else {
        setErrorMsg(error ?? "결제 승인에 실패했습니다.");
        setStatus("error");
      }
    });
  }, [user]);

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

        {status === "loading" && (
          <>
            <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">결제를 확인하고 있습니다...</p>
          </>
        )}

        {status === "success" && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <CheckCircle className="w-16 h-16 text-gain mx-auto mb-4" />
            </motion.div>
            <h1 className="text-xl font-bold mb-2">Pro 구독 완료!</h1>
            <p className="text-sm text-muted-foreground mb-6">
              이제 모든 Pro 기능을 무제한으로 사용하실 수 있습니다.
            </p>
            <Link
              to="/"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              시작하기
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-16 h-16 text-loss mx-auto mb-4" />
            <h1 className="text-xl font-bold mb-2">결제 실패</h1>
            <p className="text-sm text-muted-foreground mb-6">{errorMsg}</p>
            <Link
              to="/"
              className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-secondary text-sm font-semibold hover:bg-secondary/80 transition-colors"
            >
              돌아가기
            </Link>
          </>
        )}
      </motion.div>
    </div>
  );
};

export default PaymentSuccess;
