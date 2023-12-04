const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const { toJSON, paginate } = require('./plugins');
const { roles } = require('../config/roles');

const orderSchema = mongoose.Schema(
  {
    creator: {
      type: String,
      required: true
    },
    type: {
      type: String,
      required: true
    },
    data: {
      type: Object,
      required: true
    },
    order_id: {
      type: Number,
      required: false
    },
    payed: {
      type: Object,
      required: false,
      default: false
    },
    delivered: {
      type: Object,
      required: false,
      default: false
    },
    error: {
      type: Object,
      required: false,
    },
    expired_at: {
      type: Date,
      default: () => {
        let now = new Date();
        now.setDate(now.getDate() + 1); // Увеличиваем на одни сутки
        return now;
      }
    }
  },
  {
    timestamps: true,
  }
);

// add plugin that converts mongoose to json
orderSchema.plugin(toJSON);
orderSchema.plugin(paginate);


/**
 * @typedef Order
 */
const Order = mongoose.model('Order', orderSchema);

module.exports = Order;
