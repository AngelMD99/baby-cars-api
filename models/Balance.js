const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2');
const balanceSchema = new mongoose.Schema({
    isDeleted: {
        type: Boolean,
        default: false
    },
    balanceType:{
        type: String,
        enum:['rentals', 'payments']
    },
    branchId: {
        type: mongoose.Schema.Types.ObjectId,              
        ref: "Branch", 
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,              
        ref: "User", 
    },
    quantity: {
        type: Number,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    loginDate:Date,
    balanceDate:Date,   
    
},{
    timestamps: true,
  }
)

//balanceSchema.index({ name: "text" })

balanceSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Balance', balanceSchema)