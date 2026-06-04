'use strict';

module.exports = function (sequelize, DataTypes) {
  const roles = sequelize.define(
    'roles',
    {
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true,
      },
    },
    {
      tableName: 'roles',
      schema: 'public',
      timestamps: false,
    }
  );

  roles.associate = function (models) {
    // roles(1) -> user_roles(n)
    roles.hasMany(models.user_roles, { foreignKey: 'role_id' });
  };

  return roles;
};