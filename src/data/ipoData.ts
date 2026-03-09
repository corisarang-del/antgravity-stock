export type IpoStatus = "upcoming" | "open" | "closed";

export interface IpoItem {
  id: string;
  company: string;
  status: IpoStatus;
  subscriptionStart: string;
  subscriptionEnd: string;
  listingDate: string;
  offerPrice: string; // e.g. "15,000원"
  priceRange: string; // e.g. "13,000 ~ 15,000원"
  leadUnderwriter: string;
  summary: string;
  sector: string;
  marketCap: string;
  lockupPeriod?: string;
  details?: string;
}

export const IPO_DATA: IpoItem[] = [
  {
    id: "ipo-001",
    company: "테라로보틱스",
    status: "open",
    subscriptionStart: "2026-03-10",
    subscriptionEnd: "2026-03-11",
    listingDate: "2026-03-18",
    offerPrice: "18,000원",
    priceRange: "16,000 ~ 18,000원",
    leadUnderwriter: "미래에셋증권",
    summary: "물류·제조 자동화 로봇 전문기업. 자체 개발 AMR 시스템으로 국내외 대형 3PL 고객사 보유.",
    sector: "로보틱스",
    marketCap: "약 1,440억원",
    lockupPeriod: "상장 후 6개월",
    details: "테라로보틱스는 2019년 설립된 자율이동로봇(AMR) 전문 기업으로, 물류센터 자동화 시장을 주요 타깃으로 하고 있습니다. 삼성SDS·CJ대한통운 등 대형 물류사와의 레퍼런스를 바탕으로 해외 진출을 가속화하고 있습니다. 2025년 매출 389억원, 영업이익 41억원을 기록하며 흑자 전환에 성공했습니다.",
  },
  {
    id: "ipo-002",
    company: "클린에너지솔루션",
    status: "open",
    subscriptionStart: "2026-03-10",
    subscriptionEnd: "2026-03-12",
    listingDate: "2026-03-19",
    offerPrice: "22,000원",
    priceRange: "20,000 ~ 22,000원",
    leadUnderwriter: "한국투자증권",
    summary: "태양광·ESS 통합 솔루션 기업. B2B 대형 사업장 RE100 대응 수요 급증 수혜주.",
    sector: "신재생에너지",
    marketCap: "약 2,200억원",
    lockupPeriod: "상장 후 6개월",
    details: "클린에너지솔루션은 태양광 발전과 에너지저장장치(ESS)를 결합한 통합 솔루션을 제공합니다. RE100 의무화 추세에 따른 기업 수요를 기반으로 안정적인 수주 파이프라인을 보유하고 있으며, 2025년 수주잔고는 1,800억원을 돌파했습니다.",
  },
  {
    id: "ipo-003",
    company: "바이오링크",
    status: "upcoming",
    subscriptionStart: "2026-03-24",
    subscriptionEnd: "2026-03-25",
    listingDate: "2026-04-02",
    offerPrice: "미정",
    priceRange: "28,000 ~ 32,000원 (희망)",
    leadUnderwriter: "NH투자증권",
    summary: "AI 기반 신약 후보물질 발굴 플랫폼 개발사. 글로벌 빅파마 2곳과 공동연구 진행 중.",
    sector: "바이오",
    marketCap: "약 3,840억원 (희망 상단 기준)",
    lockupPeriod: "상장 후 1년",
    details: "바이오링크는 딥러닝 기반 분자구조 예측 엔진을 핵심으로 신약 후보물질 발굴 속도를 획기적으로 단축하는 기술을 보유하고 있습니다. 현재 글로벌 제약사 2곳과 공동연구 계약을 체결하고 있으며, 기술수출을 통한 마일스톤 수익 모델을 추구합니다.",
  },
  {
    id: "ipo-004",
    company: "스페이스로직",
    status: "upcoming",
    subscriptionStart: "2026-04-07",
    subscriptionEnd: "2026-04-08",
    listingDate: "2026-04-15",
    offerPrice: "미정",
    priceRange: "45,000 ~ 52,000원 (희망)",
    leadUnderwriter: "삼성증권",
    summary: "국내 1세대 소형위성 스타트업. 지구 관측 위성 7기 운영 중이며 방산·기후 데이터 판매 수익 가시화.",
    sector: "우주항공",
    marketCap: "약 5,720억원 (희망 상단 기준)",
    lockupPeriod: "상장 후 1년",
    details: "스페이스로직은 250kg급 지구관측위성을 자체 설계·제조하며 현재 7기를 운영 중입니다. 방위산업청 및 기상청 데이터 공급 계약 외에도 민간 보험·농업 분야로의 데이터 판매를 확대하고 있습니다. 2026년 추가 3기 발사를 통해 글로벌 데이터 시장 진출이 목표입니다.",
  },
  {
    id: "ipo-005",
    company: "에이치엔에스",
    status: "closed",
    subscriptionStart: "2026-02-17",
    subscriptionEnd: "2026-02-18",
    listingDate: "2026-02-26",
    offerPrice: "12,000원",
    priceRange: "10,000 ~ 12,000원",
    leadUnderwriter: "키움증권",
    summary: "의료기기 유통 플랫폼 운영사. 병원용 소모품 B2B 전자상거래 시장 점유율 확대.",
    sector: "의료기기",
    marketCap: "약 960억원",
    details: "에이치엔에스는 의료기기 제조사와 의료기관을 잇는 B2B 플랫폼을 운영합니다. 현재 3,200개 이상의 의료기관과 거래 관계를 유지하고 있으며 반복 구매율이 높아 안정적인 수익 구조를 갖추고 있습니다. 상장 첫날 공모가 대비 38% 상승하며 강세를 보였습니다.",
  },
  {
    id: "ipo-006",
    company: "그린카모빌리티",
    status: "closed",
    subscriptionStart: "2026-01-27",
    subscriptionEnd: "2026-01-28",
    listingDate: "2026-02-05",
    offerPrice: "8,500원",
    priceRange: "7,000 ~ 8,500원",
    leadUnderwriter: "대신증권",
    summary: "EV 기반 B2B 차량공유 서비스. 법인·관공서 대상 전기차 구독·렌탈 특화.",
    sector: "모빌리티",
    marketCap: "약 680억원",
    details: "그린카모빌리티는 법인과 공공기관을 위한 전기차 구독 서비스를 제공합니다. 2025년 말 기준 운영 차량 2,100대를 돌파했으며, 탄소배출 저감 의무화 정책의 수혜로 공공기관 계약이 빠르게 늘고 있습니다.",
  },
];

export function getIposByStatus(status: IpoStatus | "all"): IpoItem[] {
  if (status === "all") return IPO_DATA;
  return IPO_DATA.filter((i) => i.status === status);
}

export function getIpoById(id: string): IpoItem | undefined {
  return IPO_DATA.find((i) => i.id === id);
}

export const STATUS_LABELS: Record<IpoStatus | "all", string> = {
  all: "전체",
  open: "청약중",
  upcoming: "청약예정",
  closed: "청약마감",
};
