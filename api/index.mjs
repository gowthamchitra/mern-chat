import express from 'express';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import connection  from 'mongoose';
import Message from './models/Message.mjs'
import cookieParser from 'cookie-parser';
import User from './models/User.mjs';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import { WebSocketServer } from 'ws';
import fs from'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Friend from './models/Friends.mjs';

dotenv.config();

/*mongoose.connect(process.env.MONGO_URL,(err)=>{
    if (err) throw err;
    console.log('MongoDb connected')
});*/
mongoose.connect(process.env.MONGO_URL,).then(() => {
    console.log('Connected to MongoDB');
}).catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1); // Exit the process with failure
});


const app = express();

app.use(cors({
    credentials:true,
    origin:"https://680cfdd702c7dd50a102bfe7--flourishing-pixie-008cf8.netlify.app",
}));

const __filename = fileURLToPath(import.meta.url);
const __dirname =  path.dirname(__filename);

const jwtsecret=process.env.jwt_Secret;

const bcrypt1=bcrypt.genSaltSync(10);

app.use('/uploads',express.static(path.join(__dirname, 'uploads')));
app.use(express.json());
app.use(cookieParser());

function getUserDataFromRequest(req){
    return new Promise((resolve, reject) => {
        const token =req.cookies?.token;
        if(token){
        jwt.verify(token,jwtsecret,{},(err,Userdata)=>{
            if(err) throw err;
            resolve(Userdata);
        });
        }
        else{
            reject('no token')
        }
    }); 
}


app.get('/text', (req, res) => {
    res.json('text ok');
});

app.get('/messages/:userId',async (req,res)=>{
    const {userId} = req.params;
    const userData= await getUserDataFromRequest(req);
    const ourUserId=userData.userId;
    const messages=await Message.find({
        sender:{$in:[ourUserId,userId]},
        recipient:{$in:[ourUserId,userId]}
    }).sort({createdAt:1});
    res.json(messages); 
}) ;

app.get('/friends', async (req, res) => {
    try {
        const userData = await getUserDataFromRequest(req); // Extract user data from the request
        const userId = userData.userId;

        const friends = await Friend.find({ 
            $or: [{ senderId: userId }, { recipientId: userId }] 
        }).populate('senderId recipientId', 'username'); // Populate to fetch usernames

        res.json(friends);
    } catch (error) {
        console.error('Error fetching friends:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});



app.get('/people',async (req,res)=>{
   const users = await User.find({}, {'_id':1,username:1,});
   res.json(users);
});

app.get('/profile',(req,res)=>{
    const token =req.cookies?.token;
    if(token){
    jwt.verify(token,jwtsecret,{},(err,Userdata)=>{
        if(err) throw err;
        console.log(Userdata);
        res.json(Userdata);
    });
    }
});

app.post('/login',async (req,res)=>{
    const {username,password} = req.body;
    const foundUser = await User.findOne({username});
    if(foundUser){
        const passOk = bcrypt.compareSync(password,foundUser.password);
        if(passOk){
            jwt.sign({userId:foundUser._id,username,},jwtsecret,{},(err,token)=>{
                if (err) throw err;
                res.cookie('token',token,{httpOnly: true,sameSite:'none',secure: true,}).status(201).json({
                    id:foundUser._id,
                    username,
                })
            });
        }
        else{
            return res.status(401).json({error:"Invalid password"});
        }
    }
})

app.post('/logout',(req,res)=>{
    res.cookie('token','',{httpOnly: true,sameSite:'none',secure: true,}).json('ok');
})

app.post('/register', async (req,res)=>{
    const {username,password}=req.body;
    const hashedPassword = bcrypt.hashSync(password,bcrypt1);
    const foundUser = await User.findOne({username});
    if(foundUser){
        res.status(400).json("user name already exists");
    } 
    else{
    try{
    const created=await User.create({
        username:username,
        password:hashedPassword,
    });
    jwt.sign({userId:created._id,username,}, jwtsecret,{}, (err,token)=>{
        if(err) throw err;
        res.cookie('token',token,{httpOnly: true,sameSite :'none',secure:true,}).status(201).json({
            id:created._id,
            username,
        });
    });
   }catch(err){
    if (err) throw err;
    res.status(500).json('error');
   }
}
});

const server = app.listen(process.env.PORT);




const wss = new WebSocketServer({server});
wss.on('connection',(connection ,req)=>{

    function notifyOnlinePeople(){
        [...wss.clients].forEach(client=>{
            client.send(JSON.stringify({
                online:[...wss.clients].map(c => ({
                    userId:c.userId,
                    username:c.username,
                }))
            }
            ))
           });
    }

    connection.isAlive=true;

    connection.timer=setInterval(()=>{
        connection.ping();
        connection.deathTimer=setTimeout(()=>{
            connection.isAlive=false;
            clearInterval(connection.timer);
            connection.terminate();

            notifyOnlinePeople();
        },1000);  
    },5000);

    connection.on('pong',()=>{
        clearTimeout(connection.deathTimer);
    });

   const cookies =req.headers.cookie;
   if(cookies){
    const tokenCookieString = cookies.split(';').find(str => str.startsWith('token='));
    if(tokenCookieString){
        const token = tokenCookieString.split('=')[1];
        if(token){
            jwt.verify(token,jwtsecret,{},(err,userData)=>{
                if(err) throw err;
                const {username,userId}=userData;
                connection.userId=userId;
                connection.username=username;
            });
        }
    }
   }



connection.on("message", async (message) => {
    console.log("it is moving to the backend");
    try {
        const messageData = JSON.parse(message.toString());
        const { recipient, text, file, type } = messageData;
        let filename = null;

        // Handle friend request
        if (type === "friendRequest") {
            const { recipientId } = messageData;

            console.log(recipientId);
            // Store Friend Request in Database
            const friendDoc = await Friend.create({
                senderId: connection.userId,
                recipientId
            });

            // Notify recipient in real-time
            [...wss.clients]
                .filter(client => client.userId === recipientId)
                .forEach(client => {
                    client.send(JSON.stringify({
                        type: "friendRequest",
                        senderId: connection.userId,
                        recipientId,
                        id: friendDoc._id
                    }));
            });

            return; // Stop further processing since this is a friend request
        }

        // Handle file upload
        if (file) {
            const parts = file.name.split(".");
            const ext = parts[parts.length - 1];
            filename = Date.now() + "." + ext;

            const uploadPath = path.join(__dirname + "/uploads/" + filename);
            const bufferData = new Buffer(file.data.split(",")[1], "base64");

            fs.writeFile(uploadPath, bufferData, (err) => {
                if (err) {
                    console.log("Error saving file:", err);
                } else {
                    console.log("File saved:", uploadPath);
                }
            });
        }

        // Handle normal messages
        if (recipient && (text || file)) {
            const messageDoc = await Message.create({
                sender: connection.userId,
                recipient,
                text,
                file: file ? filename : null,
            });

            // Notify recipient in real-time
            [...wss.clients]
                .filter(client => client.userId === recipient)
                .forEach(client => {
                    client.send(JSON.stringify({
                        text,
                        sender: connection.userId,
                        recipient,
                        file: file ? filename : null,
                        id: messageDoc._id,
                    }));
                });
        }
    } catch (error) {
        console.error("Error processing message:", error);
    }
});


   


   notifyOnlinePeople();
   
}) ;
