// src/models/Role.ts
import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

export interface RoleAttributes {
  id: number;
  name: string;
}

export type RoleCreationAttributes = Optional<RoleAttributes, 'id'>;

export class Role extends Model<RoleAttributes, RoleCreationAttributes>
  implements RoleAttributes {
  public id!: number;
  public name!: string;

  static initialize(sequelize: Sequelize): typeof Role {
    Role.init(
      {
        id: { autoIncrement: true, type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
        name: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      },
      { sequelize, tableName: 'roles', schema: 'public', timestamps: false }
    );
    return Role;
  }

  static associate(models: import('./index').ModelsMap): void {
    Role.hasMany(models.UserRole, { foreignKey: 'role_id', as: 'user_roles' });
    Role.belongsToMany(models.User, {
      through: models.UserRole,
      foreignKey: 'role_id',
      otherKey: 'user_id',
      as: 'user_id_users',
    });
  }
}

export default Role;