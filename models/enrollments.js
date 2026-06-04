const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  const enrollments = sequelize.define('enrollments', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Student user ID (FK)"
    },
    class_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: "Class ID (FK)"
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: true,
      defaultValue: "active",
      comment: "Enrollment status: active or dropped"
    }
  }, {
    sequelize,
    tableName: 'enrollments',
    schema: 'public',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: "idx_enrollments_user",
        fields: [{ name: "user_id" }]
      },
      {
        name: "idx_enrollments_class",
        fields: [{ name: "class_id" }]
      },
      {
        name: "enrollments_pkey",
        unique: true,
        fields: [{ name: "id" }]
      }
    ]
  });

  enrollments.associate = function(models) {
    enrollments.belongsTo(models.users, { foreignKey: 'user_id' });
    enrollments.belongsTo(models.classes, { foreignKey: 'class_id' });
  };

  return enrollments;
};