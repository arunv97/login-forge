import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

export interface HealthCheckResponse {
  message: string;
  status: string;
  timestamp: string;
}

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  healthCheck(): HealthCheckResponse {
    return this.appService.getHealthCheck();
  }
}
