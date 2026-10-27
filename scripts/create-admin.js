/* Secure first-admin creation. Usage:
 *   npm run create-admin                       (prompts; password input is hidden)
 *   ADMIN_NAME=.. ADMIN_EMAIL=.. ADMIN_PASSWORD=.. npm run create-admin   (non-interactive, e.g. CI/hosting shell)
 * Admins can never be created through the public API.
 */
require('dotenv').config();
const readline = require('readline');
const mongoose = require('mongoose');
const connectDB = require('../server/config/db');
const User = require('../server/models/User');
const { EMAIL_RE } = require('../server/utils/validate');

function ask(q, hidden = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) {
      rl._writeToOutput = (s) => { if (s.includes(q)) process.stdout.write(s); else if (s.includes('\n') || s.includes('\r')) process.stdout.write('\n'); };
    }
    rl.question(q, (a) => { rl.close(); resolve(a.trim()); });
  });
}

(async () => {
  const name = process.env.ADMIN_NAME || (await ask('Admin full name: '));
  const email = (process.env.ADMIN_EMAIL || (await ask('Admin email: '))).toLowerCase();
  const password = process.env.ADMIN_PASSWORD || (await ask('Admin password (min 10 chars): ', true));
  if (name.length < 2 || !EMAIL_RE.test(email)) throw new Error('Valid name and email are required');
  if (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) throw new Error('Password must be 10+ characters with letters and numbers');

  await connectDB();
  const existing = await User.findOne({ email });
  if (existing) {
    existing.role = 'admin'; existing.active = true;
    existing.password = await User.hash(password);
    await existing.save();
    console.log(`Updated existing user ${email} to admin with the new password.`);
  } else {
    await User.create({ name, email, password: await User.hash(password), role: 'admin' });
    console.log(`Admin created: ${email}`);
  }
  await mongoose.disconnect();
})().catch((e) => { console.error('Error:', e.message); process.exit(1); });
