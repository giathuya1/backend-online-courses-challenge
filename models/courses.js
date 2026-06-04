const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  const courses = sequelize.define('courses', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: "Course title"
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Course description"
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: "draft",
      comment: "Status: draft or published"
    },
    instructor_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Instructor user ID (FK)"
    }
  }, {
    sequelize,
    tableName: 'courses',
    schema: 'public',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: "idx_courses_title",
        fields: [{ name: "title" }]
      },
      {
        name: "idx_courses_status",
        fields: [{ name: "status" }]
      },
      {
        name: "courses_pkey",
        unique: true,
        fields: [{ name: "id" }]
      }
    ]
  });

  courses.associate = function(models) {
    courses.belongsTo(models.users, { foreignKey: 'instructor_id', as: 'instructor' });
    courses.hasMany(models.classes, { foreignKey: 'course_id' });
  };

  return courses;
};