const Joi = require('joi');

const loadAgenda = {
  query: Joi.object().keys({
    coopname: Joi.string().required(),
  }),
};


const loadStaff = {
  query: Joi.object().keys({
    coopname: Joi.string().required(),
  }),
};


const loadMembers = {
  query: Joi.object().keys({
    coopname: Joi.string().required(),
  }),
};

module.exports = {
  loadAgenda,
  loadStaff,
  loadMembers
};
