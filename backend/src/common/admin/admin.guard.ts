import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class AdminGuard implements CanActivate {
  private readonly apiKey: string;

  constructor(private readonly config: ConfigService) {
    // Fail-closed: if ADMIN_API_KEY is not set, all admin routes return 401.
    this.apiKey = this.config.get<string>('admin.apiKey') ?? '';
  }

  canActivate(context: ExecutionContext): boolean {
    if (!this.apiKey) {
      throw new UnauthorizedException('Admin key not configured');
    }
    const request = context.switchToHttp().getRequest<Request>();
    const provided = request.headers['x-admin-key'];
    if (!provided || provided !== this.apiKey) {
      throw new UnauthorizedException('Invalid admin key');
    }
    return true;
  }
}
