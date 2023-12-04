const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const docValidation = require('../../validations/doc.validation');
const docController = require('../../controllers/doc.controller');

const router = express.Router();

router
  .route('/statement')
  .post(validate(docValidation.createStatement), docController.generateStatement)
  // .get(auth('getUsers'), validate(userValidation.getUsers), userController.getUsers);

router
  .route('/generate')
  .post(auth(), validate(docValidation.createDoc), docController.generateDocument)

// router
//   .route('/:username')
//   .get(auth('getUsers'), validate(userValidation.getUser), userController.getUser)
//   .patch(auth('manageUsers'), validate(userValidation.updateUser), userController.updateUser)
  // .delete(auth('manageUsers'), validate(userValidation.deleteUser), userController.deleteUser);

module.exports = router;
