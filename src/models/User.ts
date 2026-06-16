// src/models/User.ts
// ─────────────────────────────────────────────────────────────────────────────
// CÁCH TIẾP CẬN: Dùng Sequelize thuần (không sequelize-typescript)
// Lý do: Ít thay đổi hơn, compatible với migrations hiện có, dễ review
// ─────────────────────────────────────────────────────────────────────────────

import {
  Model,
  DataTypes,
  Sequelize,
  Optional,
  Association,
  HasOneGetAssociationMixin,
  HasManyGetAssociationsMixin,
} from 'sequelize';

// ─── Attributes Interface ─────────────────────────────────────────────────────
// Mô tả đúng các column trong DB
export interface UserAttributes {
  id: number;
  email: string;
  username: string | null;
  name: string;
  status: 'active' | 'inactive';
  created_at?: Date;
}

// Optional khi create (id, created_at tự generate)
export type UserCreationAttributes = Optional<UserAttributes, 'id' | 'created_at'>;

// ─── Model Class ──────────────────────────────────────────────────────────────
export class User extends Model<UserAttributes, UserCreationAttributes>
  implements UserAttributes {
  // Khai báo các field để TypeScript biết type
  public id!: number;
  public email!: string;
  public username!: string | null;
  public name!: string;
  public status!: 'active' | 'inactive';

  // Timestamps (readonly vì Sequelize tự set)
  public readonly created_at!: Date;

  // ─── Association Mixins ─────────────────────────────────────────────────────
  // Sequelize tự generate các method này, ta chỉ khai báo type
  // Dùng khi cần call trực tiếp: user.getUserAuth(), user.getRoles()
  public getUserAuth!: HasOneGetAssociationMixin<UserAuthModel>;
  public getUserRoles!: HasManyGetAssociationsMixin<UserRoleModel>;
  public getCourses!: HasManyGetAssociationsMixin<CourseModel>;

  // ─── Association Declarations ───────────────────────────────────────────────
  public static associations: {
    user_auth: Association<User, UserAuthModel>;
    user_roles: Association<User, UserRoleModel>;
    instructor_courses: Association<User, CourseModel>;
  };

  // ─── Static: Initialize ─────────────────────────────────────────────────────
  static initialize(sequelize: Sequelize): typeof User {
    User.init(
      {
        id: {
          autoIncrement: true,
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
        },
        email: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true,
        },
        username: {
          type: DataTypes.STRING(100),
          allowNull: true,
          unique: true,
        },
        name: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        status: {
          type: DataTypes.STRING(50),
          allowNull: false,
          defaultValue: 'inactive',
        },
      },
      {
        sequelize,
        tableName: 'users',
        schema: 'public',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: false,
      }
    );

    return User;
  }

  // ─── Static: Associations ───────────────────────────────────────────────────
  static associate(models: ModelsMap): void {
    User.hasOne(models.UserAuth, { foreignKey: 'user_id', as: 'user_auth' });
    User.hasMany(models.UserRole, { foreignKey: 'user_id', as: 'user_roles' });
    User.hasMany(models.Course, { foreignKey: 'instructor_id', as: 'instructor_courses' });
    User.hasMany(models.Class, { foreignKey: 'instructor_id', as: 'instructor_classes' });
    User.hasMany(models.Enrollment, { foreignKey: 'user_id', as: 'enrollments' });
    User.belongsToMany(models.Role, {
      through: models.UserRole,
      foreignKey: 'user_id',
      otherKey: 'role_id',
      as: 'roles',
    });
  }
}

// Placeholder types - sẽ được fill khi import đầy đủ
// Tránh circular import bằng cách dùng interface thay vì import trực tiếp
type UserAuthModel = import('./UserAuth').UserAuth;
type UserRoleModel = import('./UserRole').UserRole;
type CourseModel = import('./Course').Course;
type ModelsMap = import('./index').ModelsMap;

export default User;
