from __future__ import annotations

from datetime import datetime

from schemas.dashboard import PortfolioHolding, PortfolioSummary


class PortfolioCalculator:
    def enrich_holding(self, holding: dict, current_price: float) -> PortfolioHolding:
        buy_price = float(holding["buy_price"])
        quantity = float(holding["quantity"])
        cost_basis = buy_price * quantity
        market_value = current_price * quantity
        profit_loss = market_value - cost_basis
        return_rate = (profit_loss / cost_basis * 100) if cost_basis else 0.0
        return PortfolioHolding(
            id=holding["id"],
            symbol=holding["symbol"],
            buy_price=buy_price,
            quantity=quantity,
            current_price=round(current_price, 2),
            profit_loss=round(profit_loss, 2),
            return_rate=round(return_rate, 2),
        )

    def summarize(self, holdings: list[PortfolioHolding]) -> PortfolioSummary:
        total_cost_basis = sum(item.buy_price * item.quantity for item in holdings)
        total_market_value = sum((item.current_price or 0.0) * item.quantity for item in holdings)
        total_profit_loss = total_market_value - total_cost_basis
        total_return_rate = (total_profit_loss / total_cost_basis * 100) if total_cost_basis else 0.0
        return PortfolioSummary(
            total_cost_basis=round(total_cost_basis, 2),
            total_market_value=round(total_market_value, 2),
            total_profit_loss=round(total_profit_loss, 2),
            total_return_rate=round(total_return_rate, 2),
            calculated_at=datetime.utcnow().isoformat(),
        )
