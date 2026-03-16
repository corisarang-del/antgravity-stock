import { useQuery } from "@tanstack/react-query";
import { fetchIpoCalendar, type BackendIpoItem } from "@/lib/apiClient";
import { type IpoItem, type IpoStatus } from "@/data/ipoData";

function mapToIpoItem(item: BackendIpoItem): IpoItem {
  const offerPriceStr = item.offer_price
    ? `${item.offer_price.toLocaleString()}원`
    : "-";
  return {
    id: item.id,
    company: item.company_name,
    status: item.status as IpoStatus,
    subscriptionStart: item.subscription_start_date,
    subscriptionEnd: item.subscription_end_date,
    listingDate: "",
    offerPrice: offerPriceStr,
    priceRange: offerPriceStr,
    leadUnderwriter: item.lead_underwriter,
    summary: item.summary,
    sector: item.listing_type,
    marketCap: "",
  };
}

export function useIpoData() {
  return useQuery<IpoItem[]>({
    queryKey: ["ipoCalendar"],
    queryFn: async () => {
      const items = await fetchIpoCalendar();
      return items.map(mapToIpoItem);
    },
    staleTime: 60 * 60 * 1000,
  });
}
