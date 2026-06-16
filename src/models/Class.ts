// src/models/Class.ts
import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

export interface ClassAttributes {
  id: number;
  course_id: number | null;
  class_name: string | null;
  instructor_id: number | null;
  start_date: Date | null;
  end_date: Date | null;
  max_students: number;
  created_at?: Date;
  updated_at?: Date;
}

export type ClassCreationAttributes = Optional<ClassAttributes, 'id' | 'max_students' | 'created_at' | 'updated_at'>;

export class Class extends Model<ClassAttributes, ClassCreationAttributes>
  implements ClassAttributes {
  public id!: number;
  public course_id!: number | null;
  public class_name!: string | null;
  public instructor_id!: number | null;
  public start_date!: Date | null;
  public end_date!: Date | null;
  public max_students!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Eager loaded
  public course?: import('./Course').Course;
  public instructor?: import('./User').User;
  public enrollments?: import('./Enrollment').Enrollment[];

  static initialize(sequelize: Sequelize): typeof Class {
    Class.init(
      {
        id: { autoIncrement: true, type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
        course_id: { type: DataTypes.INTEGER, allowNull: true },
        class_name: { type: DataTypes.STRING(255), allowNull: true },
        instructor_id: { type: DataTypes.INTEGER, allowNull: true },
        start_date: { type: DataTypes.DATE, allowNull: true },
        end_date: { type: DataTypes.DATE, allowNull: true },
        max_students: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 30 },
      },
      { sequelize, tableName: 'classes', schema: 'public', timestamps: true, underscored: true }
    );
    return Class;
  }

  static associate(models: import('./index').ModelsMap): void {
    Class.belongsTo(models.Course, { foreignKey: 'course_id', as: 'course' });
    Class.belongsTo(models.User, { foreignKey: 'instructor_id', as: 'instructor' });
    Class.hasMany(models.Enrollment, { foreignKey: 'class_id', as: 'enrollments' });
  }
}

export default Class;