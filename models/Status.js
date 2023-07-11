const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2');

let singleStatusSchema = new mongoose.Schema(
    {
      value: {
        type: Number        
      },
      dateTime: {
        type: Date,        
      },
    },
    {
      _id: false,
      timestamps:false
    }
);

const statusSchema = new mongoose.Schema({
    isDeleted: {
        type: Boolean,
        default: false
    },
    carId: {
        type: mongoose.Schema.Types.ObjectId,              
        ref: "Car", 
    },
    branchId: {
      type: mongoose.Schema.Types.ObjectId,              
      ref: "Branch", 
    },
    records:[singleStatusSchema]
    
},{
    timestamps: true,
  }
)

//statusSchema.index({ name: "text" })

statusSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Status', statusSchema)