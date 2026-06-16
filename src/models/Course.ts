// src/models/Course.ts
import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

export type CourseStatus = 'draft' | 'published';

export interface CourseAttributes {
  id: number;
  title: string;
  description: string | null;
  status: CourseStatus;
  instructor_id: number | null;
  created_at?: Date;
  updated_at?: Date;
}

export type CourseCreationAttributes = Optional<CourseAttributes, 'id' | 'status' | 'created_at' | 'updated_at'>;

export class Course extends Model<CourseAttributes, CourseCreationAttributes>
  implements CourseAttributes {
  public id!: number;
  public title!: string;
  public description!: string | null;
  public status!: CourseStatus;
  public instructor_id!: number | null;

  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Eager loaded associations (available after include)
  public instructor?: import('./User').User;
  public classes?: import('./Class').Class[];

  static initialize(sequelize: Sequelize): typeof Course {
    Course.init(
      {
        id: {
          autoIncrement: true,
          type: DataTypes.INTEGER,
          allowNull: false,
          primaryKey: true,
        },
        title: {
          type: DataTypes.STRING(255),
          allowNull: false,
        },
        description: {
          type: DataTypes.TEXT,
          allowNull: true,
        },
        status: {
          type: DataTypes.STRING(50),
          allowNull: true,
          defaultValue: 'draft',
        },
        instructor_id: {
          type: DataTypes.INTEGER,
          allowNull: true,
        },
      },
      {
        sequelize,
        tableName: 'courses',
        schema: 'public',
        timestamps: true,
        underscored: true,
        indexes: [
          { name: 'idx_courses_title', fields: ['title'] },
          { name: 'idx_courses_status', fields: ['status'] },
        ],
      }
    );

    return Course;
  }

  static associate(models: import('./index').ModelsMap): void {
    Course.belongsTo(models.User, { foreignKey: 'instructor_id', as: 'instructor' });
    Course.hasMany(models.Class, { foreignKey: 'course_id', as: 'classes' });
  }
}

export default Course;
