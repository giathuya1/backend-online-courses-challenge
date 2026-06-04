const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  const classes = sequelize.define('classes', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    course_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Course ID (FK)"
    },
    class_name: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: "Class name/batch"
    },
    instructor_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Class instructor ID (FK)"
    },
    start_date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Class start date & time"
    },
    end_date: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: "Class end date & time"
    },
    max_students: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 30,
      comment: "Maximum students allowed"
    }
  }, {
    sequelize,
    tableName: 'classes',
    schema: 'public',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: "classes_pkey",
        unique: true,
        fields: [{ name: "id" }]
      }
    ]
  });

  classes.associate = function(models) {
    classes.belongsTo(models.courses, { foreignKey: 'course_id' });
    classes.belongsTo(models.users, { foreignKey: 'instructor_id', as: 'instructor' });
    classes.hasMany(models.enrollments, { foreignKey: 'class_id' });
  };

  return classes;
};