from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import yfinance as yf
import pandas as pd

class AnomalyDetector:
    def __init__(self, contamination=0.05):
        self.model = IsolationForest(
            contamination=contamination,  # 상위 5%를 이상치로
            n_estimators=200,
            random_state=42
        )
        self.scaler = StandardScaler()
    
    def build_features(self, ticker):
        """기본 기술적 지표 및 변동성 피처 생성"""
        df = yf.download(ticker, period='6mo', interval='1d', progress=False)
        if df.empty:
            return df
            
        # 컬럼명 소문자로 통일 (MultiIndex 처리 포함)
        if isinstance(df.columns, pd.MultiIndex):
            df.columns = [c[0].lower() for c in df.columns]
        else:
            df.columns = [c.lower() for c in df.columns]

        df['volume_ratio'] = df['volume'] / df['volume'].rolling(20).mean()
        df['price_change_5d'] = df['close'].pct_change(5)
        df['volatility'] = df['close'].pct_change().rolling(20).std()
        
        # RSI 계산
        delta = df['close'].diff()
        gain = delta.clip(lower=0).rolling(14).mean()
        loss = -delta.clip(upper=0).rolling(14).mean()
        df['rsi'] = 100 - (100 / (1 + gain/loss))
        
        return df.dropna()
    
    def detect(self, features_df):
        """이상치 탐지 수행"""
        # 모델 학습에 필요한 숫자형 컬럼만 선택
        X_df = features_df[['volume_ratio', 'price_change_5d', 'volatility', 'rsi']]
        X = self.scaler.fit_transform(X_df)
        predictions = self.model.fit_predict(X)
        scores = self.model.score_samples(X)
        # -1 = 이상치(급등 후보), 1 = 정상
        return predictions, scores

if __name__ == "__main__":
    # 간단한 테스트
    detector = AnomalyDetector()
    data = detector.build_features("NVDA")
    if not data.empty:
        preds, scores = detector.detect(data)
        data['is_anomaly'] = preds
        print(data[data['is_anomaly'] == -1].tail())
