from __future__ import annotations

from pathlib import Path

import numpy as np
import torch
import torch.nn as nn

MODEL_VERSION = "v1"
CHECKPOINT_DIR = Path(__file__).parent / "checkpoints"
CHECKPOINT_DIR.mkdir(exist_ok=True)


class AntLSTM(nn.Module):
    def __init__(
        self,
        input_size: int = 10,
        hidden_size: int = 64,
        num_layers: int = 2,
        horizon: int = 1,
        dropout: float = 0.2,
    ) -> None:
        super().__init__()
        self.horizon = horizon
        self.lstm = nn.LSTM(
            input_size=input_size,
            hidden_size=hidden_size,
            num_layers=num_layers,
            dropout=dropout,
            batch_first=True,
        )
        self.fc = nn.Linear(hidden_size, horizon)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        lstm_out, _ = self.lstm(x)
        last_hidden = lstm_out[:, -1, :]
        return self.fc(last_hidden)


class AntPredictor:
    def __init__(self, symbol: str) -> None:
        self.symbol = symbol
        self.version = MODEL_VERSION
        self.model = AntLSTM()
        self.checkpoint_path = CHECKPOINT_DIR / f"{self.symbol.replace('.', '_')}_{self.version}.pt"
        self._loaded_mtime: float | None = None
        self.model.eval()
        self._load()

    def _load(self) -> None:
        if self.checkpoint_path.exists():
            self.model.load_state_dict(torch.load(self.checkpoint_path, map_location="cpu", weights_only=True))
            self._loaded_mtime = self.checkpoint_path.stat().st_mtime
            print(f"checkpoint loaded: {self.checkpoint_path.name}")
        else:
            print(f"checkpoint missing ({self.checkpoint_path.name}); using untrained model")

    def _reload_if_updated(self) -> None:
        if not self.checkpoint_path.exists():
            return
        current_mtime = self.checkpoint_path.stat().st_mtime
        if self._loaded_mtime is None or current_mtime > self._loaded_mtime:
            self._load()

    def predict(self, sequence: np.ndarray) -> dict:
        self._reload_if_updated()
        x = torch.tensor(sequence, dtype=torch.float32).unsqueeze(0)
        with torch.no_grad():
            prediction = self.model(x).squeeze(0).numpy()

        sigma = float(np.std(prediction))
        risk = "Low" if sigma < 0.01 else "Mid" if sigma < 0.03 else "High"
        return {
            "predicted_prices": prediction.tolist(),
            "volatility": sigma,
            "risk_level": risk,
        }

    @staticmethod
    def save(model: AntLSTM, symbol: str) -> None:
        checkpoint_path = CHECKPOINT_DIR / f"{symbol.replace('.', '_')}_{MODEL_VERSION}.pt"
        torch.save(model.state_dict(), checkpoint_path)
        print(f"checkpoint saved: {checkpoint_path}")
