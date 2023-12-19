const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { coopService } = require('../services');


const loadAgenda = catchAsync(async (req, res) => {

  const {
    coopname
  } = req.query

  const decisions = await coopService.loadAgenda(coopname)

  res.send(decisions)  

});



const loadStaff = catchAsync(async (req, res) => {

  const {
    coopname
  } = req.query

  const staff = await coopService.loadStaff(coopname)

  res.send(staff)  

});


const loadMembers = catchAsync(async (req, res) => {

  const {
    coopname
  } = req.query

  const members = await coopService.loadMembers(coopname)

  res.send(members)  

});



module.exports = {
  loadAgenda,
  loadStaff,
  loadMembers
};
