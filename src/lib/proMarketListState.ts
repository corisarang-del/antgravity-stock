export function getProMarketListState(input: {
  isLoading: boolean;
  isError: boolean;
  total: number;
}) {
  if (input.isLoading) return "loading";
  if (input.isError) return "error";
  if (input.total === 0) return "empty";
  return "ready";
}
