// src/repositories/auth.repository.ts
// PURE DATA ACCESS. Every method here is a thin Sequelize call.
// Nothing in this file should throw a domain error (NotFoundError,
// FieldError...), know about JWT, bcrypt, or HTTP. That separation is
// what lets services/auth.service.ts be unit-tested by mocking this
// repository, instead of needing a real Postgres connection.

import { Op } from 'sequelize';
import db from '../database/connection';
import { normalizeEmail } from '../validators/common.validator';

const { User, UserAuth, UserRole, Role } = db;

export const AuthRepository = {
  findUserByEmail(email: string) {
    return User.findOne({ where: { email: normalizeEmail(email) } });
  },

  findUserByUsername(username: string) {
    return User.findOne({ where: { username } });
  },

  findUserByEmailOrUsername(identifier: string) {
    return User.findOne({
      where: { [Op.or]: [{ email: normalizeEmail(identifier) }, { username: identifier }] },
    });
  },

  findUserById(id: number) {
    return User.findByPk(id);
  },

  findUserProfileById(id: number) {
    return User.findByPk(id, {
      attributes: ['id', 'email', 'username', 'name', 'status', 'created_at'],
      include: [{
        model: UserRole,
        as: 'user_roles',
        include: [{ model: Role, attributes: ['name'] }],
      }],
    });
  },

  createUser(data: { email: string; username: string; name: string; status: 'active' | 'inactive' }) {
    return User.create(data);
  },

  createUserAuth(data: { user_id: number; password_hash: string }) {
    return UserAuth.create(data);
  },

  findAuthByUserId(userId: number) {
    return UserAuth.findByPk(userId);
  },

  findRoleByName(name: string) {
    return Role.findOne({ where: { name } });
  },

  assignDefaultRole(userId: number, roleId: number) {
    return UserRole.findOrCreate({
      where: { user_id: userId, role_id: roleId },
      defaults: { user_id: userId, role_id: roleId },
    });
  },

  async getPrimaryRoleName(userId: number): Promise<string> {
    const userRole = await UserRole.findOne({
      where: { user_id: userId },
      include: [{ model: Role, attributes: ['name'] }],
    });
    return (userRole as any)?.role?.name ?? 'student';
  },
};
