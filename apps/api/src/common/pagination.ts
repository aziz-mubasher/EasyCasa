export interface PageParams { page: number; pageSize: number; }
export function offset(p: PageParams): number { return (p.page - 1) * p.pageSize; }
