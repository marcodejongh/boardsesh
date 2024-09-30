import useSWR from 'swr';

const API_BASE_URL = `${process.env.BASE_URL || 'https://www.boardsesh.com'}/api`;

const fetcher = async (url: string) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
};

export const useBoardDetails = (board: string, layout: number, size: number, set_ids: string[]) => {
  const apiUrl = `${API_BASE_URL}/v1/${board}/${layout}/${size}/${set_ids.join(',')}/details`;
  const { data, error, isLoading } = useSWR(apiUrl, fetcher);

  return {
    boardDetails: data,
    error,
    isLoading,
  };
};
