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

let productSchema = new mongoose.Schema(
  {
    modelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Modelo", 
    },
    modelName: String,
    color:String,
    price: Number,
    quantity: Number,
  },
  {
    _id: false,
    timestamps:false
  }
);

let clientSchema = new mongoose.Schema(
  {
    
    fullName: String,
    email:String,
    phone: String    
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
    // clientId: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: "Client", 
    // },
    client:clientSchema,

    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", 
    },
    // reserveId: {
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: "Reserve", 
    // }, 
    // saleType:{
    //     type:String,
    //     enum:['single', 'reserve']

    // },
    //payments:[paymentSchema],    
    // modelId: {
    //   type: mongoose.Schema.Types.ObjectId,
    //   ref: "Modelo", 
    // },   
    // color:String,    
    // price:Number,
    // quantity:Number,
    // totalSale:Number,
    // isPaid:{
    //     type:Boolean,
    //     default:false
    // }
    products:[productSchema],
    totalSale:Number,

      
    
},{
    timestamps: true,
  }
)

saleSchema.index({ name: "text" })

saleSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Sale', saleSchema)