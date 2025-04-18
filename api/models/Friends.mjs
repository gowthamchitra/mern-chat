import mongoose from "mongoose";

const FriendsSchema = mongoose.Schema({
     senderId: {type:mongoose.Schema.Types.ObjectId,ref:'User'},
     recipientId: {type:mongoose.Schema.Types.ObjectId,ref:'User'},
},{timestamps:true});

const FriendsModel=mongoose.model("Friend",FriendsSchema);

export default FriendsModel;