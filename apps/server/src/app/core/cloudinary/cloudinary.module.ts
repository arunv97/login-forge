import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // Import ConfigModule
import { CloudinaryProvider } from '@core/cloudinary/cloudinary.provider';
import { CloudinaryService } from '@core/cloudinary/cloudinary.service';

@Global() // Make CloudinaryService globally available
@Module({
  imports: [ConfigModule], // CloudinaryProvider depends on ConfigService
  providers: [CloudinaryProvider, CloudinaryService],
  exports: [CloudinaryService],
})
export class CloudinaryModule {}