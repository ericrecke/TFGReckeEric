const express = require('express');
const {
    getOperations,
    createOperation,
    closeOperation
} = require('../controllers/operation.controllers');
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

router.get('/', authMiddleware, getOperations);
router.post('/', authMiddleware, createOperation);
router.patch('/:id/close', authMiddleware, closeOperation);

module.exports = router;
