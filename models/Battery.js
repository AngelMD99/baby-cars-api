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

const batterySchema = new mongoose.Schema({

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
    modelId: {
      type: mongoose.Schema.Types.ObjectId,              
      ref: "Modelo", 
    },
    records:[singleStatusSchema]
    
},{
    timestamps: true,
  }
)

//statusSchema.index({ name: "text" })

batterySchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Battery', batterySchema)