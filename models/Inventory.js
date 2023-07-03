const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2');

// let singleStatusSchema = new mongoose.Schema(
//     {
//       value: {
//         type: Number        
//       },
//       dateTime: {
//         type: Date,        
//       },
//     },
//     {
//       _id: false,
//       timestamps:false
//     }
// );

const inventorySchema = new mongoose.Schema({    
    modelId: {
        type: mongoose.Schema.Types.ObjectId,              
        ref: "Model", 
    },
    color:String,
    quantity:Number,    
},{
    timestamps: true,
  }
)

//statusSchema.index({ name: "text" })

inventorySchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Inventory', inventorySchema)