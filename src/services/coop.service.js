const { renderTemplate, convertToPDF, getBody } = require('../utils/templateProcessor')
const ecc = require('eosjs-ecc');
const ApiError = require('../utils/ApiError');
const { userService, blockchainService } = require('../services');

const getActualCoopInfo = async (api, coopname) => {
  
  let coop = await userService.getUserByUsername(coopname)
  const [bc_coop] = await blockchainService.lazyFetch(api, process.env.REGISTRATOR_CONTRACT, process.env.REGISTRATOR_CONTRACT, 'orgs', coopname, coopname, 1)  
  
  let data = {}

  //TODO delete it after base coop registration
  coop = {
    organization_profile: {
      shortname: 'Потребительский Кооператив ПРИМЕР',
      city: "Москва"
    }
  }

  if (coop && bc_coop) {
    
    const soviet = await loadSoviet(api, coopname)

    data = {
      shortname: coop.organization_profile.shortname,
      city: coop.organization_profile.city,
      initial: parseFloat(bc_coop.initial).toFixed(0),
      minimum: parseFloat(bc_coop.minimum).toFixed(0),
      soviet
    }

    return data

  } else {
    throw new Error('Кооператив не найден')
  }

}

const getHistoryCoopInfo = async (api, coopname, created_at) => {
  
  let coop = await userService.getUserByUsername(coopname)
  const [bc_coop] = await blockchainService.lazyFetch(api, process.env.REGISTRATOR_CONTRACT, process.env.REGISTRATOR_CONTRACT, 'orgs', coopname, coopname, 1)  
  
  let data = {}

  //TODO delete it after base coop registration
  coop = {
    organization_profile: {
      shortname: 'Потребительский Кооператив ПРИМЕР',
      city: "Москва"
    }
  }

  if (coop && bc_coop) {
    
    const soviet = await loadSoviet(api, coopname)

    data = {
      shortname: coop.organization_profile.shortname,
      city: coop.organization_profile.city,
      initial: parseFloat(bc_coop.initial).toFixed(0),
      minimum: parseFloat(bc_coop.minimum).toFixed(0),
      soviet
    }
    return data

  } else {
    throw new Error('Кооператив не найден')
  }

}

const loadAgenda = async (coopname) => {

  const api = await blockchainService.getApi()

  const decisions = await blockchainService.lazyFetch(
    api,
    process.env.SOVIET_CONTRACT,
    coopname,
    'decisions',
  )
  
  for (decision of decisions){
    decision.approved == 1 ? decision.approved = true : decision.approved = false
    decision.validated == 1 ? decision.validated = true : decision.validated = false
    decision.authorized == 1 ? decision.authorized = true : decision.authorized = false
    
    const user = await userService.getUserByUsername(decision.username)
    
    if (user) {
      decision.is_organization = user.is_organization
      decision.user_profile = user.user_profile
      decision.org_profile = user.org_profile
    }

    if (decision.type == 'joincoop') {
      decision.batch = (await blockchainService.lazyFetch(
        api,
        process.env.SOVIET_CONTRACT,
        coopname,
        'joincoops',
        decision.batch_id,
        decision.batch_id,
        1
      ))[0]
    }
  }

  return decisions

}



const loadStaff = async (coopname) => {

  const api = await blockchainService.getApi()

  const staff = await blockchainService.lazyFetch(
    api,
    process.env.SOVIET_CONTRACT,
    coopname,
    'staff',
  )
  
  for (staf of staff) {
    const user = await userService.getUserByUsername(staf.username)
    
    if (user) {
      staf.is_organization = user.is_organization
      staf.user_profile = user.user_profile
      staf.org_profile = user.org_profile
    }

  }

  return staff

}



const loadMembers = async (coopname) => {

  const api = await blockchainService.getApi()

  const soviet = (await blockchainService.lazyFetch(
    api,
    process.env.SOVIET_CONTRACT,
    coopname,
    'boards',
    "soviet",
    "soviet",
    1,
    'i64',
    2
  ))[0]
  
  for (member of soviet.members) {
    const user = await userService.getUserByUsername(member.username)
    
    if (user) {
      member.is_organization = user.is_organization
      member.user_profile = user.user_profile
      member.org_profile = user.org_profile
    }

  }

  return soviet.members

}


const loadSoviet = async(api, coopname) => {
  
  const [soviet] = (await blockchainService.lazyFetch(
    api,
    process.env.SOVIET_CONTRACT,
    coopname,
    'boards',
    "soviet",
    "soviet",
    1,
    'i64',
    2
  ))

  soviet.chairman = (soviet.members.find(el => el.position == 'chairman')).username
  
  return soviet

}

const getDecision = async(api, coopname, decision_id) => {

  const [decision] = (await blockchainService.lazyFetch(
    api,
    process.env.SOVIET_CONTRACT,
    coopname,
    'decisions',
    decision_id,
    decision_id,
    1,
  ))
  
  return decision

}

module.exports = {
  loadAgenda,
  loadStaff,
  loadMembers,
  getActualCoopInfo,
  getHistoryCoopInfo,
  getDecision
}