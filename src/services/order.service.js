const { Api, JsonRpc } = require('eosjs');
const { JsSignatureProvider } = require('eosjs/dist/eosjs-jssig');      
const { TextEncoder, TextDecoder } = require('util');                   
const fetch = require('isomorphic-fetch')
const { Order } = require('../models');
const blockchainService = require('./blockchain.service')
const { YooCheckout, ICreatePayment  } = require('@a2seven/yoo-checkout');
const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const userService = require('./user.service');

async function createInitialOrder(username) {
 try {

  // 1. Создаёшь ордер в базе и получаешь внутренний айди
  const db_order = await Order.create({creator: process.env.REGISTRATOR, type: 'initial', data: {username}})
  const internal_id = db_order._id

  // 1.5 Получаешь сумму счёта
  let cooperative = await blockchainService.getCooperative(process.env.REGISTRATOR)

  if (!cooperative)
    throw new Error('Кооператив не найден')

  const [, symbol] = cooperative.initial.split(" ")

  const amount = (parseFloat(cooperative.initial) +  parseFloat(cooperative.minimum)).toFixed(4) + " " + symbol

  // 2. Используешь внутренний айди для получения ордера в системе платежей
  const checkout = new YooCheckout({ shopId: process.env.YA_SHOP_ID, secretKey: process.env.YA_SHOP_SECRET, token: process.env.YA_ACCESS_TOKEN });

  const payment = await checkout.createPayment({
    description: "Пополнение баланса",
    amount: {
        value: parseFloat(amount).toFixed(2),
        currency: 'RUB'
    },
    confirmation: {
        type: 'embedded',
    },
    metadata: {
      internal_id: internal_id
    },
    capture: true
  }, internal_id);

  
  const confirmation_token = payment.confirmation.confirmation_token

  // 3. Используешь ссылку для создания ордера по блокчейну
  const order = {
    creator: process.env.REGISTRATOR,
    username: username,
    coopname: process.env.REGISTRATOR,
    program_id: 0,
    type: "initial",
    secondary_id: 0,
    internal_quantity: amount,
    external_quantity: amount,
    link: "",
    memo: ""
  }
  const order_id = await blockchainService.createOrder(order)
  console.log("order_id: ", order_id)
  // 4. Обновляешь ордер идентификатором ордера в блокчейне (order_id)  
  await Order.updateOne({_id: internal_id}, {order_id})
  
  return { order_id, confirmation_token }

  } catch(e){
    console.log(e)
    throw new Error(e.message)
  }
}

async function catchIPN(ipnBody) {

  const payments = await mongoose.connection.db.collection('payments')
  const exist = await payments.findOne({"object.id": ipnBody.object.id})
  console.log(ipnBody)

  if (!exist) {

    await payments.insertOne(ipnBody)
      
    const internal_id = ipnBody.object.metadata.internal_id
    const order = await Order.findOne({_id: new ObjectId(internal_id)})
    
    

    //TODO check ipnBody type for success

    if (order) {
      if (ipnBody.event === 'payment.succeeded') {
        if (order.type == 'initial') {
          order.payed = true
          
          try {
            
            const user = await userService.getUserByUsername(order.data.username)
            
            user.is_registered = true
            await user.save()

            order.delivered = true
            await order.save()

            await blockchainService.completeOrder({deposit_id: order.order_id, memo: ""})

          } catch(e) {

            console.log('catch error: ', e.message)
            order.error = e
            order.delivered = false
            await order.save()

            await blockchainService.failOrder({deposit_id: order.order_id, memo: ""})

          }
          
        } else if (order.type == 'deposit') {

          //

        }
      } else if (ipnBody.event === 'payment.canceled') {

        await blockchainService.failOrder({deposit_id: order.order_id, memo: ""})

      } 

    } else {
      throw new Error(`Ордер не найден`); 
    }
  } else {
    
  }

  return {ok: true}

}

async function finishAccountCreation(){
  //save IPN to database
  //
  //TODO get order by id
  // const user = await userService.createUser(req.body);
  // const tokens = await tokenService.generateAuthTokens(user);
  // return
}

module.exports = {
  createInitialOrder,
  catchIPN
}