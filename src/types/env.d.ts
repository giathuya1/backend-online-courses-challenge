// src/types/env.d.ts
// Typing cho process.env - tránh undefined errors

declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV?: 'development' | 'test' | 'production';
    PORT?: string;

    // Database
    DB_HOST?: string;
    DB_PORT?: string;
    DB_NAME?: string;
    DB_USER?: string;
    DB_PASSWORD?: string;

    // JWT
    JWT_SECRET?: string;
    JWT_EXPIRY?: string;

    // Email
    EMAIL_USER?: string;
    EMAIL_PASSWORD?: string;
    EMAIL_FROM?: string;

    // OTP
    OTP_EXPIRY_MINUTES?: string;

    // App
    APP_URL?: string;

    // Cron
    CRON_TZ?: string;

    // Seed
    SEED_DEMO_PASSWORD?: string;
    SEED_ADMIN_EMAIL?: string;
    SEED_INSTRUCTOR_EMAIL?: string;
    SEED_STUDENT_EMAIL?: string;
  }
}
