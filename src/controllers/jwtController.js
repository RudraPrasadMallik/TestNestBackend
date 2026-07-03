const jwtService = require('../services/jwtService');

const jwtController = {
  /**
   * POST /jwt/decode
   * Body: { token }
   */
  decode: (req, res) => {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({ error: 'token is required' });
      }

      const decoded = jwtService.decode(token);
      return res.json({ success: true, ...decoded });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  },

  /**
   * POST /jwt/encode
   * Body: { payload, secret, algorithm, expiresIn? }
   */
  encode: (req, res) => {
    try {
      const { payload, secret, algorithm, expiresIn } = req.body;

      if (!payload) {
        return res.status(400).json({ error: 'payload is required' });
      }
      if (!algorithm) {
        return res.status(400).json({ error: 'algorithm is required' });
      }
      if (algorithm !== 'none' && !secret) {
        return res.status(400).json({ error: 'secret/key is required for signed tokens' });
      }

      // Parse payload if it's a string
      let parsedPayload = payload;
      if (typeof payload === 'string') {
        try {
          parsedPayload = JSON.parse(payload);
        } catch (e) {
          return res.status(400).json({ error: 'Invalid JSON payload' });
        }
      }

      const options = {};
      if (expiresIn) {
        options.expiresIn = expiresIn;
      }

      const token = jwtService.encode(parsedPayload, secret, algorithm, options);
      return res.json({ success: true, token });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  },

  /**
   * POST /jwt/verify
   * Body: { token, secret, algorithm }
   */
  verify: (req, res) => {
    try {
      const { token, secret, algorithm } = req.body;

      if (!token) {
        return res.status(400).json({ error: 'token is required' });
      }
      if (!secret) {
        return res.status(400).json({ error: 'secret/key is required' });
      }
      if (!algorithm) {
        return res.status(400).json({ error: 'algorithm is required' });
      }

      const result = jwtService.verify(token, secret, algorithm);
      return res.json({ success: true, ...result });
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  },

  /**
   * POST /jwt/generate-keys
   * Body: { algorithm }
   */
  generateKeys: (req, res) => {
    try {
      const { algorithm } = req.body;

      if (!algorithm) {
        return res.status(400).json({ error: 'algorithm is required' });
      }

      if (['RS256', 'RS384', 'RS512', 'PS256', 'PS384', 'PS512'].includes(algorithm)) {
        const keys = jwtService.generateRSAKeyPair();
        return res.json({ success: true, ...keys, algorithm });
      }

      if (['ES256', 'ES384', 'ES512'].includes(algorithm)) {
        const keys = jwtService.generateECKeyPair(algorithm);
        return res.json({ success: true, ...keys, algorithm });
      }

      return res.status(400).json({ error: 'Key generation only supported for RSA (RS/PS) and EC (ES) algorithms. HS algorithms use a shared secret string.' });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  },

  /**
   * GET /jwt/algorithms
   */
  getAlgorithms: (req, res) => {
    const algorithms = jwtService.getSupportedAlgorithms();
    return res.json({ success: true, algorithms });
  },
};

module.exports = jwtController;
