"""Supabase 클라이언트 (서버사이드 전용 - SERVICE_ROLE_KEY 사용)"""
from supabase import create_client, Client
from core.config import settings

# SERVICE_ROLE_KEY: 행 수준 보안(RLS)을 우회할 수 있으므로 서버에서만 사용
_client: Client | None = None


def get_supabase() -> Client:
    global _client
    if _client is None:
        _client = create_client(
            settings.SUPABASE_URL,
            settings.SUPABASE_SERVICE_ROLE_KEY,  # ⚠️ 서버사이드 전용
        )
    return _client
