import mongoose from 'mongoose';

const Userschema=mongoose.Schema({
    username:{type:String,unique:true},
    password:String,
},{timestamps:true});

const UserModel = mongoose.model('User',Userschema);

export default UserModel;