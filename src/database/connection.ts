// src/database/connection.ts
import { Sequelize } from 'sequelize';
import { initializeModels, ModelsMap } from '../models';

const env = (process.env.NODE_ENV || 'development') as 'development' | 'test' | 'production';

const dbConfig = {
  development: {
    database: 'online_courses',
    username: 'app',
    password: 'app',
    host: process.env.DB_HOST || 'db',
    port: Number(process.env.DB_PORT) || 5432,
    dialect: 'postgres' as const,
    logging: false,
  },
  test: {
    database: 'online_courses',
    username: 'app',
    password: 'app',
    host: process.env.DB_HOST || 'db',
    port: Number(process.env.DB_PORT) || 5432,
    dialect: 'postgres' as const,
    logging: false,
  },
  production: {
    database: process.env.DB_NAME || 'online_courses',
    username: process.env.DB_USER || 'app',
    password: process.env.DB_PASSWORD || 'app',
    host: process.env.DB_HOST || 'db',
    port: Number(process.env.DB_PORT) || 5432,
    dialect: 'postgres' as const,
    logging: false,
  },
};

const config = dbConfig[env];

export const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  config
);

let _db: ModelsMap | null = null;

export function getDb(): ModelsMap {
  if (!_db) {
    _db = initializeModels(sequelize);
  }
  return _db;
}

const db = getDb();
export default db;