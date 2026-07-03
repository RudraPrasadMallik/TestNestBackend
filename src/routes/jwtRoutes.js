const express = require('express');
const router = express.Router();
const jwtController = require('../controllers/jwtController');

router.post('/jwt/decode', jwtController.decode);
router.post('/jwt/encode', jwtController.encode);
router.post('/jwt/verify', jwtController.verify);
router.post('/jwt/generate-keys', jwtController.generateKeys);
router.get('/jwt/algorithms', jwtController.getAlgorithms);

module.exports = router;
