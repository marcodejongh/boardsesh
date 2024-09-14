// app/climb/[board]/[layout]/[size]/page.tsx

import ResultsPage from "../../../../components/board-page/ResultsPage"; // Adjust import path

export default function ClimbPage({ params, searchParams }: { params: { board: string, layout: string, size: string }, searchParams: { hostId?: string } }) {
  const { board, layout, size } = params;
  const hostId = searchParams.hostId || ''; // Extract the query parameter `hostId`

  // Manually construct the pathname since you know the route structure
  const pathname = `/climb/${board}/${layout}/${size}`;

  // Extract the search part from the URL (manually if needed)
  const search = searchParams ? `hostId=${hostId}` : '';

  return (
    <ResultsPage
      board={board}
      layout={layout}
      size={size}
      hostId={hostId}
      pathname={pathname}
      search={search}
    />
  );
}
