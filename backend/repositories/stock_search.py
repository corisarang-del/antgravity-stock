from __future__ import annotations

from data.pipeline import TICKERS


class StockSearchRepository:
    def search(self, query: str) -> list[dict]:
        normalized = query.strip().lower()
        if not normalized:
            return []

        matches = []
        for symbol, meta in TICKERS.items():
            haystacks = [symbol.lower(), meta["name"].lower(), meta["market"].lower()]
            if any(normalized in hay for hay in haystacks):
                matches.append(
                    {
                        "symbol": symbol,
                        "display_name": meta["name"],
                        "market": meta["market"],
                        "exchange": "KRX" if meta["market"] == "KR" else "NASDAQ/NYSE",
                    }
                )
        return matches[:10]
