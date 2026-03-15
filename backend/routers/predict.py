from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from data.preprocess import HORIZON
from services.prediction_service import get_prediction_payload

router = APIRouter()


class PredictRequest(BaseModel):
    symbol: str
    horizon: int = HORIZON


@router.post("/")
async def predict(req: PredictRequest):
    return get_prediction_payload(req.symbol, horizon=req.horizon)
