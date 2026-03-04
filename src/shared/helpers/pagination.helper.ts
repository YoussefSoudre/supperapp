import {
  SelectQueryBuilder,
  FindManyOptions,
  Repository,
  ObjectLiteral,
} from 'typeorm';
import { PaginatedResult } from '../interfaces/repository.interface';

export interface PaginationParams {
  page?:  number;
  limit?: number;
}

export const DEFAULT_PAGE  = 1;
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT     = 100;

/**
 * Utilitaires de pagination réutilisables sur tout le projet.
 *
 * Problème résolu :
 *   Chaque service recalculait offset/totalPages de façon identique.
 *   Cette classe centralise la logique et uniformise les réponses.
 *
 * Usage avec QueryBuilder :
 *   return PaginationHelper.paginateQuery(qb, { page: 2, limit: 10 });
 *
 * Usage avec Repository.find() :
 *   return PaginationHelper.paginateRepo(repo, { take: 10, skip: 0 }, { page: 1, limit: 10 });
 *
 * Usage manuel (données déjà chargées) :
 *   return PaginationHelper.build(data, total, { page: 1, limit: 20 });
 */
export class PaginationHelper {
  /**
   * Normalise et sécurise les paramètres de pagination entrants.
   * - Coerce les strings en nombres (depuis query params)
   * - Clamp page ≥ 1
   * - Clamp limit entre 1 et MAX_LIMIT
   */
  static normalize(params: PaginationParams): Required<PaginationParams> {
    const page  = Math.max(1, Number(params.page)  || DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, Number(params.limit) || DEFAULT_LIMIT));
    return { page, limit };
  }

  /** Calcule l'offset SQL à partir de page + limit */
  static toOffset(page: number, limit: number): number {
    return (page - 1) * limit;
  }

  /**
   * Pagine un TypeORM QueryBuilder.
   * Exécute COUNT(*) + SELECT en parallèle pour minimiser la latence.
   */
  static async paginateQuery<T extends ObjectLiteral>(
    qb: SelectQueryBuilder<T>,
    params: PaginationParams,
  ): Promise<PaginatedResult<T>> {
    const { page, limit } = PaginationHelper.normalize(params);
    const offset = PaginationHelper.toOffset(page, limit);

    const [data, total] = await qb
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return PaginationHelper.build(data, total, { page, limit });
  }

  /**
   * Pagine via Repository.findAndCount().
   * Merge automatiquement skip/take dans les options passées.
   */
  static async paginateRepo<T extends ObjectLiteral>(
    repo: Repository<T>,
    options: FindManyOptions<T>,
    params: PaginationParams,
  ): Promise<PaginatedResult<T>> {
    const { page, limit } = PaginationHelper.normalize(params);
    const offset = PaginationHelper.toOffset(page, limit);

    const [data, total] = await repo.findAndCount({
      ...options,
      skip: offset,
      take: limit,
    });

    return PaginationHelper.build(data, total, { page, limit });
  }

  /**
   * Construit un PaginatedResult à partir de données et d'un total déjà connus.
   * Utile quand la requête est faite manuellement.
   */
  static build<T>(
    data:   T[],
    total:  number,
    params: Required<PaginationParams>,
  ): PaginatedResult<T> {
    const { page, limit } = params;
    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
