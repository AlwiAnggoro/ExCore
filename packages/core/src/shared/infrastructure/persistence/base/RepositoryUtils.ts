export interface PageRequest {
  page: number;
  pageSize: number;
}

export interface PageResponse<TEntity> {
  items: TEntity[];
  total: number;
  page: number;
  pageSize: number;
}

/**
 * Helper for repositories to wrap paginated responses in a common structure.
 */
export function createPage<TEntity>(
  items: TEntity[],
  total: number,
  request: PageRequest
): PageResponse<TEntity> {
  return {
    items,
    total,
    page: request.page,
    pageSize: request.pageSize,
  };
}
