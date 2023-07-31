const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2');

const paymentSchema = new mongoose.Schema({
    isDeleted: {
        type: Boolean,
        default: false
    },
    branchId: {
        type: mongoose.Schema.Types.ObjectId,              
        ref: "Branch", 
    },
    operationType:{
        type:String,
        enum:['single', 'reserve']
    },
    saleId: {
        type: mongoose.Schema.Types.ObjectId,              
        ref: "Sale", 
    },
    reserveId: {
        type: mongoose.Schema.Types.ObjectId,              
        ref: "Reserve", 
    },
    amount: {
        type: Number        
    },
    paidOn: {
       type: Date,        
    },
    paymentType:{
        type:String
    },
    
    
},{
    timestamps: true,
  }
)

//paymentSchema.index({ name: "text" })

paymentSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Payment', paymentSchema)