from __future__ import annotations

import time
from datetime import datetime, timedelta

import httpx
from fastapi import APIRouter, HTTPException

from core.config import settings

router = APIRouter()

# ─── 24h in-memory cache ────────────────────────────────────────────────────

class _TtlCache:
    def __init__(self, ttl_seconds: int) -> None:
        self._ttl = ttl_seconds
        self._value: list | None = None
        self._expires_at: float = 0.0

    def get(self) -> list | None:
        if time.time() < self._expires_at:
            return self._value
        return None

    def set(self, value: list) -> None:
        self._value = value
        self._expires_at = time.time() + self._ttl


_ipo_cache = _TtlCache(ttl_seconds=24 * 60 * 60)

# ─── Hard-coded fallback data ────────────────────────────────────────────────

IPO_ITEMS = [
    {
        "id": "01859500",
        "company_name": "아이엠바이오로직스",
        "listing_type": "비상장",
        "status": "upcoming",
        "subscription_start_date": "2026-03-11",
        "subscription_end_date": "2026-03-12",
        "offer_price": 19000,
        "lead_underwriter": "한국투자증권",
        "summary": "혁신 항체신약 개발 전문기업",
        "description": "혁신 항체신약 개발 전문기업으로 자가면역질환과 면역항암 분야의 파이프라인을 보유하고 있다.",
        "detail_url": "/tips/ipo/01859500",
    },
    {
        "id": "01445024",
        "company_name": "한패스",
        "listing_type": "비상장",
        "status": "upcoming",
        "subscription_start_date": "2026-03-16",
        "subscription_end_date": "2026-03-17",
        "offer_price": 17000,
        "lead_underwriter": "한국투자증권",
        "summary": "디지털 송금과 모바일월렛 중심 핀테크 기업",
        "description": "소액 해외송금과 모바일 월렛 서비스를 제공하는 핀테크 기업이다.",
        "detail_url": "/tips/ipo/01445024",
    },
    {
        "id": "01780608",
        "company_name": "메쥬",
        "listing_type": "비상장",
        "status": "upcoming",
        "subscription_start_date": "2026-03-16",
        "subscription_end_date": "2026-03-17",
        "offer_price": 16700,
        "lead_underwriter": "신한투자증권",
        "summary": "웨어러블 환자 모니터링 의료기기 전문기업",
        "description": "웨어러블 패치형 환자 감시장치를 개발하는 디지털 헬스케어 기업이다.",
        "detail_url": "/tips/ipo/01780608",
    },
    {
        "id": "01965698",
        "company_name": "엔에이치기업인수목적33호",
        "listing_type": "비상장",
        "status": "upcoming",
        "subscription_start_date": "2026-03-17",
        "subscription_end_date": "2026-03-18",
        "offer_price": 2000,
        "lead_underwriter": "NH투자증권",
        "summary": "SPAC 공모주",
        "description": "합병 대상 기업 탐색을 목적으로 한 스팩 공모다.",
        "detail_url": "/tips/ipo/01965698",
    },
    {
        "id": "01802928",
        "company_name": "코스모로보틱스",
        "listing_type": "비상장",
        "status": "upcoming",
        "subscription_start_date": "2026-03-18",
        "subscription_end_date": "2026-03-19",
        "offer_price": 5300,
        "lead_underwriter": "유진증권",
        "summary": "하지 외골격과 재활로봇 중심 로보틱스 기업",
        "description": "성인용 하지 외골격 및 재활 로봇을 제조하는 로보틱스 기업이다.",
        "detail_url": "/tips/ipo/01802928",
    },
    {
        "id": "01963520",
        "company_name": "신한제17호기업인수목적",
        "listing_type": "비상장",
        "status": "upcoming",
        "subscription_start_date": "2026-03-19",
        "subscription_end_date": "2026-03-20",
        "offer_price": 2000,
        "lead_underwriter": "신한투자증권",
        "summary": "SPAC 공모주",
        "description": "합병 대상 기업 탐색을 목적으로 한 스팩 공모다.",
        "detail_url": "/tips/ipo/01963520",
    },
    {
        "id": "01685677",
        "company_name": "리센스메디컬",
        "listing_type": "비상장",
        "status": "upcoming",
        "subscription_start_date": "2026-03-19",
        "subscription_end_date": "2026-03-20",
        "offer_price": 9000,
        "lead_underwriter": "한국투자증권",
        "summary": "정밀 냉각치료 및 경피약물전달 의료기기 기업",
        "description": "극저온-열전복합 급속정밀냉각기술 플랫폼 기반 의료기기 기업이다.",
        "detail_url": "/tips/ipo/01685677",
    },
    {
        "id": "01869710",
        "company_name": "인벤테라",
        "listing_type": "비상장",
        "status": "upcoming",
        "subscription_start_date": "2026-03-23",
        "subscription_end_date": "2026-03-24",
        "offer_price": 12100,
        "lead_underwriter": "NH투자증권",
        "summary": "나노의약품 개발 바이오텍",
        "description": "질환 특이적 나노 조영제 및 치료제를 개발하는 바이오텍 기업이다.",
        "detail_url": "/tips/ipo/01869710",
    },
    {
        "id": "01985203",
        "company_name": "교보20호기업인수목적",
        "listing_type": "비상장",
        "status": "upcoming",
        "subscription_start_date": "2026-03-23",
        "subscription_end_date": "2026-03-24",
        "offer_price": 2000,
        "lead_underwriter": "교보증권",
        "summary": "SPAC 공모주",
        "description": "합병 대상 기업 탐색을 목적으로 한 스팩 공모다.",
        "detail_url": "/tips/ipo/01985203",
    },
    {
        "id": "01782183",
        "company_name": "카나프테라퓨틱스",
        "listing_type": "비상장",
        "status": "closed",
        "subscription_start_date": "2026-03-05",
        "subscription_end_date": "2026-03-06",
        "offer_price": 16000,
        "lead_underwriter": "한국투자증권",
        "summary": "항암제 및 안과 질환 치료제 개발 바이오텍",
        "description": "인간 유전체 기반 약물 개발 기술을 활용하는 바이오텍 기업이다.",
        "detail_url": "/tips/ipo/01782183",
    },
    {
        "id": "01379563",
        "company_name": "에스팀",
        "listing_type": "비상장",
        "status": "closed",
        "subscription_start_date": "2026-02-23",
        "subscription_end_date": "2026-02-24",
        "offer_price": 7000,
        "lead_underwriter": "한국투자증권",
        "summary": "모델 매니지먼트 기반 라이프스타일 기업",
        "description": "패션 모델 매니지먼트에서 출발해 라이프스타일 영역까지 확장한 기업이다.",
        "detail_url": "/tips/ipo/01379563",
    },
    {
        "id": "01554508",
        "company_name": "액스비스",
        "listing_type": "비상장",
        "status": "closed",
        "subscription_start_date": "2026-02-23",
        "subscription_end_date": "2026-02-24",
        "offer_price": 10100,
        "lead_underwriter": "미래에셋증권",
        "summary": "광학기술 기반 첨단 제조장비 솔루션 기업",
        "description": "광학기술과 소프트웨어 융합 기반 제조장비를 제공하는 기업이다.",
        "detail_url": "/tips/ipo/01554508",
    },
    {
        "id": "01203312",
        "company_name": "케이뱅크",
        "listing_type": "비상장",
        "status": "closed",
        "subscription_start_date": "2026-02-20",
        "subscription_end_date": "2026-02-23",
        "offer_price": 8300,
        "lead_underwriter": "NH투자증권",
        "summary": "비대면 금융상품 중심 인터넷전문은행",
        "description": "비대면 기반 수신·여신 상품을 제공하는 인터넷전문은행이다.",
        "detail_url": "/tips/ipo/01203312",
    },
]


# ─── DART API helpers ────────────────────────────────────────────────────────

def _date_to_status(start: str, end: str) -> str:
    """청약 시작/종료일로 status 도출."""
    today = datetime.now().strftime("%Y-%m-%d")
    if today < start:
        return "upcoming"
    if today <= end:
        return "open"
    return "closed"


async def _fetch_from_dart() -> list:
    """DART irdsSttus API 호출 후 IPO 형태로 변환."""
    today = datetime.now()
    bgn_de = (today - timedelta(days=30)).strftime("%Y%m%d")
    end_de = (today + timedelta(days=60)).strftime("%Y%m%d")

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(
            "https://opendart.fss.or.kr/api/irdsSttus.json",
            params={
                "crtfc_key": settings.DART_API_KEY,
                "bgn_de": bgn_de,
                "end_de": end_de,
            },
        )
        resp.raise_for_status()
        body = resp.json()

    if body.get("status") != "000":
        raise ValueError(f"DART API error: {body.get('message', 'unknown')}")

    items = []
    for row in body.get("list", []):
        rcept_dt: str = row.get("rcept_dt", "")  # YYYYMMDD
        if len(rcept_dt) == 8:
            sub_start = f"{rcept_dt[:4]}-{rcept_dt[4:6]}-{rcept_dt[6:]}"
        else:
            sub_start = rcept_dt

        # 청약 종료일은 보통 시작일 +1
        try:
            end_dt = (datetime.strptime(sub_start, "%Y-%m-%d") + timedelta(days=1)).strftime("%Y-%m-%d")
        except ValueError:
            end_dt = sub_start

        items.append({
            "id": row.get("rcept_no", ""),
            "company_name": row.get("corp_name", ""),
            "listing_type": "비상장",
            "status": _date_to_status(sub_start, end_dt),
            "subscription_start_date": sub_start,
            "subscription_end_date": end_dt,
            "offer_price": 0,
            "lead_underwriter": "",
            "summary": row.get("rpt_nm", ""),
            "description": row.get("rpt_nm", ""),
            "detail_url": f"/tips/ipo/{row.get('rcept_no', '')}",
        })

    return items


# ─── Route handlers ──────────────────────────────────────────────────────────

def build_detail_payload(item: dict) -> dict:
    return {
        **item,
        "source": "dart",
        "source_url": "https://dart.fss.or.kr/",
        "tips": [
            "대표주관 증권사의 청약 수수료와 계좌 개설 조건을 먼저 확인한다.",
            "청약기일과 환불일 사이 자금 묶임 기간을 체크한다.",
            "상세 공시와 증권신고서 요약을 함께 읽고 참여 여부를 판단한다.",
        ],
        "disclaimer": "정확한 청약 정보는 DART 공시와 주관 증권사 공지를 다시 확인해야 한다.",
    }


@router.get("/ipo")
async def get_ipo_calendar():
    # 캐시 확인
    cached = _ipo_cache.get()
    if cached is not None:
        return {
            "source": "dart",
            "updated_at": datetime.now().isoformat(),
            "total": len(cached),
            "items": cached,
        }

    # DART API 시도 (키가 있을 때만)
    items = IPO_ITEMS
    if settings.DART_API_KEY:
        try:
            items = await _fetch_from_dart()
        except Exception:
            items = IPO_ITEMS

    _ipo_cache.set(items)
    return {
        "source": "dart",
        "updated_at": datetime.now().isoformat(),
        "total": len(items),
        "items": items,
    }


@router.get("/ipo/{item_id}")
async def get_ipo_detail(item_id: str):
    # 캐시에서 먼저 찾기
    cached = _ipo_cache.get()
    pool = cached if cached is not None else IPO_ITEMS

    matched = next((item for item in pool if item["id"] == item_id), None)
    if matched is None:
        raise HTTPException(status_code=404, detail="IPO item not found")
    return build_detail_payload(matched)
