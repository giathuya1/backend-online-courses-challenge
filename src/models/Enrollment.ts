// src/models/Enrollment.ts
import { Model, DataTypes, Sequelize, Optional } from 'sequelize';
import { EnrollmentStatus } from '../types/api.types';

export interface EnrollmentAttributes {
  id: number;
  user_id: number | null;
  class_id: number | null;
  status: EnrollmentStatus;
  created_at?: Date;
  updated_at?: Date;
}

export type EnrollmentCreationAttributes = Optional<EnrollmentAttributes, 'id' | 'status' | 'created_at' | 'updated_at'>;

export class Enrollment extends Model<EnrollmentAttributes, EnrollmentCreationAttributes>
  implements EnrollmentAttributes {
  public id!: number;
  public user_id!: number | null;
  public class_id!: number | null;
  public status!: EnrollmentStatus;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Eager loaded
  public user?: import('./User').User;
  public class?: import('./Class').Class;

  static initialize(sequelize: Sequelize): typeof Enrollment {
    Enrollment.init(
      {
        id: { autoIncrement: true, type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
        user_id: { type: DataTypes.INTEGER, allowNull: true },
        class_id: { type: DataTypes.INTEGER, allowNull: true },
        status: { type: DataTypes.STRING(50), allowNull: true, defaultValue: 'active' },
      },
      { sequelize, tableName: 'enrollments', schema: 'public', timestamps: true, underscored: true }
    );
    return Enrollment;
  }

  static associate(models: import('./index').ModelsMap): void {
    Enrollment.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
    Enrollment.belongsTo(models.Class, { foreignKey: 'class_id', as: 'class' });
  }
}

export default Enrollment;