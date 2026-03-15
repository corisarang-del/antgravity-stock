import pandas as pd
import os
from datetime import datetime

def generate_dashboard():
    history_path = os.path.join(os.path.dirname(__file__), "..", "reports", "historical_results.csv")
    research_path = os.path.join(os.path.dirname(__file__), "..", "reports", "research_results.csv")
    dashboard_path = os.path.join(os.path.dirname(__file__), "..", "reports", "performance_dashboard.md")
    
    md = "# 🐜 AntGravity 통합 성과 대시보드\n\n"
    md += f"최근 업데이트: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
    
    # --- Part 1. Model 1: AntLSTM-Reg (Main) ---
    md += "## 📈 [Model 1] AntLSTM-Reg 성과 (Hybrid)\n"
    md += "> [!TIP]\n> LSTM(비선형 패턴)과 회귀분석(선형 추세)을 결합한 하이브리드 모델입니다.\n"
    md += "> \n"
    md += "> **판정 기준**: ✅/❌는 **방향성 적중 여부**(Directional Accuracy)를 의미합니다. (실제 주가가 예측한 방향대로 움직였는지 여부)\n\n"
    if os.path.exists(history_path):
        df = pd.read_csv(history_path)
        if not df.empty:
            total_accuracy = (df['hit'].sum() / len(df)) * 100
            md += f"- **누적 적중률**: `{total_accuracy:.1f}%` ({df['hit'].sum()}/{len(df)})\n"
            md += f"- **추적 기간**: `{df['date'].min()}` ~ `{df['date'].max()}`\n\n"
            
            # Daily History Summary
            md += "### 일별 성과 이력\n"
            md += "| 날짜 | 적중/전체 | 일일 적중률 |\n"
            md += "| :--- | :---: | :---: |\n"
            
            daily_stats = df.groupby('date')['hit'].agg(['sum', 'count']).sort_index(ascending=False)
            for date, stats in daily_stats.iterrows():
                daily_acc = (stats['sum'] / stats['count']) * 100
                md += f"| {date} | {stats['sum']}/{stats['count']} | `{daily_acc:.1f}%` |\n"
            
            md += "\n### 최근 예측 상세 (Recent 10)\n"
            md += "| 날짜 | 종목 (기업명) | 예측가 | 실제가 | 결과 |\n"
            md += "| :--- | :--- | :--- | :--- | :--- |\n"
            for _, row in df.sort_values(['date', 'symbol'], ascending=[False, True]).head(10).iterrows():
                icon = "✅" if row['hit'] else "❌"
                md += f"| {row['date']} | **{row['symbol']}** ({row['name']}) | {row['predicted_close']:,.0f} | {row['actual_close']:,.0f} | {icon} |\n"
        else:
            md += "*기록된 데이터가 없습니다.*\n"
    else:
        md += "*데이터 파일이 아직 생성되지 않았습니다.*\n"
    
    # --- New: Tomorrow's Prediction (v1 Baseline) ---
    tomorrow = (datetime.now() + pd.Timedelta(days=1)).strftime('%Y-%m-%d')
    tomorrow_path = os.path.join(os.path.dirname(__file__), "..", "reports", "daily_csv", f"prediction_{tomorrow}.csv")
    
    md += f"\n### 🔮 내일({tomorrow})의 예측 전략\n"
    if os.path.exists(tomorrow_path):
        tdf = pd.read_csv(tomorrow_path)
        if not tdf.empty:
            md += "| 종목 (기업명) | 예측가 | 변동률 | 전략 태그 | 사유 |\n"
            md += "| :--- | :--- | :---: | :---: | :--- |\n"
            for _, row in tdf.sort_values('priority_score', ascending=False).iterrows():
                import ast
                pred_price = ast.literal_eval(row['predicted_prices'])[0] if isinstance(row['predicted_prices'], str) else row['predicted_prices'][0]
                diff_pct = ((pred_price - row['last_close']) / row['last_close']) * 100
                md += f"| **{row['symbol']}** ({row['name']}) | {pred_price:,.0f} | `{diff_pct:+.2f}%` | {row['tag']} | {row['reason']} |\n"
        else:
            md += "*예측 데이터가 로드되지 않았습니다.*\n"
    else:
        md += f"*{tomorrow}일자 예측 데이터가 아직 생성되지 않았습니다.*\n"

    md += "\n---\n\n"
    
    md += "\n---\n\n"
    
    # --- Part 2. Research Models (Model 2 & 3) ---
    md += "## 🧪 연구용 모델 성과 (Experimental)\n"
    md += "> [!NOTE]\n> Model 2 & 3는 연구 및 성능 검증 전용이며, UI에는 노출되지 않습니다.\n\n"
    
    if os.path.exists(research_path):
        rdf = pd.read_csv(research_path)
        if not rdf.empty:
            # Model 2: AntRadar
            md += "### 📡 [Model 2] AntRadar (이상치 탐지)\n"
            radar_df = rdf[rdf['model'] == 'AntRadar']
            if not radar_df.empty:
                for market in ['US', 'KR']:
                    m_df = radar_df[radar_df['market'] == market]
                    if not m_df.empty:
                        md += f"#### {market} 시장\n"
                        md += "| 날짜 | 종목 (기업명) | 이상치 점수 | 결과 (7일 후) |\n"
                        md += "| :--- | :--- | :--- | :--- |\n"
                        for _, row in m_df.sort_values('date', ascending=False).head(5).iterrows():
                            res = row['result_7d'] if pd.notna(row['result_7d']) else "측정 중..."
                            md += f"| {row['date']} | **{row['symbol']}** ({row['name']}) | `{row['score']:.4f}` | {res} |\n"
                        md += "\n"
            else:
                md += "*피탐지 데이터 없음*\n\n"
            
            # Model 3: AntRanker
            md += "### 🏆 [Model 3] AntRanker (추천 랭킹)\n"
            ranker_df = rdf[rdf['model'] == 'AntRanker']
            if not ranker_df.empty:
                for market in ['US', 'KR']:
                    m_df = ranker_df[ranker_df['market'] == market]
                    if not m_df.empty:
                        md += f"#### {market} 시장\n"
                        md += "| 날짜 | 랭킹 | 종목 (기업명) | 추천 점수 | 결과 (30일 후) |\n"
                        md += "| :--- | :--- | :--- | :--- | :--- |\n"
                        for _, row in m_df.sort_values(['date', 'rank'], ascending=[False, True]).head(10).iterrows():
                            res = row['result_30d'] if pd.notna(row['result_30d']) else "측정 중..."
                            md += f"| {row['date']} | `{row['rank']}` | **{row['symbol']}** ({row['name']}) | `{row['score']:.4f}` | {res} |\n"
                        md += "\n"
            else:
                md += "*랭킹 데이터 없음*\n"
        else:
            md += "*기록된 연구 데이터가 없습니다.*\n"
    else:
        md += "*연구용 데이터 파일이 없습니다.*\n"

    md += "\n\n---\n*💡 본 대시보드는 `update_dashboard.py`에 의해 통합 생성됩니다.*"

    # --- Save to both locations ---
    root_dashboard_path = os.path.join(os.path.dirname(__file__), "..", "..", "performance_dashboard.md")
    
    for path in [dashboard_path, root_dashboard_path]:
        with open(path, "w", encoding="utf-8-sig") as f:
            f.write(md)
        print(f"✨ 통합 대시보드 생성 완료: {path}")

if __name__ == "__main__":
    generate_dashboard()
