// app/climb/[board]/[layout]/[size]/page.tsx

import { BoardLayoutSizeRouteParameters } from "@/app/lib/types";
import ResultsPage from "../../../../components/board-page/ResultsPage"; // Adjust import path

export default function ClimbPage({ params, searchParams }: { params: BoardLayoutSizeRouteParameters, searchParams: { hostId?: string } }) {
  const { board_name, layout_id, size_id } = params;
  const hostId = searchParams.hostId || ''; // Extract the query parameter `hostId`

  // Manually construct the pathname since you know the route structure
  const pathname = `/climb/${board_name}/${layout_id}/${size_id}`;

  // Extract the search part from the URL (manually if needed)
  const search = searchParams ? `hostId=${hostId}` : '';

  return (
    <ResultsPage
      board={board_name}
      layout={layout_id}
      size={size_id}
      hostId={hostId}
      pathname={pathname}
      search={search}
    />
  );
}
