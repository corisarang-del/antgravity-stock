from __future__ import annotations

import argparse
import os
import socket
import subprocess
import sys
import time
from pathlib import Path

import uvicorn


ROOT = Path(__file__).resolve().parents[2]
BACKEND_DIR = ROOT / "backend"


def is_port_available(host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        try:
            sock.bind((host, port))
        except OSError:
            return False
    return True


def print_port_debug(port: int) -> None:
    print(f"[AntGravity] 포트 {port}를 이미 다른 프로세스가 사용 중이거나, 직전 종료 후 아직 해제되지 않았어.", file=sys.stderr)
    print(f"[AntGravity] 아래 명령으로 점유 프로세스를 확인해.", file=sys.stderr)
    print(f"  cmd /c netstat -ano | findstr LISTENING | findstr :{port}", file=sys.stderr)
    try:
        subprocess.run(
            ["cmd", "/c", f"netstat -ano | findstr LISTENING | findstr :{port}"],
            check=False,
        )
    except Exception:
        pass


def main() -> int:
    parser = argparse.ArgumentParser(description="Run AntGravity backend dev server.")
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8001)
    parser.add_argument("--reload", action="store_true")
    args = parser.parse_args()

    os.chdir(ROOT)
    sys.path.insert(0, str(BACKEND_DIR))
    os.environ.setdefault("PYTHONPATH", str(BACKEND_DIR))

    for _ in range(5):
        if is_port_available(args.host, args.port):
            break
        time.sleep(1)
    else:
        print_port_debug(args.port)
        return 1

    uvicorn.run(
        "main:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
