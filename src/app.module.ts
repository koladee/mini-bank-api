import { Module } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AccountsModule } from './accounts/accounts.module';
import { TransactionsModule } from './transactions/transactions.module';
import { ReconciliationModule } from './reconciliation/reconciliation.module';
import { ApiKeyGuard } from './common/guards/api-key.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { MetaModule } from './meta/meta.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    AuthModule,
    AccountsModule,
    TransactionsModule,
    ReconciliationModule,
    MetaModule,
    UsersModule
  ],
  providers: [
    { provide: APP_GUARD, useClass: ApiKeyGuard },   // require x-api-key globally
    { provide: APP_GUARD, useClass: JwtAuthGuard },  // then require JWT (controllers can set public if needed)
    { provide: APP_GUARD, useClass: RolesGuard },    // RBAC
  ],
})
export class AppModule {}
