const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const documentValidation = require('../../validations/document.validation');
const docController = require('../../controllers/document.controller');

const router = express.Router();

router
  .route('/statement')
  .post(validate(documentValidation.createStatement), docController.generateStatement)
  // .get(auth('getUsers'), validate(userValidation.getUsers), userController.getUsers);

router
  .route('/decision')
  .post(auth(), validate(documentValidation.generateDecision), docController.generateDecision)

router
  .route('/regenerate')
  .post(auth(), validate(documentValidation.regenerateDocument), docController.regenerateDocument)

router
  .route('/get')
  .get(auth(), validate(documentValidation.getDocuments), docController.getDocuments)

// router
//   .route('/:username')
//   .get(auth('getUsers'), validate(userValidation.getUser), userController.getUser)
//   .patch(auth('manageUsers'), validate(userValidation.updateUser), userController.updateUser)
  // .delete(auth('manageUsers'), validate(userValidation.deleteUser), userController.deleteUser);

module.exports = router;
