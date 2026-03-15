"""패키지 임포트 검증 스크립트"""
import sys
print(f"Python: {sys.version}")
try:
    import torch
    print(f"✅ torch: {torch.__version__}")
except ImportError as e:
    print(f"❌ torch: {e}")

try:
    import fastapi
    print(f"✅ fastapi: {fastapi.__version__}")
except ImportError as e:
    print(f"❌ fastapi: {e}")

try:
    import pandas as pd
    print(f"✅ pandas: {pd.__version__}")
except ImportError as e:
    print(f"❌ pandas: {e}")

try:
    import numpy as np
    print(f"✅ numpy: {np.__version__}")
except ImportError as e:
    print(f"❌ numpy: {e}")

try:
    import yfinance as yf
    print(f"✅ yfinance: {yf.__version__}")
except ImportError as e:
    print(f"❌ yfinance: {e}")

try:
    import sklearn
    print(f"✅ scikit-learn: {sklearn.__version__}")
except ImportError as e:
    print(f"❌ scikit-learn: {e}")

try:
    import supabase
    print(f"✅ supabase: {supabase.__version__}")
except ImportError as e:
    print(f"❌ supabase: {e}")

try:
    import google.generativeai as genai
    print(f"✅ google-generativeai: OK")
except ImportError as e:
    print(f"❌ google-generativeai: {e}")

print("\n🎉 All imports done.")
