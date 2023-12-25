const httpStatus = require('http-status');
const tokenService = require('./token.service');
const userService = require('./user.service');
const blockchainService = require('./blockchain.service');
const Token = require('../models/token.model');
const ApiError = require('../utils/ApiError');
const { tokenTypes } = require('../config/tokens');



const updateAuth = async () => {
  const board = await blockchainService.getSoviet(process.env.COOPNAME);
  
  //TODO снимать права с тех, кто уже не в совете
  
  for (const member of board.members) {
    const user = await userService.getUserByUsername(member.username);   

    if (member.position == 'chairman' && !user){
      const user = await userService.createUser({
        username: member.username,
        public_key: "-",
        email: process.env.CHAIRMAN_EMAIL,
        password: process.env.CHAIRAN_PASSWORD,
        is_registered: true,
        is_organization: false,
        user_profile: {
          first_name: 'Имя',
          last_name: "Фамилия",
          middle_name: "Отчество",
          birthday: "23-42-3423",
          phone: "7902294404",
        },
        signature: '-',
        signature_hash: '-',
        role: 'superadmin'
      });    
    } else if (member.position == 'chairman' && user){
      user.role = 'superadmin'
      await user.save()
    } else if (user){
      user.role = 'admin'
      await user.save()
    }
  }
}

/**
 * Login with username and password
 * @param {string} username
 * @param {string} password
 * @returns {Promise<User>}
 */
const loginUserWithUsernameAndPassword = async (username, password) => {
  const user = await userService.getUserByUsername(username);
  if (!user || !(await user.isPasswordMatch(password))) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Incorrect username or password');
  }
  return user;
};

/**
 * Logout
 * @param {string} refreshToken
 * @returns {Promise}
 */
const logout = async (refreshToken) => {
  const refreshTokenDoc = await Token.findOne({ token: refreshToken, type: tokenTypes.REFRESH, blacklisted: false });
  if (!refreshTokenDoc) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Not found');
  }
  await refreshTokenDoc.remove();
};

/**
 * Refresh auth tokens
 * @param {string} refreshToken
 * @returns {Promise<Object>}
 */
const refreshAuth = async (refreshToken) => {
  try {
    const refreshTokenDoc = await tokenService.verifyToken(refreshToken, tokenTypes.REFRESH);
    const user = await userService.getUserByUsername(refreshTokenDoc.user);
    
    if (!user) {
      throw new Error();
    }
    await refreshTokenDoc.remove();
    
    return tokenService.generateAuthTokens(user);
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Please authenticate');
  }
};

/**
 * Reset password
 * @param {string} resetPasswordToken
 * @param {string} newPassword
 * @returns {Promise}
 */
const resetPassword = async (resetPasswordToken, newPassword) => {
  try {
    const resetPasswordTokenDoc = await tokenService.verifyToken(resetPasswordToken, tokenTypes.RESET_PASSWORD);
    const user = await userService.getUserByUsername(resetPasswordTokenDoc.user);
    if (!user) {
      throw new Error();
    }
    await userService.updateUserById(user.username, { password: newPassword });
    await Token.deleteMany({ user: user.username, type: tokenTypes.RESET_PASSWORD });
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Password reset failed');
  }
};

/**
 * Verify email
 * @param {string} verifyEmailToken
 * @returns {Promise}
 */
const verifyEmail = async (verifyEmailToken) => {
  try {
    const verifyEmailTokenDoc = await tokenService.verifyToken(verifyEmailToken, tokenTypes.VERIFY_EMAIL);
    const user = await userService.getUserByUsername(verifyEmailTokenDoc.user);
    if (!user) {
      throw new Error();
    }
    await Token.deleteMany({ user: user.username, type: tokenTypes.VERIFY_EMAIL });
    await userService.updateUserById(user.username, { is_email_verified: true });
  } catch (error) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Email verification failed');
  }
};

module.exports = {
  loginUserWithUsernameAndPassword,
  logout,
  refreshAuth,
  resetPassword,
  verifyEmail,
  updateAuth
};
