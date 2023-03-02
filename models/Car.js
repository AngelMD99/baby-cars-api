const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2');

let planSchema = new mongoose.Schema(
    {
      time: {
        type: Number        
      },
      price: {
        type: Number,        
      },
    },
    {
      _id: false,
      timestamps:false
    }
  );

const carSchema = new mongoose.Schema({
    isDeleted: {
        type: Boolean,
        default: false
    },
    branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Branch", 
    },
    ipAddress: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    color: {
        type: String,
        required: true
    },
    plans:[planSchema]
    
},{
    timestamps: true,
  }
)

carSchema.index({ name: "text" })

carSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Car', carSchema)