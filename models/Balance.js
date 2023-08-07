const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2');
const balanceSchema = new mongoose.Schema({
    isDeleted: {
        type: Boolean,
        default: false
    },
    branchId: {
        type: mongoose.Schema.Types.ObjectId,              
        ref: "Branch", 
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,              
        ref: "User", 
    },
    amount: {
        type: Number,
        required: true
    },
    loginDate:Date,
    logoutDate:Date,   
    
},{
    timestamps: true,
  }
)

//balanceSchema.index({ name: "text" })

balanceSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Balance', balanceSchema)