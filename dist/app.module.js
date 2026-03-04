"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const throttler_1 = require("@nestjs/throttler");
const shared_module_1 = require("./shared/shared.module");
const database_module_1 = require("./infrastructure/database/database.module");
const redis_module_1 = require("./infrastructure/redis/redis.module");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const drivers_module_1 = require("./modules/drivers/drivers.module");
const rides_module_1 = require("./modules/rides/rides.module");
const delivery_module_1 = require("./modules/delivery/delivery.module");
const food_module_1 = require("./modules/food/food.module");
const wallet_module_1 = require("./modules/wallet/wallet.module");
const payments_module_1 = require("./modules/payments/payments.module");
const pricing_module_1 = require("./modules/pricing/pricing.module");
const referral_module_1 = require("./modules/referral/referral.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const cities_module_1 = require("./modules/cities/cities.module");
const admin_module_1 = require("./modules/admin/admin.module");
const analytics_module_1 = require("./modules/analytics/analytics.module");
const dispatch_module_1 = require("./modules/dispatch/dispatch.module");
const scheduling_module_1 = require("./modules/scheduling/scheduling.module");
const global_exception_filter_1 = require("./shared/filters/global-exception.filter");
const response_interceptor_1 = require("./shared/interceptors/response.interceptor");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                envFilePath: ['.env.local', '.env'],
            }),
            throttler_1.ThrottlerModule.forRoot([
                { name: 'short', ttl: 1000, limit: 10 },
                { name: 'long', ttl: 60000, limit: 200 },
            ]),
            shared_module_1.SharedModule,
            database_module_1.DatabaseModule,
            redis_module_1.RedisModule,
            cities_module_1.CitiesModule,
            pricing_module_1.PricingModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            drivers_module_1.DriversModule,
            rides_module_1.RidesModule,
            delivery_module_1.DeliveryModule,
            food_module_1.FoodModule,
            wallet_module_1.WalletModule,
            payments_module_1.PaymentsModule,
            referral_module_1.ReferralModule,
            notifications_module_1.NotificationsModule,
            admin_module_1.AdminModule,
            analytics_module_1.AnalyticsModule,
            dispatch_module_1.DispatchModule,
            scheduling_module_1.SchedulingModule,
        ],
        providers: [
            { provide: core_1.APP_FILTER, useClass: global_exception_filter_1.GlobalExceptionFilter },
            { provide: core_1.APP_INTERCEPTOR, useClass: response_interceptor_1.ResponseInterceptor },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map