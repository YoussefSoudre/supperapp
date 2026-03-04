import { SetMetadata } from '@nestjs/common';

export const IS_CITY_SCOPED_KEY = 'isCityScoped';

/**
 * @CityScoped()
 *
 * Marque une route comme devant être vérifiée contre le scope de ville de l'utilisateur.
 *
 * Comportement dans CityScopeGuard :
 *  - Si l'user a un rôle GLOBAL → accès autorisé sans restriction de ville.
 *  - Si l'user a des rôles CITY → vérifie que req.params.cityId ou req.body.cityId
 *    fait partie de ses villes autorisées.
 *
 * À combiner avec @RequirePermission() pour une protection complète :
 *   @RequirePermission('rides:manage')
 *   @CityScoped()
 *   @Get('/cities/:cityId/rides')
 */
export const CityScoped = () => SetMetadata(IS_CITY_SCOPED_KEY, true);
