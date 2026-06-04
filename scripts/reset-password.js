const bcrypt = require('bcrypt');
const db = require('../models');

async function main() {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.error('Usage: node scripts/reset-password.js <email> <newPassword>');
    process.exit(1);
  }

  const { users, user_auth } = db;

  const user = await users.findOne({ where: { email } });
  if (!user) {
    console.error('User not found:', email);
    process.exit(2);
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  // user_auth PK is user_id in your code (findByPk(user.id))
  let auth = await user_auth.findByPk(user.id);
  if (!auth) {
    auth = await user_auth.create({ user_id: user.id, password_hash: passwordHash });
  } else {
    await auth.update({ password_hash: passwordHash });
  }

  // ensure user active so login works
  if (user.status !== 'active') {
    await user.update({ status: 'active' });
  }

  console.log('Password reset OK for:', email);
  await db.sequelize.close();
}

main().catch(async (err) => {
  console.error('Reset failed:', err);
  try { await db.sequelize.close(); } catch {}
  process.exit(99);
});