import { useState } from "react";

/**
 * Cursor step shape returned by each raw fetch call.
 */
export interface CursorStepResult<C> {
  next: C | null | undefined;
  prev?: C | null | undefined;
}

export type RawCursorFetch<C> = (
  cursor: C,
  isNext: boolean
) => Promise<CursorStepResult<C>>;

export type FetchPageFn<C> = (
  pageNumber: number,
  cursor: C | null,
  isNext: boolean
) => Promise<void>;

/**
 * useCursorPagination — ported from Faceviz, adapted for Prisma cursor pagination.
 *
 * Maintains a history of cursors so users can jump to any page without
 * re-fetching from the beginning. Compatible with Prisma's `cursor` + `skip`
 * pagination pattern.
 *
 * Usage:
 *   const { currentPage, jumpToPage, resetPagination } = useCursorPagination<string>();
 *
 * @param initialCursor - The initial cursor value (null = start from beginning)
 */
export function useCursorPagination<C = string | null>(
  initialCursor: C | null = null
) {
  const [currentPage, setCurrentPage] = useState(1);
  const [cursorHistory, setCursorHistory] = useState<
    Record<number, C | null | undefined>
  >({
    1: initialCursor,
  });

  const resetPagination = (seedCursor: C | null = initialCursor) => {
    setCurrentPage(1);
    setCursorHistory({ 1: seedCursor });
  };

  const findNearestPageWithCursor = (targetPage: number): number | null => {
    const visited = Object.keys(cursorHistory)
      .map(Number)
      .filter((p) => cursorHistory[p] !== undefined);
    if (visited.length === 0) return null;
    return visited.reduce((closest, p) =>
      Math.abs(p - targetPage) < Math.abs(closest - targetPage) ? p : closest
    );
  };

  const navigateFromPageToTarget = async (
    startPage: number,
    targetPage: number,
    rawFetch: RawCursorFetch<C>
  ): Promise<C | null | undefined> => {
    const direction = targetPage > startPage ? "forward" : "backward";
    let current = startPage;
    let cursor = cursorHistory[startPage];

    if (direction === "forward") {
      while (current < targetPage && cursor !== null && cursor !== undefined) {
        current++;
        const res = await rawFetch(cursor as C, true);
        cursor = res.next;
        const hopPage = current;
        setCursorHistory((prev) => ({
          ...prev,
          [hopPage]: prev[hopPage] ?? res.prev,
          [hopPage + 1]: cursor,
        }));
      }
    } else {
      while (current > targetPage && cursor !== null && cursor !== undefined) {
        current--;
        const res = await rawFetch(cursor as C, false);
        cursor = res.prev;
        const hopPage = current;
        setCursorHistory((prev) => ({
          ...prev,
          [hopPage]: cursor,
          [hopPage + 1]: res.next,
        }));
      }
    }
    return cursor;
  };

  const jumpToPage = async (
    pageNumber: number,
    rawFetch: RawCursorFetch<C>,
    fetchPage: FetchPageFn<C>
  ) => {
    if (pageNumber === currentPage) return;

    if (cursorHistory[pageNumber] !== undefined) {
      const isForwardJump = pageNumber > currentPage;
      await fetchPage(
        pageNumber,
        cursorHistory[pageNumber] ?? null,
        isForwardJump
      );
      return;
    }

    const nearestPage = findNearestPageWithCursor(pageNumber);
    if (nearestPage) {
      const finalCursor = await navigateFromPageToTarget(
        nearestPage,
        pageNumber,
        rawFetch
      );
      if (finalCursor !== null && finalCursor !== undefined) {
        await fetchPage(pageNumber, finalCursor, pageNumber > nearestPage);
      }
    }
  };

  return {
    currentPage,
    setCurrentPage,
    cursorHistory,
    setCursorHistory,
    resetPagination,
    findNearestPageWithCursor,
    navigateFromPageToTarget,
    jumpToPage,
  };
}
