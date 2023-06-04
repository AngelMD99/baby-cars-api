const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2');

// let planSchema = new mongoose.Schema(
//     {
//       time: {
//         type: Number        
//       },
//       price: {
//         type: Number,        
//       },
//     },
//     {
//       _id: false,
//       timestamps:false
//     }
//   );

const bankingSchema = new mongoose.Schema({
    isDeleted: {
        type: Boolean,
        default: false
    },
    branchId: {
        type: mongoose.Schema.Types.ObjectId,              
        ref: "Branch", 
    },
    bank: {
        type: String,
        required: false
    },
    account: {
        type: String,
        required: false
    },
    reference: {
        type: String,
        required: false
    },    
    
},{
    timestamps: true,
  }
)

//bankingSchema.index({ name: "text" })

bankingSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Banking', bankingSchema)