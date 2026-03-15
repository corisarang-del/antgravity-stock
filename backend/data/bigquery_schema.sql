-- 예측 저장
CREATE TABLE stock_predictions (
    prediction_date DATE,
    ticker STRING,
    anomaly_score FLOAT64,
    recommendation_score FLOAT64,
    rank INT64
);

-- 30일 후 실제 수익률 업데이트
CREATE TABLE actual_returns (
    prediction_date DATE,
    ticker STRING,
    return_7d FLOAT64,
    return_14d FLOAT64,
    return_30d FLOAT64
);

-- 성능 뷰
CREATE VIEW model_performance AS
SELECT 
    p.prediction_date,
    AVG(a.return_30d) as avg_30d_return,
    COUNTIF(a.return_30d > 0.10) / COUNT(*) as hit_rate,
    CORR(p.recommendation_score, a.return_30d) as score_return_correlation
FROM stock_predictions p
JOIN actual_returns a USING (prediction_date, ticker)
GROUP BY 1;
