const express = require('express');
const auth = require('../../middlewares/auth');
const validate = require('../../middlewares/validate');
const coopValidation = require('../../validations/coop.validation');
const coopController = require('../../controllers/coop.controller');

const router = express.Router();

router
  .route('/agenda')
  .get(auth('loadAgenda'), validate(coopValidation.loadAgenda), coopController.loadAgenda);

router
  .route('/staff')
  .get(auth('loadStaff'), validate(coopValidation.loadStaff), coopController.loadStaff);

router
  .route('/members')
  .get(auth('loadMembers'), validate(coopValidation.loadMembers), coopController.loadMembers);


module.exports = router;
