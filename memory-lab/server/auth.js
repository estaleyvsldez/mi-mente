/* MEMORY LAB — autenticación: contraseñas con scrypt, tokens aleatorios guardados como hash. */
'use strict';
const crypto = require('crypto');

const TTL = 1000 * 60 * 60 * 24 * 90; // 90 días

function hashPassword(password, salt) {
  salt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64, { N: 16384, r: 8, p: 1 }).toString('hex');
  return { hash, salt };
}
function verifyPassword(password, salt, expected) {
  const { hash } = hashPassword(password, salt);
  const a = Buffer.from(hash, 'hex'), b = Buffer.from(expected, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
const newToken = () => crypto.randomBytes(32).toString('base64url');
const tokenHash = t => crypto.createHash('sha256').update(String(t)).digest('hex');

function validateCredentials(username, password) {
  if (typeof username !== 'string' || !/^[\p{L}\p{N}_.\-]{3,32}$/u.test(username)) return 'El usuario debe tener 3-32 caracteres (letras, números, punto, guion o guion bajo).';
  if (typeof password !== 'string' || password.length < 8 || password.length > 200) return 'La contraseña debe tener al menos 8 caracteres.';
  return null;
}

/* Limitador sencillo de intentos de inicio de sesión por IP. */
function makeLimiter(max, windowMs) {
  const hits = new Map();
  return function allow(key) {
    const now = Date.now();
    const arr = (hits.get(key) || []).filter(t => now - t < windowMs);
    arr.push(now);
    hits.set(key, arr);
    if (hits.size > 10000) hits.clear();
    return arr.length <= max;
  };
}

module.exports = { TTL, hashPassword, verifyPassword, newToken, tokenHash, validateCredentials, makeLimiter };
