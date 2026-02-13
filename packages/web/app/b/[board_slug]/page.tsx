import { notFound, redirect } from 'next/navigation';
import { resolveBoardBySlug } from '@/app/lib/board-slug-utils';

interface BoardSlugPageParams {
  board_slug: string;
}

/**
 * Redirect /b/[slug] → /b/[slug]/{board.angle}/list
 * When no angle is specified in the URL, use the board's configured default angle.
 */
export default async function BoardSlugPage(props: { params: Promise<BoardSlugPageParams> }) {
  const params = await props.params;
  const board = await resolveBoardBySlug(params.board_slug);

  if (!board) {
    return notFound();
  }

  redirect(`/b/${board.slug}/${board.angle}/list`);
}
