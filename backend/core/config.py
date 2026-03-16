"""
앤트 그래비티 - 서버 설정 (환경변수 기반)

⚠️ 보안 규칙:
- 모든 API 키는 .env 파일에서만 로드
- 절대 코드에 직접 키를 하드코딩하지 말 것
- SERVICE_ROLE_KEY, GEMINI_API_KEY는 절대 프론트엔드로 전달 금지
"""
from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # 앱 환경
    APP_ENV: str = "development"

    # Supabase (서버사이드 전용 - 절대 프론트로 노출 금지)
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""  # ⚠️ 서버사이드 전용

    # Gemini API (서버사이드 전용)
    # 비용 최소화: gemini-2.0-flash 모델 고정
    GEMINI_API_KEY: str = ""  # ⚠️ 서버사이드 전용
    GEMINI_MODEL: str = "gemini-2.0-flash"  # 비용 최소화 모델

    # CORS — 쉼표 구분 문자열로 받아서 파싱
    # .env 예시: CORS_ORIGINS=http://localhost:3000,https://antgravity.app
    CORS_ORIGINS: str = ",".join([
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3001",
        "http://localhost:3002",
        "http://127.0.0.1:3002",
    ])

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    # 캐싱 설정 (API 비용 절감 핵심!)
    DIARY_CACHE_HOURS: int = 24       # Gemini 호출: 하루 1회만
    SENTIMENT_CACHE_MINUTES: int = 30  # 감성 분석: 30분 캐싱
    STOCK_CACHE_MINUTES: int = 15     # 주가: 15분 캐싱

    # DART OpenAPI (IPO 일정 조회)
    # https://opendart.fss.or.kr 에서 발급
    DART_API_KEY: str = ""

    # PortOne 결제 (서버사이드 전용)
    PORTONE_SECRET_KEY: str = ""  # ⚠️ 절대 프론트 노출 금지

    model_config = {
        "env_file": ".env",       # 로컬 개발
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


settings = Settings()
