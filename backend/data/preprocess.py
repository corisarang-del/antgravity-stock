"""
데이터 전처리 - LSTM 입력 시퀀스 생성

입력 피처: [종가, 거래량, VIX, Fear&Greed지수, RSI, MACD]
출력: D+1~D+5 종가 예측 (메인) + 변동성 σ (보조)
"""
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler


LOOKBACK = 60       # 과거 60일 시퀀스
HORIZON = 1        # 내일 종가 예측
FEATURES = ["open", "high", "low", "close", "volume", "vix", "rsi", "ma5", "ma20", "earnings_dday"]


def calc_rsi(series: pd.Series, period: int = 14) -> pd.Series:
    delta = series.diff()
    gain = delta.clip(lower=0).rolling(period).mean()
    loss = (-delta.clip(upper=0)).rolling(period).mean()
    rs = gain / loss
    return 100 - (100 / (1 + rs))


def calc_macd(series: pd.Series) -> pd.Series:
    ema12 = series.ewm(span=12).mean()
    ema26 = series.ewm(span=26).mean()
    return ema12 - ema26


def calc_ma(series: pd.Series, period: int) -> pd.Series:
    return series.rolling(window=period).mean()


def calc_earnings_dday(df: pd.DataFrame, symbol: str) -> pd.Series:
    """
    실적 발표 D-Day 계산 (임시: 0으로 채움. v2에서 실데이터 연동)
    학습 데이터에 과거 실적일 태깅이 필요함.
    """
    return pd.Series(0, index=df.index)


def build_features(df: pd.DataFrame, vix_df: pd.DataFrame = None,
                   fg_df: pd.DataFrame = None) -> pd.DataFrame:
    """
    OHLCV 데이터프레임에 보조 지표를 추가.
    vix_df가 None이면 0으로 채움.
    """
    result = df[["open", "high", "low", "close", "volume"]].copy()
    result["rsi"] = calc_rsi(df["close"])
    result["ma5"] = calc_ma(df["close"], 5)
    result["ma20"] = calc_ma(df["close"], 20)
    result["earnings_dday"] = calc_earnings_dday(df, "TEMP") # symbol 필요시 전달

    if vix_df is not None:
        # VIX는 종가만 사용
        vix_close = vix_df["close"] if "close" in vix_df.columns else vix_df.iloc[:, 0]
        result["vix"] = vix_close.reindex(result.index).ffill()
    else:
        result["vix"] = 0.0

    return result[FEATURES].dropna()


def make_sequences(df: pd.DataFrame) -> tuple[np.ndarray, np.ndarray, MinMaxScaler]:
    """
    정규화 + 시퀀스 생성.
    Returns: (X, y, scaler) → X shape: (samples, LOOKBACK, features)
    """
    scaler = MinMaxScaler()
    scaled = scaler.fit_transform(df.values)

    X, y = [], []
    for i in range(LOOKBACK, len(scaled) - HORIZON):
        X.append(scaled[i - LOOKBACK:i])
        # 타겟: HORIZON일치의 종가 (인덱스 0 = close)
        y.append(scaled[i:i + HORIZON, 0])

    return np.array(X), np.array(y), scaler
