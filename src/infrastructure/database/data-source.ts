import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is not set');

export const AppDataSource = new DataSource({
  type: 'postgres',
  url,
  ssl: { rejectUnauthorized: false },
  entities: ['src/modules/**/*.entity.ts'],
  migrations: ['src/infrastructure/database/migrations/*{.ts,.js}'],
  synchronize: false,
  logging: true,
});
