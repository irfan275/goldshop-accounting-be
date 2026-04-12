const express = require('express');
const router = express.Router();
const { login_validator, register_user_validator, forgot_password_validator, reset_password_validator, update_user_validator } = require('../validators/user.validator');
const {validate} = require('../validators/validate');
const { authenticateToken } = require("../validators/middleware");
const {loginUser,createUser, getAllUsers, getUserById, deleteUser, updateUser} = require('../controller/user.controller');
const { restrictToEmployee } = require('../validators/roleMiddleware');

router.post('/login', login_validator(),validate,loginUser);

// Create a new user
router.post('/', authenticateToken,restrictToEmployee,register_user_validator(),validate,createUser);

// Get all user
router.get('/', authenticateToken,restrictToEmployee,getAllUsers);

// Get a user by ID
router.get('/:id', authenticateToken,restrictToEmployee,getUserById);

// Update a user by ID
router.put('/:id', authenticateToken,restrictToEmployee,updateUser);

// Delete a user by ID
router.delete('/:id',authenticateToken,restrictToEmployee, deleteUser);

module.exports = router;