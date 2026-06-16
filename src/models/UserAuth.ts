// src/models/UserAuth.ts
import { Model, DataTypes, Sequelize, Optional } from 'sequelize';

export interface UserAuthAttributes {
  user_id: number;
  password_hash: string;
  otp_code: string | null;
  otp_hash: string | null;
  otp_expiry: bigint | null;
  password_changed_at: Date | null;
  failed_attempts: number;
  locked_until: Date | null;
  refresh_token_hash: string | null;
}

export type UserAuthCreationAttributes = Optional<
  UserAuthAttributes,
  'otp_code' | 'otp_hash' | 'otp_expiry' | 'password_changed_at' | 'failed_attempts' | 'locked_until' | 'refresh_token_hash'
>;

export class UserAuth extends Model<UserAuthAttributes, UserAuthCreationAttributes>
  implements UserAuthAttributes {
  public user_id!: number;
  public password_hash!: string;
  public otp_code!: string | null;
  public otp_hash!: string | null;
  public otp_expiry!: bigint | null;
  public password_changed_at!: Date | null;
  public failed_attempts!: number;
  public locked_until!: Date | null;
  public refresh_token_hash!: string | null;

  static initialize(sequelize: Sequelize): typeof UserAuth {
    UserAuth.init(
      {
        user_id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true },
        password_hash: { type: DataTypes.TEXT, allowNull: false },
        otp_code: { type: DataTypes.STRING(6), allowNull: true },
        otp_hash: { type: DataTypes.TEXT, allowNull: true },
        otp_expiry: { type: DataTypes.BIGINT, allowNull: true },
        password_changed_at: { type: DataTypes.DATE, allowNull: true },
        failed_attempts: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
        locked_until: { type: DataTypes.DATE, allowNull: true },
        refresh_token_hash: { type: DataTypes.TEXT, allowNull: true },
      },
      { sequelize, tableName: 'user_auth', schema: 'public', timestamps: false, underscored: true }
    );
    return UserAuth;
  }

  static associate(models: import('./index').ModelsMap): void {
    UserAuth.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
  }
}

export default UserAuth;