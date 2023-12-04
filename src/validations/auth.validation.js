const Joi = require('joi');
const { password } = require('./custom.validation');

const register = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    password: Joi.string().required().custom(password),
    username: Joi.string().required(),
    public_key: Joi.string().required(),
    referer: Joi.string().allow(null, ''),
    signature: Joi.string().required().regex(/^data:image\/png;base64,[A-Za-z0-9+/]+={0,2}$/),
    signature_hash: Joi.string().required(),
    is_organization: Joi.boolean().required(),
    user_profile: Joi.object().keys({
      first_name: Joi.string().required(),
      last_name: Joi.string().required(),
      middle_name: Joi.string().required(),
      birthday: Joi.string().required(),
      phone: Joi.string().required(),
    }),
    organization_profile: Joi.object().keys({
      
    }),
    signed_doc: Joi.object().keys({
      hash: Joi.string().required(),
      sign: Joi.string().required(),
      pkey: Joi.string().required()
    })
  }),
};

const login = {
  body: Joi.object().keys({
    email: Joi.string().required(),
    password: Joi.string().required(),
  }),
};

const logout = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};

const refreshTokens = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};

const forgotPassword = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
  }),
};

const resetPassword = {
  query: Joi.object().keys({
    token: Joi.string().required(),
  }),
  body: Joi.object().keys({
    password: Joi.string().required().custom(password),
  }),
};

const verifyEmail = {
  query: Joi.object().keys({
    token: Joi.string().required(),
  }),
};

module.exports = {
  register,
  login,
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  verifyEmail,
};
