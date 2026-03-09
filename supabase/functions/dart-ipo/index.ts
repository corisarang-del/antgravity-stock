import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const DART_API_KEY = Deno.env.get("DART_API_KEY");
  if (!DART_API_KEY) {
    return new Response(JSON.stringify({ error: "DART_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // 최근 6개월 범위로 조회
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 3);
    const threeMonthsAhead = new Date();
    threeMonthsAhead.setMonth(threeMonthsAhead.getMonth() + 3);

    const fmt = (d: Date) =>
      `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

    const bgn_de = fmt(sixMonthsAgo);
    const end_de = fmt(threeMonthsAhead);

    const url = `https://opendart.fss.or.kr/api/ipoSttus.json?crtfc_key=${DART_API_KEY}&bgn_de=${bgn_de}&end_de=${end_de}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.status !== "000") {
      // DART API error codes: 010 = no data, others = error
      if (data.status === "010") {
        return new Response(JSON.stringify({ list: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`DART API error: ${data.message}`);
    }

    // Normalize DART response to our IpoItem format
    const todayStr = fmt(today);

    const normalized = (data.list || []).map((item: any, idx: number) => {
      // subscrib_dt: e.g. "20260310" or "20260310~20260311"
      const subDt: string = item.subscrib_dt ?? "";
      const [subStart, subEnd] = subDt.includes("~")
        ? subDt.split("~").map((s: string) => s.trim())
        : [subDt, subDt];

      const fmtDate = (d: string) =>
        d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : d;

      const listDt = fmtDate(item.list_dt ?? "");
      const startFmt = fmtDate(subStart);
      const endFmt = fmtDate(subEnd);
      const endRaw = subEnd.replace(/-/g, "");

      // Determine status
      let status: "upcoming" | "open" | "closed";
      if (!endRaw || endRaw < todayStr) {
        status = "closed";
      } else if (subStart.replace(/-/g, "") <= todayStr) {
        status = "open";
      } else {
        status = "upcoming";
      }

      // issue_price may be "-" when not determined
      const offerPrice =
        item.issue_price && item.issue_price !== "-"
          ? `${Number(item.issue_price).toLocaleString("ko-KR")}원`
          : "미정";

      return {
        id: `dart-${item.rcept_no ?? idx}`,
        company: item.corp_name ?? "미정",
        status,
        subscriptionStart: startFmt,
        subscriptionEnd: endFmt,
        listingDate: listDt,
        offerPrice,
        priceRange: offerPrice,
        leadUnderwriter: item.lead_mang ?? "-",
        summary: `${item.stock_knd ?? ""} · ${item.corp_name ?? ""}`,
        sector: item.stock_knd ?? "기타",
        marketCap: "-",
        rceptNo: item.rcept_no,
      };
    });

    // Sort: open first, upcoming next, closed last
    const order = { open: 0, upcoming: 1, closed: 2 };
    normalized.sort((a: any, b: any) => order[a.status] - order[b.status]);

    return new Response(JSON.stringify({ list: normalized }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
