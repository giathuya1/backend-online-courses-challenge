const Sequelize = require('sequelize');

module.exports = function (sequelize, DataTypes) {
  const users = sequelize.define(
    'users',
    {
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: 'users_email_key',
        comment: 'User email (unique)'
      },

      // ✅ Add username field (DB của bạn nói đã add trong PostgreSQL)
      username: {
        type: DataTypes.STRING(100),
        allowNull: true,
        unique: 'users_username_key',
        comment: 'Username for login (unique)'
      },

      name: {
        type: DataTypes.STRING(255),
        allowNull: false,
        comment: 'User full name'
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'inactive',
        comment: 'Account status: active or inactive'
      }
    },
    {
      sequelize,
      tableName: 'users',
      schema: 'public',

      // ✅ DB là snake_case: created_at
      timestamps: true,
      underscored: true,

      // Map Sequelize timestamps -> DB column
      createdAt: 'created_at',

      // prompt.sql hiện không có updated_at nên tắt để tránh lỗi
      updatedAt: false,

      indexes: [
        {
          name: 'idx_users_email',
          fields: [{ name: 'email' }]
        },
        {
          name: 'idx_users_username',
          fields: [{ name: 'username' }]
        },
        {
          name: 'users_email_key',
          unique: true,
          fields: [{ name: 'email' }]
        },
        {
          name: 'users_pkey',
          unique: true,
          fields: [{ name: 'id' }]
        }
      ]
    }
  );

  users.associate = function (models) {
    users.hasOne(models.user_auth, { foreignKey: 'user_id' });
    users.hasMany(models.user_roles, { foreignKey: 'user_id' });
    users.hasMany(models.courses, { foreignKey: 'instructor_id', as: 'instructor_courses' });
    users.hasMany(models.classes, { foreignKey: 'instructor_id', as: 'instructor_classes' });
    users.hasMany(models.enrollments, { foreignKey: 'user_id' });
  };

  return users;
};