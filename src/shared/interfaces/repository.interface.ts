/**
 * Generic Repository Interface — Port de la Clean Architecture.
 * Chaque module implémente ce contrat via son propre Repository.
 * Jamais de dépendance directe sur TypeORM dans le Domain.
 */
export interface IRepository<T> {
  findById(id: string): Promise<T | null>;
  findAll(options?: FindAllOptions): Promise<PaginatedResult<T>>;
  save(entity: T): Promise<T>;
  update(id: string, entity: Partial<T>): Promise<T>;
  delete(id: string): Promise<void>;
}

export interface FindAllOptions {
  page?: number;
  limit?: number;
  filters?: Record<string, unknown>;
  orderBy?: string;
  order?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface Money {
  amount: number;
  currency: string; // 'XOF' par défaut pour le Burkina Faso
}
