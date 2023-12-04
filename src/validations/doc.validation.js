const Joi = require('joi');

const createDoc = {
  body: Joi.object().keys({
    username: Joi.string().required(),
    lang: Joi.string().required().valid('ru'),
    action: Joi.string().required().valid('joincoop'),
    data: Joi.object()
  }),
};

const createStatement = {
  body: Joi.object().keys({
    lang: Joi.string().required().valid('ru'),
    data: Joi.object()
  }),
};



module.exports = {
  createDoc,
  createStatement
};
