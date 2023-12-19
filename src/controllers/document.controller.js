const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { userService, documentService, coopService, blockchainService } = require('../services');



const regenerateDocument = catchAsync(async (req, res) => {
  
  const {
    coopname,
    username,
    action,
    doc,
  } = req.body

  const regenerated_document = await documentService.regenerateDocument(coopname, username, action, doc)

  res.send(regenerated_document)
})


const generateDecision = catchAsync(async (req, res) => {
  
  const {
    coopname,
    decision_id,
    lang,
  } = req.body

  const regenerated_document = await documentService.generateDecision(coopname, decision_id, lang)

  res.send(regenerated_document)
})


const generateStatement = catchAsync(async (req, res) => {
  
  const {
    coopname,
    lang,
    data
  } = req.body
  
  const statement = await documentService.generateStatement(coopname, lang, data)

  res.send(statement)

});


const getDocuments = catchAsync(async (req, res) => {

  const {
    account
  } = req.query

  const documents = await documentService.getDocuments(account)

  res.send(documents)  

  

});

module.exports = {
  generateDecision,
  generateStatement,
  getDocuments,
  regenerateDocument
};
