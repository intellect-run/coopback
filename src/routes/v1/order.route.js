const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const orderController = require('../../controllers/order.controller');

const router = express.Router();

router
  .route('/ipn')
  .post(orderController.catchIPN)
  // .get(auth('getUsers'), validate(userValidation.getUsers), userController.getUsers);

// router
//   .route('/:username')
//   .get(auth('getUsers'), validate(userValidation.getUser), userController.getUser)
//   .patch(auth('manageUsers'), validate(userValidation.updateUser), userController.updateUser)
  // .delete(auth('manageUsers'), validate(userValidation.deleteUser), userController.deleteUser);

module.exports = router;
