import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
/**
 * @Public() — Marque une route comme publique (bypass JWT Guard)
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
