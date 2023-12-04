const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { userService } = require('../services');
const { blockchainService } = require('../services');
const { orderService } = require('../services');


const catchIPN = catchAsync(async (req, res) => {
  
  await orderService.catchIPN(req.body)
  
  res.status(httpStatus.CREATED).send();

});


module.exports = {
  catchIPN
};
