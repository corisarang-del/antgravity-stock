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
    return new Response(JSON.stringify({ error: "DART_API_KEY not configured", list: [] }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    interface DartIpoItemRaw {
      rcept_no?: string;
      subscrib_dt?: string;
      list_dt?: string;
      issue_price?: string;
      lead_mang?: string;
      corp_name?: string;
      stock_knd?: string;
    }

    interface DartApiResponse {
      status?: string;
      message?: string;
      list?: DartIpoItemRaw[];
    }

    interface NormalizedIpoItem {
      id: string;
      company: string;
      status: "upcoming" | "open" | "closed";
      subscriptionStart: string;
      subscriptionEnd: string;
      listingDate: string;
      offerPrice: string;
      priceRange: string;
      leadUnderwriter: string;
      summary: string;
      sector: string;
      marketCap: string;
      rceptNo?: string;
    }

    const getErrorMessage = (error: unknown): string =>
      error instanceof Error ? error.message : String(error);

    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 3);
    const threeMonthsAhead = new Date();
    threeMonthsAhead.setMonth(threeMonthsAhead.getMonth() + 3);

    const fmt = (d: Date) =>
      `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;

    const bgn_de = fmt(sixMonthsAgo);
    const end_de = fmt(threeMonthsAhead);

    // Use HTTP (not HTTPS) to avoid TLS HandshakeFailure with Korean government servers
    const url = `http://opendart.fss.or.kr/api/ipoSttus.json?crtfc_key=${DART_API_KEY}&bgn_de=${bgn_de}&end_de=${end_de}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    let data: DartApiResponse;
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      data = await res.json() as DartApiResponse;
    } catch (fetchErr: unknown) {
      clearTimeout(timeout);
      // Network/TLS error — return empty list so client falls back gracefully
      const message = getErrorMessage(fetchErr);
      console.error("DART fetch error:", message);
      return new Response(
        JSON.stringify({ error: message, list: [], fallback: true }),
        {
          status: 200, // Return 200 so client can read the body
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (data.status !== "000") {
      if (data.status === "010") {
        return new Response(JSON.stringify({ list: [] }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({ error: `DART: ${data.message}`, list: [], fallback: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const todayStr = fmt(today);

    const normalized: NormalizedIpoItem[] = (data.list || []).map((item, idx) => {
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

      let status: "upcoming" | "open" | "closed";
      if (!endRaw || endRaw < todayStr) {
        status = "closed";
      } else if (subStart.replace(/-/g, "") <= todayStr) {
        status = "open";
      } else {
        status = "upcoming";
      }

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

    const order = { open: 0, upcoming: 1, closed: 2 };
    normalized.sort((a, b) => order[a.status] - order[b.status]);

    return new Response(JSON.stringify({ list: normalized }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Unexpected error:", message);
    return new Response(
      JSON.stringify({ error: message, list: [], fallback: true }),
      {
        status: 200, // Always 200 so client reads body
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
