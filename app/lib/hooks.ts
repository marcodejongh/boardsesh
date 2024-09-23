import useSWRInfinite from "swr/infinite";
import { SearchRequestPagination, ParsedBoardRouteParameters } from "@/app/lib/types";

const PAGE_LIMIT = 10;

// Fetcher function to call the API
const fetcher = (url: string) => fetch(url).then((res) => res.json());

export const useBoulderProblems = (params: ParsedBoardRouteParameters, searchParams: SearchRequestPagination) => {
  const getKey = (pageIndex: number, previousPageData: any) => {
    if (previousPageData && previousPageData.boulderproblems.length === 0) return null;

    const queryString = new URLSearchParams({
      gradeAccuracy: searchParams.gradeAccuracy.toString(),
      maxGrade: searchParams.maxGrade.toString(),
      minAscents: searchParams.minAscents.toString(),
      minGrade: searchParams.minGrade.toString(),
      minRating: searchParams.minRating.toString(),
      sortBy: searchParams.sortBy,
      sortOrder: searchParams.sortOrder,
      name: searchParams.name,
      onlyClassics: searchParams.onlyClassics.toString(),
      settername: searchParams.settername,
      setternameSuggestion: searchParams.setternameSuggestion,
      holds: searchParams.holds,
      mirroredHolds: searchParams.mirroredHolds,
      pageSize: searchParams.pageSize.toString(),
      page: pageIndex.toString(),
    }).toString();

    return `/api/v1/${params.board_name}/${params.layout_id}/${params.size_id}/${params.set_ids}/search?${queryString}`;
  };

  const { data, error, size, setSize, isValidating } = useSWRInfinite(getKey, fetcher, {
    revalidateOnFocus: false,
  });

  const climbs = data ? data.flatMap((page) => page.boulderproblems) : [];
  const totalCount = data?.[0]?.totalCount || 0;

  return {
    climbs,
    totalCount,
    isLoading: !error && !data,
    isError: !!error,
    size,
    setSize,
    isValidating,
    hasMore: climbs.length < totalCount,
  };
};
