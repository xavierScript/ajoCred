import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);
  const rawOrigin = config.get<string>('frontendUrl') ?? '*';
  const origins = rawOrigin.includes(',')
    ? rawOrigin.split(',').map((s) => s.trim())
    : rawOrigin;
  app.enableCors({ origin: origins === '*' ? true : origins });
  await app.listen(config.get<number>('port') ?? 3001);
}
void bootstrap();
