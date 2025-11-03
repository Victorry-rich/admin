import { ConnectionOptions, DatabaseDialect } from '@adminjs/sql';

export const databaseType = process.env.DATABASE_DIALECT as DatabaseDialect;

export const connectionOptions: ConnectionOptions = {
  connectionString: process.env.DATABASE_URL,
  database: process.env.DATABASE_NAME,
  schema: 'public'
};
