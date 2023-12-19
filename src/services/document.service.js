const { renderTemplate, convertToPDF, getBody } = require('../utils/templateProcessor')
const ecc = require('eosjs-ecc');
const ApiError = require('../utils/ApiError');
const { userService, blockchainService } = require('../services');
const getActiveTemplate = require('../utils/getActiveTemplate')
const fetchExplorerData = require('../utils/fetchExplorerData')
const coopService = require('./coop.service')


const regenerateDocument = async (coopname, username, action, doc) => {
  console.log("doc on regeneration: ", doc)
  const user = await userService.getUserByUsername(username)

  const api = await blockchainService.getApi()

  const coop = await coopService.getCoopInfo(api, coopname)

  const drafts = await blockchainService.lazyFetch(api, process.env.DRAFT_CONTRACT, process.env.DRAFT_CONTRACT, 'drafts')  
  const translations = await blockchainService.lazyFetch(api, process.env.DRAFT_CONTRACT, process.env.DRAFT_CONTRACT, 'translations')
  
  const { context, translation } = getActiveTemplate(action, drafts, translations)
  
  doc.meta.created_at = new Date(doc.meta.created_at)

  const data = {
    meta: doc.meta,
    user: user.user_profile,
    org: user.organization_profile,
    is_organization: user.is_organization,
    coop
  }

  if (Number(doc.meta.version) === 1) {

    if (data.is_organization == false) {
      const content = await renderTemplate(context, data, translation);
      const bodyContent = await getBody(content);

      const buffer = await convertToPDF(content, data.meta);
      
      const hash = ecc.sha256(buffer);
      
      const validation = {
        is_valid_signature: false,
        is_valid_hash: false,
        reason: "",
        is_valid: false
      }

      try {
        validation.is_valid_signature = await ecc.verify(doc.sign, doc.hash, doc.pkey)
      } catch(e){
        validation.is_valid_signature = false
        validation.reason = "wrong signature"
      }
      
      console.log("doc_hash: ", doc.hash, hash)

      if (hash == doc.hash){
        validation.is_valid_hash = true
      } else {
        validation.is_valid_hash = false
        validation.reason = "hash is not equal doc hash"
      }
      

      validation.is_valid = validation.is_valid_hash && validation.is_valid_signature

      return {content: bodyContent, buffer, hash, validation}
    } else {
      //for organization

    }
  } else {
    throw new ApiError('Указана неподдерживаемая версия генератора документов')
  }
}

const generateDecision = async (coopname, decision_id, lang) => {
  
  const api = await blockchainService.getApi()

  const coop = await coopService.getCoopInfo(api, coopname);
  const chairman = await userService.getUserByUsername(coop.soviet.chairman)
  const decision = await coopService.getDecision(api, coopname, decision_id);
  const action = decision.type + 'dec'

  const user = await userService.getUserByUsername(decision.username);
  
  if (!user)
    throw new Error('Пайщик не найден')

  if (action === 'joincoopdec') {
      const meta = generateMetaForDocument(lang)

      let council_members = []

      for (const member of coop.soviet.members){
        const m = await userService.getUserByUsername(member.username)

        if (!m)
          throw new Error('Член совета не найден')

        const signature = "signature"
        const date_of_vote = "04.03.2010Z05:10"

        console.log("vote_for: ", m.username, decision.votes_for)

        const vote_for = decision.votes_for.find(el => el == m.username)
        const vote_against = decision.votes_against.find(el => el == m.username)
        console.log("vote_for2: ", vote_for)

        let vote = 'Abstained'
        if (vote_for)
          vote = "For"
        else if (vote_against)
          vote = "Against"

        console.log("vote: ", vote)

        council_members.push({
          username: m.username,
          name: m.user_profile?.first_name + " " + m.user_profile?.last_name,
          vote,
          date_of_vote

        })
      }

      const data = {
        decision_id,
        coop: {
          shortname: coop.shortname,
          city: coop.city,
          initial: coop.initial,
          minimum: coop.minimum
        },
        "timestamp": meta.created_at,
        "form_of_meeting": "дистанционная",
        "meeting_location": "электронно-цифровая [ внутренняя ЭЦП ]",
        "council_members_count": coop.soviet.members.length,
        "council_members_participated_in_voting": decision.votes_for.length + decision.votes_against.length,
        "applicant": {
          "is_organization": user.is_organization,
          "shortname": user.organization_profile?.shortname,
          "ogrn": user.organization_profile?.ogrn,
          "first_name": user.user_profile?.first_name,
          "last_name": user.user_profile?.last_name,
          "date_of_birth": user.user_profile?.birthday,
        },
        "votes_for": decision.votes_for.length,
        "votes_against": decision.votes_against.length,
        "votes_abstained": coop.soviet.members.length - decision.votes_for.length - decision.votes_against.length,
        "chairman_signature": "",
        "signature_descriptor": chairman.user_profile.first_name + " " + chairman.user_profile.middle_name + " " + chairman.user_profile.last_name,
        council_members
      }
  

    const drafts = await blockchainService.lazyFetch(api, process.env.DRAFT_CONTRACT, process.env.DRAFT_CONTRACT, 'drafts')  
    const translations = await blockchainService.lazyFetch(api, process.env.DRAFT_CONTRACT, process.env.DRAFT_CONTRACT, 'translations')
    const { context, translation } = getActiveTemplate(action, drafts, translations)

    const content = await renderTemplate(context, data, translation);
    const buffer = await convertToPDF(content, meta);
    const hash = ecc.sha256(buffer);

    return {content, buffer, hash, meta}

  }
}

const generateMetaForDocument = (lang) => {
  return {
    lang,
    version: 1,
    title: "Заявление о вступлении",
    created_at: new Date(),
  }
}


const generateStatement = async (coopname, lang, data) => {

  const action = "joincoop"
  
  console.log("statement")

  const api = await blockchainService.getApi()

  const drafts = await blockchainService.lazyFetch(api, process.env.DRAFT_CONTRACT, process.env.DRAFT_CONTRACT, 'drafts')  
  const translations = await blockchainService.lazyFetch(api, process.env.DRAFT_CONTRACT, process.env.DRAFT_CONTRACT, 'translations')
    
  data.coop = await coopService.getCoopInfo(api, coopname)

  const { context, translation } = getActiveTemplate(action, drafts, translations)
  
  const meta = generateMetaForDocument(lang)
  
  const content = await renderTemplate(context, data, translation);
  const buffer = await convertToPDF(content, meta);
  const hash = ecc.sha256(buffer);
  
  return {content, buffer, hash, meta}

}


const getDocuments = async (account) => {


  let data = await fetchExplorerData('/v2/history/get_actions', {
    "act.name": "statement",
    "account": account,
  })
  console.log("statement: ", data)
  for (action of data.actions) {
    console.log("look for block_num: ", action.block_num)

    action.decision = (await fetchExplorerData('/v2/history/get_actions', {
      "act.name": "decision",
      "account": account,
      "@decision.decision_id": action.act.data.decision_id,
    }))[0]

    console.log("decision0: ", action.decision)

    action.delta = (await fetchExplorerData('/v2/history/get_deltas', {
      "code": action.act.account,
      // "block_num": action.block_num,
      "primary_key": action.act.data.decision_id,
      "table": "decisions"
    }))

    console.log("delta: ", action.delta)

    // .deltas[0].data
    // 
    let i = 0
    for (const act of action.delta.deltas) {
      i++ 
      console.log('I: ', i)
      console.log("\npresent: ", act.present)
      console.log("block: ", act.block_num)

      console.log(`act: ${act.timestamp}`, act.data)
    }
    

    // console.log("action.decision: ", action.decision)

    if (action.act.data.action == 'joincoop'){
      try { 
        action.verified = await ecc.verify(action.act.data.statement.sign, action.act.data.statement.hash, action.act.data.statement.pkey)
        
        if (action.decision) {
          action.batch = (await fetchExplorerData('/v2/history/get_deltas', {
            "code": action.act.account,
            "block_num": action.block_num,
            "primary_key": action.decision.batch_id,
            "table": "joincoops"
          })).deltas[0].data

          console.log("action.batch: ", action.batch)

        }

      } catch(e){
        action.verified = false
        action.verify_message = e.message
      }
      
    }

  }

  return data.actions

}

module.exports = {
  getDocuments,
  generateStatement,
  generateDecision,
  regenerateDocument,
  
}