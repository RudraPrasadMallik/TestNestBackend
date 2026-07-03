const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const SUPPORTED_ALGORITHMS = [
  'none',
  'HS256', 'HS384', 'HS512',
  'RS256', 'RS384', 'RS512',
  'ES256', 'ES384', 'ES512',
  'PS256', 'PS384', 'PS512',
];

const jwtService = {
  /**
   * Decode a JWT without verification (just parse header + payload)
   */
  decode: (token) => {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid JWT format. Expected 3 parts separated by dots.');
      }

      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      const signature = parts[2];

      // Check expiry
      let isExpired = false;
      let expiresIn = null;
      if (payload.exp) {
        const now = Math.floor(Date.now() / 1000);
        isExpired = payload.exp < now;
        expiresIn = isExpired ? 0 : payload.exp - now;
      }

      return {
        header,
        payload,
        signature,
        isExpired,
        expiresIn,
      };
    } catch (err) {
      throw new Error(`Failed to decode JWT: ${err.message}`);
    }
  },

  /**
   * Encode (sign) a JWT with the given algorithm and key
   */
  encode: (payload, secret, algorithm, options = {}) => {
    if (!SUPPORTED_ALGORITHMS.includes(algorithm)) {
      throw new Error(`Unsupported algorithm: ${algorithm}. Supported: ${SUPPORTED_ALGORITHMS.join(', ')}`);
    }

    if (algorithm === 'none') {
      // Unsigned JWT
      const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
      const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
      return `${header}.${body}.`;
    }

    const signOptions = {
      algorithm,
      ...options,
    };

    // For RSA/EC/PS algorithms, the secret is actually a private key
    const token = jwt.sign(payload, secret, signOptions);
    return token;
  },

  /**
   * Verify a JWT with the given secret/key
   */
  verify: (token, secret, algorithm) => {
    try {
      const decoded = jwt.verify(token, secret, { algorithms: [algorithm] });
      return { valid: true, payload: decoded };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  },

  /**
   * Generate RSA key pair for RS256/RS384/RS512/PS256/PS384/PS512
   */
  generateRSAKeyPair: (modulusLength = 2048) => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    return { publicKey, privateKey };
  },

  /**
   * Generate EC key pair for ES256/ES384/ES512
   */
  generateECKeyPair: (algorithm) => {
    const curveMap = {
      ES256: 'prime256v1',
      ES384: 'secp384r1',
      ES512: 'secp521r1',
    };
    const curve = curveMap[algorithm] || 'prime256v1';

    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: curve,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    return { publicKey, privateKey };
  },

  getSupportedAlgorithms: () => SUPPORTED_ALGORITHMS,
};

module.exports = jwtService;
