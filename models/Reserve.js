const mongoose = require('mongoose')
const mongoosePaginate = require('mongoose-paginate-v2');

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

const reserveSchema = new mongoose.Schema({
    isDeleted: {
        type: Boolean,
        default: false
    },
    isPaid: {
        type: Boolean,
        default: false
    },
    isDelivered: {
        type: Boolean,
        default: false
    },
    isCancelled: {
        type: Boolean,
        default: false
    },
    cancellationReason:String,
    folio:{
        type:String
    },    
    branchId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Branch", 
    },
    client:clientSchema,       
    employeeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", 
    },
    cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User", 
    },
    // modelId: {
    //     type: mongoose.Schema.Types.ObjectId,              
    //     ref: "Modelo", 
    // },
    // color:String,
    // clientId: {
    //     type: mongoose.Schema.Types.ObjectId,              
    //     ref: "Client", 
    // }, 
    // quantity:Number,
    // price:Number,
    products:[productSchema],
    totalSale:Number,
    pendingBalance:Number,
    expirationDate:Date,
},{
    timestamps: true,
  }
)

//statusSchema.index({ name: "text" })

reserveSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Reserve', reserveSchema)