// src/providers/roles.provider.ts
// Pure business logic — no Express imports.

import db from '../database/connection';
import { RoleName } from '../types/api.types';

const { Role, User, UserRole } = db;

export const RolesProvider = {

  async list() {
    return Role.findAll({ attributes: ['id', 'name'], order: [['id', 'ASC']] });
  },

  async assign(userId: number, roleName: RoleName) {
    const user = await User.findByPk(userId, { attributes: ['id', 'email', 'name'] });
    if (!user) throw { statusCode: 400, field: 'user_id', rule: 'exists', message: 'User not found' };

    const role = await Role.findOne({ where: { name: roleName }, attributes: ['id', 'name'] });
    if (!role) throw { statusCode: 400, field: 'role', rule: 'exists', message: 'Role not found in database' };

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