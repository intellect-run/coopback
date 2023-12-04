const httpStatus = require('http-status');
const pick = require('../utils/pick');
const ApiError = require('../utils/ApiError');
const catchAsync = require('../utils/catchAsync');
const { userService } = require('../services');
const { blockchainService } = require('../services');
const { renderTemplate, convertToPDF } = require('../utils/templateProcessor')
const ecc = require('eosjs-ecc');


const getActiveTemplateForAction = (action_name, drafts, translations) => {    
    if (drafts && translations) {
      const draft = Object.values(drafts).find(
        (el) => el.is_activated == 1 && el.action_name == action_name
      )
      const translation = Object.values(translations).find(
        (el) => el.id == draft.default_translation_id
      )
      
      return { context: draft.context, translation: JSON.parse(translation.data) }
    } else return {}
}





const generateDocument = catchAsync(async (req, res) => {
  
  const {
    username,
    lang,
    action,
    data
  } = req.body

  const api = await blockchainService.getApi()

  const drafts = await blockchainService.lazyFetch(api, process.env.DRAFT_CONTRACT, process.env.DRAFT_CONTRACT, 'drafts')  
  const translations = await blockchainService.lazyFetch(api, process.env.DRAFT_CONTRACT, process.env.DRAFT_CONTRACT, 'translations')
  
  const { context, translation } = getActiveTemplateForAction(action, drafts, translations)

  if (action === 'joincoop') {

    if (Number(data.meta.version) === 1) {

      if (data.is_organization == false) {
        const content = await renderTemplate(context, data, translation);
        const buffer = await convertToPDF(content);
        const hash = ecc.sha256(buffer);

        res.send({content, buffer, hash})
      } else {
        //for organization

      }
    }
  }

});


const generateStatement = catchAsync(async (req, res) => {
  
  const {
    lang,
    data
  } = req.body
  
  const action = "joincoop"

  const api = await blockchainService.getApi()

  const drafts = await blockchainService.lazyFetch(api, process.env.DRAFT_CONTRACT, process.env.DRAFT_CONTRACT, 'drafts')  
  const translations = await blockchainService.lazyFetch(api, process.env.DRAFT_CONTRACT, process.env.DRAFT_CONTRACT, 'translations')
  
  const { context, translation } = getActiveTemplateForAction(action, drafts, translations)

  if (Number(data.meta.version) === 1) {

    if (data.is_organization == false) {
      const content = await renderTemplate(context, data, translation);
      const buffer = await convertToPDF(content);
      const hash = ecc.sha256(buffer);

      res.send({content, buffer, hash})
    } else {
      //for organization

    }
  }

});


module.exports = {
  generateDocument,
  generateStatement
};
