export function getProOverviewState(input: {
  isLoading: boolean;
  isError: boolean;
  availableCount: number;
}) {
  if (input.isLoading) return "loading";
  if (input.isError) return "error";
  if (input.availableCount === 0) return "empty";
  return "ready";
}
