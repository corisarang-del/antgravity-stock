import lightgbm as lgb
from sklearn.model_selection import TimeSeriesSplit
import pandas as pd
import numpy as np

class StockRecommender:
    def __init__(self):
        self.model = lgb.LGBMClassifier(
            n_estimators=500,
            learning_rate=0.05,
            num_leaves=31,
            class_weight='balanced',  # 급등주 불균형 처리
            random_state=42
        )
    
    def create_labels(self, df, forward_days=10, threshold=0.10):
        """10일 후 10% 이상 상승하면 1 (매수 추천), 아니면 0"""
        temp_df = df.copy()
        # yfinance 데이터 컬럼 소문자 처리
        if isinstance(temp_df.columns, pd.MultiIndex):
            temp_df.columns = [c[0].lower() for c in temp_df.columns]
        else:
            temp_df.columns = [c.lower() for c in temp_df.columns]

        temp_df['future_return'] = temp_df['close'].pct_change(forward_days).shift(-forward_days)
        temp_df['label'] = (temp_df['future_return'] > threshold).astype(int)
        return temp_df
    
    def train(self, X, y):
        """시계열 교차검증을 활용한 학습"""
        tscv = TimeSeriesSplit(n_splits=5)
        # LightGBM fit 시 eval_set 및 early_stopping은 최신 sklearn 스타일로 처리 가능
        for train_idx, val_idx in tscv.split(X):
            X_train, X_val = X.iloc[train_idx], X.iloc[val_idx]
            y_train, y_val = y.iloc[train_idx], y.iloc[val_idx]
            
            self.model.fit(
                X_train, y_train,
                eval_set=[(X_val, y_val)],
                callbacks=[lgb.early_stopping(50)]
            )
            break # 데모를 위해 첫 분할만 학습하거나 전체 루프 수행
    
    def recommend(self, candidates_df, top_n=10):
        """상위 N개 종목 추천"""
        probs = self.model.predict_proba(candidates_df)[:, 1]
        result_df = candidates_df.copy()
        result_df['score'] = probs
        return result_df.nlargest(top_n, 'score')

if __name__ == "__main__":
    print("✅ StockRecommender (AntRanker) 모듈 로드 완료")
