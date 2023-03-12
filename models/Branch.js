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

const branchSchema = new mongoose.Schema({
    isDeleted: {
        type: Boolean,
        default: false
    },
    code:{
        type:String,
        required:true,
        uppercase:true
    },
    name: {
        type: String,
        required: true
    },
    location: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    plans:[planSchema]
    
},{
    timestamps: true,
  }
)

branchSchema.index({ name: "text" })

branchSchema.plugin(mongoosePaginate);
module.exports = mongoose.model('Branch', branchSchema)