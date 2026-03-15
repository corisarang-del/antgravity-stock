from __future__ import annotations

import os
import sys
from datetime import datetime, timedelta
from pathlib import Path

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


BASE_DIR = Path(__file__).resolve().parents[1]
LOGS_DIR = BASE_DIR / "logs"
REPORTS_DIR = BASE_DIR / "reports"
LOG_RETENTION_DAYS = 7
REPORT_RETENTION_DAYS = 30


def _cleanup_directory(directory: Path, patterns: list[str], older_than_days: int) -> list[str]:
    if not directory.exists():
        return []

    cutoff = datetime.now() - timedelta(days=older_than_days)
    deleted: list[str] = []

    for pattern in patterns:
        for path in directory.glob(pattern):
            if not path.is_file():
                continue
            modified_at = datetime.fromtimestamp(path.stat().st_mtime)
            if modified_at >= cutoff:
                continue
            path.unlink(missing_ok=True)
            deleted.append(str(path))

    return deleted


def cleanup_runtime_artifacts() -> dict:
    deleted_logs = _cleanup_directory(LOGS_DIR, ["*.log"], LOG_RETENTION_DAYS)
    deleted_reports = _cleanup_directory(
        REPORTS_DIR,
        [
            "daily_retrain_*.csv",
            "daily_retrain_compare_*.csv",
            "daily_retrain_compare_*.md",
            "precomputed_prediction_*.csv",
        ],
        REPORT_RETENTION_DAYS,
    )
    return {
        "deleted_logs": deleted_logs,
        "deleted_reports": deleted_reports,
    }


if __name__ == "__main__":
    result = cleanup_runtime_artifacts()
    print(f"deleted logs: {len(result['deleted_logs'])}")
    print(f"deleted reports: {len(result['deleted_reports'])}")
