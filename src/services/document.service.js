const { renderTemplate, convertToPDF, getBody } = require('../utils/templateProcessor')
const ecc = require('eosjs-ecc');
const ApiError = require('../utils/ApiError');
const { userService, blockchainService } = require('../services');
const getActiveTemplate = require('../utils/getActiveTemplate')
const fetchExplorerData = require('../utils/fetchExplorerData')
const coopService = require('./coop.service')

async function validateDocument(doc, hash) {
  let isValidSignature = false;
  let isValidHash = hash === doc.hash;
  let reason = "";

  try {
    isValidSignature = await ecc.verify(doc.sign, doc.hash, doc.pkey);
  } catch(e) {
    reason = "wrong signature";
  }

  if (!isValidHash) {
    reason = "hash is not equal doc hash";
  }

  return { 
    is_valid_signature: isValidSignature, 
    is_valid_hash: isValidHash, 
    reason: reason, 
    is_valid: isValidSignature && isValidHash
  };
}


function fillDecision(coop, meta, decision, user, chairman, council_members){
  return {
    decision_id: decision.id,
    coop: {
      shortname: coop.shortname,
      city: coop.city,
      initial: coop.initial,
      minimum: coop.minimum
    },
    timestamp: meta.created_at,
    council_members_count: coop.soviet.members.length,
    council_members_participated_in_voting: decision.votes_for.length + decision.votes_against.length,
    applicant: {
      is_organization: user.is_organization,
      shortname: user.organization_profile?.shortname,
      ogrn: user.organization_profile?.ogrn,
      first_name: user.user_profile?.first_name,
      last_name: user.user_profile?.last_name,
      date_of_birth: user.user_profile?.birthday,
    },
    votes_for: decision.votes_for.length,
    votes_against: decision.votes_against.length,
    votes_abstained: coop.soviet.members.length - decision.votes_for.length - decision.votes_against.length,
    chairman_signature: "",
    signature_descriptor: chairman.user_profile.first_name + " " + chairman.user_profile.middle_name + " " + chairman.user_profile.last_name,
    council_members
  };
}



const regenerateDocument = async (coopname, username, action, doc) => {
  
  doc.meta.created_at = new Date(doc.meta.created_at)

  const user = await userService.getUserByUsername(username)

  const api = await blockchainService.getApi()

  const coop = await coopService.getHistoryCoopInfo(api, coopname, doc.meta.created_at)

  const drafts = await blockchainService.lazyFetch(api, process.env.DRAFT_CONTRACT, process.env.DRAFT_CONTRACT, 'drafts')  
  const translations = await blockchainService.lazyFetch(api, process.env.DRAFT_CONTRACT, process.env.DRAFT_CONTRACT, 'translations')
  
  const { context, translation } = getActiveTemplate(action, drafts, translations)
  

  if (Number(doc.meta.version) === 1) {
    if (action == 'joincoop'){
      
      const data = {
        meta: doc.meta,
        user: user.user_profile,
        org: user.organization_profile,
        is_organization: user.is_organization,
        coop
      }

      const content = await renderTemplate(context, data, translation);
      const bodyContent = await getBody(content);

      const buffer = await convertToPDF(content, data.meta);
      
      const hash = ecc.sha256(buffer);
      
      const validation = await validateDocument(doc, hash)
      
      return {content: bodyContent, buffer, hash, validation}
    

    } else if (action == 'joincoopdec') {

      const api = await blockchainService.getApi()
      
      // const decision = await coopService.getDecision(api, coopname, decision_id);
      
      const decision = (await fetchExplorerData('/v2/history/get_deltas', {
        "code": process.env.SOVIET_CONTRACT,
        "primary_key": doc.meta.decision_id,
        "table": "decisions"
      })).deltas[0].data
      
      
      const chairman = await userService.getUserByUsername(coop.soviet.chairman)
      
      const meta = doc.meta

      const user = await userService.getUserByUsername(username);
      
      if (!user)
        throw new Error('Пайщик не найден')

      let council_members = []

      for (const m of coop.soviet.members){
        const member = await userService.getUserByUsername(m.username)

        if (!member)
          throw new Error('Член совета не найден')

        const vote_for = decision.votes_for.find(el => el == member.username)
        const vote_against = decision.votes_against.find(el => el == member.username)
      
        let vote = vote_for ? "For" : (vote_against ? "Against" : 'Abstained');

        const cm = await processCouncilMember(member, vote, meta)

        council_members.push(cm)

      }

      const data = fillDecision(coop, meta, decision, user, chairman, council_members)
      
      const drafts = await blockchainService.lazyFetch(api, process.env.DRAFT_CONTRACT, process.env.DRAFT_CONTRACT, 'drafts')  
      const translations = await blockchainService.lazyFetch(api, process.env.DRAFT_CONTRACT, process.env.DRAFT_CONTRACT, 'translations')
      const { context, translation } = getActiveTemplate(action, drafts, translations)

      const content = await renderTemplate(context, data, translation);
      const buffer = await convertToPDF(content, meta);
      const hash = ecc.sha256(buffer);
      const validation = await validateDocument(doc, hash)

      return {content, buffer, hash, meta, validation}

      
    }
    
  } else {
    throw new ApiError('Указана неподдерживаемая версия генератора документов')
  }
}

async function processCouncilMember(member, vote, meta) {
  const actionType = vote === "For" ? "@votefor" : "@voteagainst";
  
  const actionQuery = {
    [`${actionType}.decision_id`]: meta.decision_id,
    [`${actionType}.member`]: member.username
  };
  const actionResponse = await fetchExplorerData('/v2/history/get_actions', actionQuery);
  const actionData = actionResponse.actions[0];

  member.signature = actionData.signatures[0];
  member.date_of_vote = actionData.timestamp;

  return {
    username: member.username,
    name: member.user_profile?.first_name + " " + member.user_profile?.last_name,
    vote: vote,
    date_of_vote: member.date_of_vote,
    digital_signature: member.signature,
  };
}


const generateDecision = async (coopname, decision_id, lang) => {
  
  const api = await blockchainService.getApi()

  const coop = await coopService.getActualCoopInfo(api, coopname);
  const chairman = await userService.getUserByUsername(coop.soviet.chairman)
  const decision = await coopService.getDecision(api, coopname, decision_id);
  const action = decision.type + 'dec'

  const meta = generateMetaForDocument(lang, "Протокол решения совета")
  meta.coopname = coopname
  meta.decision_id = decision_id

  const user = await userService.getUserByUsername(decision.username);
  
  if (!user)
    throw new Error('Пайщик не найден')

  if (action === 'joincoopdec') {
      
      let council_members = []

      for (const m of coop.soviet.members){
        const member = await userService.getUserByUsername(m.username)

        if (!member)
          throw new Error('Член совета не найден')

        const vote_for = decision.votes_for.find(el => el == member.username)
        const vote_against = decision.votes_against.find(el => el == member.username)
        
        let vote = vote_for ? "For" : (vote_against ? "Against" : 'Abstained');

        const cm = await processCouncilMember(member, vote, meta)

        council_members.push(cm)

      }

    const data = fillDecision(coop, meta, decision, user, chairman, council_members)

    const drafts = await blockchainService.lazyFetch(api, process.env.DRAFT_CONTRACT, process.env.DRAFT_CONTRACT, 'drafts')  
    const translations = await blockchainService.lazyFetch(api, process.env.DRAFT_CONTRACT, process.env.DRAFT_CONTRACT, 'translations')
    const { context, translation } = getActiveTemplate(action, drafts, translations)

    const content = await renderTemplate(context, data, translation);
    const buffer = await convertToPDF(content, meta);
    const hash = ecc.sha256(buffer);

    return {content, buffer, hash, meta}

  }
}

const generateMetaForDocument = (lang, title) => {
  return {
    lang,
    version: 1,
    title,
    created_at: new Date()
  }
}


const generateStatement = async (coopname, lang, data) => {

  const action = "joincoop"
  
  const api = await blockchainService.getApi()

  const drafts = await blockchainService.lazyFetch(api, process.env.DRAFT_CONTRACT, process.env.DRAFT_CONTRACT, 'drafts')  
  const translations = await blockchainService.lazyFetch(api, process.env.DRAFT_CONTRACT, process.env.DRAFT_CONTRACT, 'translations')
    
  data.coop = await coopService.getActualCoopInfo(api, coopname)

  const { context, translation } = getActiveTemplate(action, drafts, translations)
  
  const meta = generateMetaForDocument(lang, "Заявление о вступлении")
  meta.coopname = coopname

  const content = await renderTemplate(context, data, translation);
  const buffer = await convertToPDF(content, meta);
  const hash = ecc.sha256(buffer);
  
  return {content, buffer, hash, meta}

}


const getDocuments = async (account) => {

  let data = await fetchExplorerData('/v2/history/get_actions', {
    "filter": "soviettest1:statement",
    "account": account,
  })

  for (action of data.actions) {

    action.decision = (await fetchExplorerData('/v2/history/get_actions', {
      "account": account,
      "filter": "soviettest1:decision",
      "@decision.decision_id": action.act.data.decision_id,
    }))?.actions?.[0]
    

    if (action.act.data.action == 'joincoop'){
      try { 
        action.verified = await ecc.verify(action.act.data.statement.sign, action.act.data.statement.hash, action.act.data.statement.pkey)
        
      } catch(e){
        console.error(e)
        action.verified = false
        action.verify_message = e.message
      }
      
    }



  //   action.delta = (await fetchExplorerData('/v2/history/get_deltas', {
  //     "code": action.act.account,
  //     // "block_num": action.block_num,
  //     "primary_key": action.act.data.decision_id,
  //     "table": "decisions"
  //   }))

  //   console.log("delta: ", action.delta)

  //   // .deltas[0].data
  //   // 
  //   let i = 0
  //   for (const act of action.delta.deltas) {
  //     i++ 
  //     console.log('I: ', i)
  //     console.log("\npresent: ", act.present)
  //     console.log("block: ", act.block_num)

  //     console.log(`act: ${act.timestamp}`, act.data)
  //   }
    

  //   // console.log("action.decision: ", action.decision)

  //   if (action.act.data.action == 'joincoop'){
  //     try { 
  //       action.verified = await ecc.verify(action.act.data.statement.sign, action.act.data.statement.hash, action.act.data.statement.pkey)
        
  //       if (action.decision) {
  //         action.batch = (await fetchExplorerData('/v2/history/get_deltas', {
  //           "code": action.act.account,
  //           "block_num": action.block_num,
  //           "primary_key": action.decision.batch_id,
  //           "table": "joincoops"
  //         })).deltas[0].data

  //         console.log("action.batch: ", action.batch)

  //       }

  //     } catch(e){
  //       action.verified = false
  //       action.verify_message = e.message
  //     }
      
  //   }

  // }


  }

  return data.actions

}

module.exports = {
  getDocuments,
  generateStatement,
  generateDecision,
  regenerateDocument,
  
}