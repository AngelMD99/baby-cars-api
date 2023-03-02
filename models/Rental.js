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

const rentalSchema = new mongoose.Schema({
    isDeleted: {
        type: Boolean,
        default: false
    },
    branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Branch", 
    },
    carId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Car", 
    },
    plan:planSchema,   
    paymentType: {
        type: String,
        required: true
    },    
    
},{
    timestamps: true,
  }
)

rentalSchema.index({ name: "text" })

rentalSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Rental', rentalSchema)