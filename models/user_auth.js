const Sequelize = require('sequelize');
module.exports = function(sequelize, DataTypes) {
  const user_auth = sequelize.define('user_auth', {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      comment: "User ID (FK to users)"
    },
    password_hash: {
      type: DataTypes.TEXT,
      allowNull: false,
      comment: "Bcrypt hashed password"
    },
    otp_code: {
      type: DataTypes.STRING(6),
      allowNull: true,
      comment: "6-digit OTP code (plain)"
    },
    otp_hash: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Bcrypt hashed OTP"
    },
    otp_expiry: {
      type: DataTypes.BIGINT,
      allowNull: true,
      comment: "OTP expiry time (epoch ms)"
    },
    password_changed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    failed_attempts: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0
    },
    locked_until: {
      type: DataTypes.DATE,
      allowNull: true
    },
    refresh_token_hash: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  }, {
    sequelize,
    tableName: 'user_auth',
    schema: 'public',
    timestamps: false,
    underscored: true,
    indexes: [
      {
        name: "user_auth_pkey",
        unique: true,
        fields: [{ name: "user_id" }]
      }
    ]
  });

  user_auth.associate = function(models) {
    user_auth.belongsTo(models.users, { foreignKey: 'user_id' });
  };

  return user_auth;
};

