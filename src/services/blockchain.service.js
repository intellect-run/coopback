const { Api, JsonRpc } = require('eosjs');
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig');      
const { TextEncoder, TextDecoder } = require('util');                   
const fetch = require('isomorphic-fetch')
const EosApi = require('eosjs-api') // Or EosApi = require('./src')
const getInternalAction = require('../utils/getInternalAction')

const rpc = new JsonRpc(process.env.BLOCKCHAIN_RPC, { fetch });

/**
 * Получить инстанс для осуществления транзакции в блокчейн.
 * @param {username} - авторизация от аккаунта
 * @param {wif} - приватный ключ от аккаунта
 * @returns {eosjs-api}
 */

async function getInstance(wif) {
  
  const signatureProvider = new JsSignatureProvider([wif]);
  
  const api = new Api({ rpc, signatureProvider, textDecoder: new TextDecoder(), textEncoder: new TextEncoder() });

  return api
}


async function getApi() {

  options = {
    httpEndpoint: process.env.BLOCKCHAIN_RPC, // default, null for cold-storage
    verbose: false, // API logging
    fetchConfiguration: {}
  }


  const api = new EosApi(options)
  return api
}

async function getCooperative(coopname){
  const api = await getApi()


  const [cooperative] = await lazyFetch(
    api,
    process.env.REGISTRATOR_CONTRACT,
    process.env.REGISTRATOR_CONTRACT,
    'orgs',
    coopname,
    coopname,
    1
  )
  return cooperative

}



async function registerBlockchainAccount(data) {
  const eos = await getInstance(process.env.REGISTRATOR_WIF)

  let newaccount = {
     registrator: process.env.COOPNAME,
     referer: data.referer ? data.referer : "",
     username: data.username,
     public_key: data.public_key,
     signature_hash: data.signature_hash,
     meta: ""
  }

  console.log("data on register: ", data)

  data.document.meta = JSON.stringify(data.document.meta)

  const uid = ""

  let actions = [{
    account: process.env.REGISTRATOR_CONTRACT,
    name: 'newaccount',
    authorization: [{
      actor: process.env.COOPNAME,
      permission: 'active',
    }],
    data: newaccount,
  },
  {
    account: process.env.REGISTRATOR_CONTRACT,
    name: 'reguser',
    authorization: [
      {
        actor: process.env.COOPNAME,
        permission: 'active',
      },
    ],
    data: {
      coopname: process.env.COOPNAME,
      username: data.username,
      storage: {
        storage_username: process.env.COOPNAME,
        uid,
      },
    },
  },
  {
    account: process.env.REGISTRATOR_CONTRACT,
    name: 'joincoop',
    authorization: [
      {
        actor: process.env.COOPNAME,
        permission: 'active',
      },
    ],
    data: {
      coopname: process.env.COOPNAME,
      username: data.username,
      document: data.document,
    },
  }
  ]
  
  const result = await eos.transact({ 
      actions
  }, {
    blocksBehind: 3,
    expireSeconds: 30,
  })

  const batch_id = getInternalAction(result, 'draft').batch_id
  
  return batch_id
  
}



async function createOrder(data) {
  const eos = await getInstance(process.env.REGISTRATOR_WIF)

  let actions = [{
    account: process.env.GATEWAY_CONTRACT,
    name: 'dpcreate',
    authorization: [{
      actor: process.env.COOPNAME,
      permission: 'active',
    }],
    data
  }]
  
  let result = await eos.transact({ 
      actions
  }, {
    blocksBehind: 3,
    expireSeconds: 30,
  })

  const order_id = getInternalAction(result, 'newid').id
 
  return order_id

}



async function completeOrder(data) {
  const eos = await getInstance(process.env.REGISTRATOR_WIF)

  let actions = [{
    account: process.env.GATEWAY_CONTRACT,
    name: 'dpcomplete',
    authorization: [{
      actor: process.env.COOPNAME,
      permission: 'active',
    }],
    data
  }]
  
  let result = await eos.transact({ 
      actions
  }, {
    blocksBehind: 3,
    expireSeconds: 30,
  })

}


async function failOrder(data) {
  const eos = await getInstance(process.env.REGISTRATOR_WIF)

  let actions = [{
    account: process.env.GATEWAY_CONTRACT,
    name: 'dpfail',
    authorization: [{
      actor: process.env.COOPNAME,
      permission: 'active',
    }],
    data
  }]
  
  let result = await eos.transact({ 
      actions
  }, {
    blocksBehind: 3,
    expireSeconds: 30,
  })

}


async function getSoviet(coopname) {
  const api = await getApi()
  
  const soviet = (await lazyFetch(
    api,
    process.env.SOVIET_CONTRACT,
    coopname,
    'boards',
  ))[0]

  return soviet

}

async function fetchAllParticipants() {
  const api = await getApi()
  
  const participants = await lazyFetch(
    api,
    process.env.SOVIET_CONTRACT,
    process.env.COOPNAME,
    'participants',
  )
  return participants

}

async function lazyFetch(
  api,
  code,
  scope,
  table,
  lower_bound,
  upper_bound,
  limit,
  key_type,
  index_position,
) {

  if (!limit) limit = 10
  if (!lower_bound && lower_bound != '') lower_bound = 0

  const data = await api.getTableRows({ json: true, code, scope, table, upper_bound, lower_bound, limit, key_type, index_position});

  let result = data.rows
  if (data.more == true && limit != 1) {
    const redata = await lazyFetch(
      api,
      code,
      scope,
      table,
      data.next_key,
      upper_bound,
      limit,
      key_type,
      index_position,      
    )
    result = [...result, ...redata]
    return result
  } else {
    return result
  }
}


module.exports = {
  getInstance,
  getApi, 
  registerBlockchainAccount,
  lazyFetch,
  fetchAllParticipants,
  createOrder,
  getCooperative,
  failOrder,
  completeOrder,
  getSoviet
}