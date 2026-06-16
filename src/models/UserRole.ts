// src/models/UserRole.ts
import { Model, DataTypes, Sequelize } from 'sequelize';

export interface UserRoleAttributes {
  user_id: number;
  role_id: number;
}

export class UserRole extends Model<UserRoleAttributes> implements UserRoleAttributes {
  public user_id!: number;
  public role_id!: number;

  // Eager loaded
  public role?: import('./Role').Role;

  static initialize(sequelize: Sequelize): typeof UserRole {
    UserRole.init(
      {
        user_id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
        role_id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
      },
      { sequelize, tableName: 'user_roles', schema: 'public', timestamps: false }
    );
    return UserRole;
  }

  static associate(models: import('./index').ModelsMap): void {
    UserRole.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    UserRole.belongsTo(models.Role, { foreignKey: 'role_id', as: 'role' });
  }
}

export default UserRole;