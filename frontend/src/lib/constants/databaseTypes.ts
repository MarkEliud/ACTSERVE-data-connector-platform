// frontend/src/lib/constants/databaseTypes.ts
export const DATABASE_TYPES_CONFIG = {
  postgresql: {
    name: 'PostgreSQL',
    defaultPort: 5432,
    driver: 'psycopg2',
    connectionString: 'postgresql://{user}:{password}@{host}:{port}/{database}',
    icon: '🐘',
    color: '#336791',
  },
  mysql: {
    name: 'MySQL',
    defaultPort: 3306,
    driver: 'mysqlclient',
    connectionString: 'mysql://{user}:{password}@{host}:{port}/{database}',
    icon: '🐬',
    color: '#00758f',
  },
  mongodb: {
    name: 'MongoDB',
    defaultPort: 27017,
    driver: 'pymongo',
    connectionString: 'mongodb://{user}:{password}@{host}:{port}/{database}',
    icon: '🍃',
    color: '#4DB33D',
  },
  clickhouse: {
    name: 'ClickHouse',
    defaultPort: 8123,
    driver: 'clickhouse-driver',
    connectionString: 'clickhouse://{user}:{password}@{host}:{port}/{database}',
    icon: '🏠',
    color: '#FFCC01',
  },
} as const;

export type DatabaseType = keyof typeof DATABASE_TYPES_CONFIG;

export const getDatabaseConfig = (type: DatabaseType) => {
  return DATABASE_TYPES_CONFIG[type];
};

export const getDatabaseIcon = (type: DatabaseType): string => {
  return DATABASE_TYPES_CONFIG[type]?.icon || '🗄️';
};

export const getDatabaseColor = (type: DatabaseType): string => {
  return DATABASE_TYPES_CONFIG[type]?.color || '#6c757d';
};