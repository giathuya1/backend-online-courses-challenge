// src/providers/roles.provider.ts
// Pure business logic — no Express imports.
// CHANGED: throws FieldError (utils/errors.ts) instead of a raw
// `throw { statusCode, field, ... }` object, so this module behaves
// exactly like courses.provider.ts / classes.provider.ts and can be
// caught generically by handleControllerError everywhere.

import db from '../database/connection';
import { RoleName } from '../types/api.types';
import { FieldError } from '../utils/errors';

const { Role, User, UserRole } = db;

export const RolesProvider = {
  async list() {
    return Role.findAll({ attributes: ['id', 'name'], order: [['id', 'ASC']] });
  },

  async assign(userId: number, roleName: RoleName) {
    const user = await User.findByPk(userId, { attributes: ['id', 'email', 'name'] });
    if (!user) throw new FieldError('user_id', 'User not found', 'exists');

    const role = await Role.findOne({ where: { name: roleName }, attributes: ['id', 'name'] });
    if (!role) throw new FieldError('role', 'Role not found in database', 'exists');

    // findOrCreate avoids a duplicate-key error if the user already has this role
    await UserRole.findOrCreate({
      where: { user_id: user.id, role_id: role.id },
      defaults: { user_id: user.id, role_id: role.id },
    });

    return {
      user: { id: user.id, email: user.email, name: user.name },
      role: role.name,
    };
  },
};
