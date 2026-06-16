// src/models/index.ts
// Central models registry - thay thế models/index.js

import { Sequelize } from 'sequelize';
import { User } from './User';
import { UserAuth } from './UserAuth';
import { UserRole } from './UserRole';
import { Role } from './Role';
import { Course } from './Course';
import { Class } from './Class';
import { Enrollment } from './Enrollment';

// ─── Models Map Type ──────────────────────────────────────────────────────────
// Dùng để type-safe cho associations
export interface ModelsMap {
  User: typeof User;
  UserAuth: typeof UserAuth;
  UserRole: typeof UserRole;
  Role: typeof Role;
  Course: typeof Course;
  Class: typeof Class;
  Enrollment: typeof Enrollment;
  sequelize: Sequelize;
  Sequelize: typeof Sequelize;
}

// ─── Initialize all models ────────────────────────────────────────────────────
export function initializeModels(sequelize: Sequelize): ModelsMap {
  // 1. Initialize (define schema)
  User.initialize(sequelize);
  UserAuth.initialize(sequelize);
  UserRole.initialize(sequelize);
  Role.initialize(sequelize);
  Course.initialize(sequelize);
  Class.initialize(sequelize);
  Enrollment.initialize(sequelize);

  // 2. Build models map
  const models: ModelsMap = {
    User,
    UserAuth,
    UserRole,
    Role,
    Course,
    Class,
    Enrollment,
    sequelize,
    Sequelize,
  };

  // 3. Associate (sau khi tất cả đã initialized)
  User.associate(models);
  UserAuth.associate(models);
  UserRole.associate(models);
  Role.associate(models);
  Course.associate(models);
  Class.associate(models);
  Enrollment.associate(models);

  return models;
}

// Re-export models để import dễ hơn
export { User, UserAuth, UserRole, Role, Course, Class, Enrollment };
