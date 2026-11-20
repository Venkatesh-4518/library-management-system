
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

// Securely hash a password using scrypt.
export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 32).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

// Verify a password against its stored scrypt hash.
export function verifyPassword(password, storedHash) {
  try {
    const [algorithm, salt, originalHash] = storedHash.split('$');

    if (algorithm !== 'scrypt' || !salt || !originalHash) {
      return false;
    }

    const originalBuffer = Buffer.from(originalHash, 'hex');
    const newBuffer = scryptSync(password, salt, 32);

    return originalBuffer.length === newBuffer.length &&
      timingSafeEqual(originalBuffer, newBuffer);
  } catch {
    return false;
  }
}
