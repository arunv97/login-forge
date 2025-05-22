import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHealthCheck(): { message: string; status: string; timestamp: string } {
    return {
      message: 'Server is healthy',
      status: 'OK',
      timestamp: new Date().toISOString(),
    };
  }
}
