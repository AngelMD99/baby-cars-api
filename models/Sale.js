const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2');

let paymentSchema = new mongoose.Schema(
    {
      amount: {
        type: Number        
      },
      paidOn: {
        type: Number,        
      },
      paymentType:{
        type:String
      }
    },
    {
      _id: false,
      timestamps:false
    }
  );

const saleSchema = new mongoose.Schema({
    isDeleted: {
        type: Boolean,
        default: false
    },
    folio:{
      type:String,
    },
    branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Branch", 
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Client", 
    },
    modelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Modelo", 
    },
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", 
    },
    // reserveId: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: "Reserve", 
    // },    
    color:String,
    // saleType:{
    //     type:String,
    //     enum:['single', 'reserve']

    // },
    //payments:[paymentSchema],    
    price:Number,
    quantity:Number,
    totalSale:Number,
    // isPaid:{
    //     type:Boolean,
    //     default:false
    // }

      
    
},{
    timestamps: true,
  }
)

saleSchema.index({ name: "text" })

saleSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Sale', saleSchema)