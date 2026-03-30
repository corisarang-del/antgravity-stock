from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from data.preprocess import HORIZON

router = APIRouter()


class PredictRequest(BaseModel):
    symbol: str
    horizon: int = HORIZON


@router.post("/")
async def predict(req: PredictRequest):
    from services.prediction_service import get_prediction_payload

    return get_prediction_payload(req.symbol, horizon=req.horizon)
