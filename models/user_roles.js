const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  const user_roles = sequelize.define('user_roles', {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      comment: "User ID (FK)"
    },
    role_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      comment: "Role ID (FK)"
    }
  }, {
    sequelize,
    tableName: 'user_roles',
    schema: 'public',
    timestamps: false,
    indexes: [
      {
        name: "user_roles_pkey",
        unique: true,
        fields: [{ name: "user_id" }, { name: "role_id" }]
      }
    ]
  });

  user_roles.associate = function(models) {
    user_roles.belongsTo(models.users, { foreignKey: 'user_id' });
    user_roles.belongsTo(models.roles, { foreignKey: 'role_id' });
  };

  return user_roles;
};