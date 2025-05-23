import { Module } from '@nestjs/common';
import { AppController } from '@app/app.controller';
import { AppService } from '@app/app.service';
import { AuthModule } from '@auth/auth.module';
import { PrismaModule } from '@prisma-setup/prisma.module';
import { UserModule } from '@user/user.module';
import { ConfigModule } from '@nestjs/config';
import { CloudinaryModule } from '@core/cloudinary/cloudinary.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    AuthModule,
    UserModule,
    PrismaModule,
    CloudinaryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
