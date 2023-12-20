const Joi = require('joi');

const metaDocument = Joi.object().required()

// 
//
//


const createStatement = {
  body: Joi.object().keys({
    coopname: Joi.string().required(),
    lang: Joi.string().required().valid('ru'),
    data: Joi.object().keys({
      is_organization: Joi.boolean().required(),
      user: Joi.object().required(),
      org: Joi.object().required(),
      coop: Joi.object().required()
    })
  }),
};


const generateDecision = {
  body: Joi.object().keys({
    coopname: Joi.string().required(),
    decision_id: Joi.number().required(),
    lang: Joi.string().required().valid('ru'),
  }),
};


const regenerateDocument = {
  body: Joi.object().keys({
    coopname: Joi.string().required(),
    username: Joi.string().required(),
    action: Joi.string().required().valid('joincoop', 'joincoopdec'),
    doc: Joi.object().keys({
      sign: Joi.string().required(),
      pkey: Joi.string().required(),
      hash: Joi.string().required(),
      meta: metaDocument
    }) 
  }),
};


const getDocuments = {
  query: Joi.object().keys({
    account: Joi.string()
  }),
};


module.exports = {
  generateDecision,
  regenerateDocument,
  createStatement,
  getDocuments
};
