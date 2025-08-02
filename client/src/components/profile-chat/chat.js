import { useEffect,useRef,useState } from 'react';
import './index.css';

import { useContext } from 'react';
import { UserContext } from '../../UserContext';
import uniqBy from 'loadsh/uniqBy';
import axios from './axiosConfig';
import Contacts from './contacts';
import Friends from './Friends';
import Avatar from './Avatar';
function Chat () {
    const [ws,setWs] = useState(null);
    const [onlinePeople,setOnlinePeople]=useState({});
    const [offlinePeople,setOfflinePeople]=useState({});
    const [selectedUser,setSelectedUser]=useState(null);
    const [newMessageText,setNewMessageText]=useState(null);
    const [messages,setMessages]=useState([]);
    const [Friend,setFriend]=useState([]);
    const [searchContacts,setSearchContacts]=useState("");
    const {username,id,setId,setUsername} = useContext(UserContext);
    const [isAtBottom,setIsAtBottom] = useState(true);
    const [count,setCount]=useState(null);
    const messageBox = useRef();
    const [isMobileView, setIsMobileView] = useState(window.innerWidth < 768);
    const [showContacts, setShowContacts] = useState(true);


    useEffect(()=>{
       connectToWs();
    },[]);

    function connectToWs(){
       const ws = new WebSocket('wss://mern-chat-backend1-9zu0.onrender.com');
       setWs(ws);
       ws.addEventListener('message', (e) => {
        console.log("e.data:"+e.data);
        const data = JSON.parse(e.data);
        console.log("eventlistener data:"+data.type);
        if (data.type === "friendRequest") {
            console.log("entered");
            handleFriends(e);
            console.log("done");
        } else {
            handleMessage(e);
        }
        });
       ws.addEventListener('close',()=>{
        setTimeout(()=>{
            console.log("connection lost Trying to reconnect...");
            connectToWs();
        },1000);
       })
    }

    useEffect(() => {
        const handleResize = () => {
          setIsMobileView(window.innerWidth < 768);
        };
      
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
      }, []);
      

    function showOnlinePeople(peopleArray){
        const people={};
        peopleArray.forEach(({userId,username})=>{
            people[userId]=username;
        }
        );
        console.log(people);
        setOnlinePeople(people);
    }
    function handleMessage(e) {
        const messageData = JSON.parse(e.data);
    
        if ('online' in messageData) {
            showOnlinePeople(messageData.online);
        }
    
        if ('text' in messageData) {
            setMessages(prev => [...prev, {
                text: messageData.text,
                sender: messageData.sender,
                recipient: messageData.recipient,
                id: messageData.id,
            }]);
        }
    }

    function handleFriends(e){
        const friendData= JSON.parse(e.data);
        console.log("e.data in handle:"+e.data);
        if(friendData.type === "friendRequest"){
            console.log("handle friends entered"+friendData.senderId+friendData.recipientId);
            setFriend(prev => [...prev,{
                id:friendData.id,
                senderId:friendData.senderId,
                recipientId:friendData.recipientId
            }]);
        }
    }

    useEffect(() => {
        console.log("Friend state updated:", Friend[0]?.senderId?._id);
    }, [Friend]);
    
    function LogoutUser(){
        axios.post('/logout').then(()=>{
            setWs(null);
            setId(null);
            setUsername(null);
        })
    }
    function sendMessage(ev,file=null){
        if(ev) ev.preventDefault();

        ws.send(JSON.stringify({
            recipient:selectedUser,
            text:newMessageText,
            file,
        }));


        setMessages(prev=>([...prev,{
            text:newMessageText,
            sender:id,
            recipient:selectedUser,
            _id:Date.now(),
        }]));

        setNewMessageText('');


        if (file){
            axios.get('/messages/'+selectedUser).then(res=>{
                setMessages(res.data);
            });
        }
    }

    function sendFile(ev){
        const reader = new FileReader();
        reader.readAsDataURL(ev.target.files[0]);
        reader.onload =()=>{
            sendMessage(null,{
                name:ev.target.files[0].name,
                data:reader.result,
            });
        }
    }


    function fetchFriends() {
        axios.get("/friends").then((res) => {
            console.log("working good");
          setFriend(res.data);
          console.log("fetchFriends"+res.data.senderId);                   
        });
      }
      useEffect(() => {
        fetchFriends();
        const intervalId=setInterval(fetchFriends,1000);

        return ()=>clearInterval(intervalId);
      }, []);

    function addFriend(uid){
        console.log("selected user id:"+id+username);
        console.log("add friend id:"+uid);
        ws.send(JSON.stringify({
            type:"friendRequest",
            recipientId:uid,
        }));
    }
    

    useEffect(()=>{
        const div=messageBox.current;
        if(div && isAtBottom){
            div.scrollIntoView({behavior:'smooth', block:'end'});
            setIsAtBottom(false);
        }
    },[messages]);

    

    useEffect(()=>{

       let interval;
        if (selectedUser) {
            setIsAtBottom(true);
            const fetchMessages = () => {
                axios.get('/messages/' + selectedUser).then(res => {
                    console.log("yes fetching");
                    setMessages(res.data);
                    setCount(prevCount=> {
                      if(prevCount !== res.data.length){
                            setIsAtBottom(true);
                      }
                      return res.data.length;
                    }
                    )
                });
            };
            fetchMessages(); // Initial fetch
            interval = setInterval(fetchMessages, 1000); // Repeat every 1 seconds
        }
        return () => clearInterval(interval);
    },[selectedUser]);

    useEffect(()=>{
        axios.get('/people').then(res=>{
            const offlinePeopleArr=res.data
              .filter(p => p._id !== id)
              .filter(p => !Object.keys(onlinePeople).includes(p._id));
            const offlinePeople={};
            offlinePeopleArr.forEach(p =>{
                offlinePeople[p._id]=p.username;
            });
            setOfflinePeople(offlinePeople);
        })
    },[onlinePeople]);


    const filteredMessages = messages.filter(
        message =>
            (message.sender === selectedUser && message.recipient === id) ||
            (message.sender === id && message.recipient === selectedUser)
    );

    const onlinePeopleExclOurUser={...onlinePeople};
    delete onlinePeopleExclOurUser[id];

    const filteredonlinePeopleExclOurUser=Object.keys(onlinePeopleExclOurUser).filter(userId=>
        onlinePeopleExclOurUser[userId]?.toLowerCase().includes(searchContacts.toLowerCase())
    );

    const filteredOfflinePeople=Object.keys(offlinePeople).filter(userId=>
        offlinePeople[userId].toLowerCase().includes(searchContacts.toLowerCase())
    );

    const friendIds = Friend.flatMap(friend =>[friend?.senderId?._id,friend?.recipientId?._id]);
    console.log("friendIds:"+friendIds);

    const onlineFriendsToDisplay=filteredonlinePeopleExclOurUser.filter(userId=>
        friendIds.includes(userId)
    )

    const offlineFriendsToDisplay=filteredOfflinePeople.filter(userId=>
        friendIds.includes(userId)
    )
    console.log("filterOnlineusers:"+filteredonlinePeopleExclOurUser);
    console.log(onlineFriendsToDisplay+"yyyy"+offlineFriendsToDisplay+"no");

    const remainingOnlineFriends=filteredonlinePeopleExclOurUser.filter(userId=>
        !friendIds.includes(userId)
    )
    const remainingOfflineFriends=filteredOfflinePeople.filter(userId=>
        !friendIds.includes(userId)
    )

    const messageWithOutDups=uniqBy(filteredMessages, '_id');

    return(
        <div>
            <div className="chat-box">
                {isMobileView?(
                    showContacts ?(
                        <div className="contacts-box">
                    <div className='online-offline'>
                    <div className='contact-heading'>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                    </svg>
                    <h3>contacts</h3>
                    </div>
                    <div>
                        <input type="search" className='search-contacts' placeholder='Search' onChange={(ev)=>{setSearchContacts(ev.target.value)}}/>
                    </div>

                        <div className='line1'>
                         {friendIds.length===0 ? 
                            (<div className='catchUp'>
                                catch up some Friends to communicate &#9989;
                            </div>) :
                            (<div>
                                {onlineFriendsToDisplay.map(userId=>
                                <Contacts 
                                    key={userId}
                                    id={userId} 
                                    onClick={() => {
                                        setSelectedUser(userId);
                                        setShowContacts(false);
                                    }}
                                    username={onlinePeopleExclOurUser[userId]}
                                    selected={userId === selectedUser}
                                    online={true}
                                    />
                                )}
                                {offlineFriendsToDisplay.map(userId=>
                                    <Contacts 
                                    key={userId} 
                                    id={userId} 
                                    onClick={() => {setSelectedUser(userId);
                                        setShowContacts(false);
                                    }
                                } 
                                    username={offlinePeople[userId]}
                                    selected={userId === selectedUser}
                                    online={false}
                                    />
                                )}
                            </div>)}
                     </div>
                    </div>
                    {(remainingOnlineFriends.length===0 && remainingOfflineFriends.length===0 ) ?
                    (<div className='allFriends'>
                        Now you can Communicate with all your Friends &#9989;
                    </div> ):
                        (<div className="FriendsContainer">
                        {remainingOnlineFriends.map(userId=>
                            <Friends 
                                key={userId}
                                id={userId}
                                addFriend={addFriend}
                                username={onlinePeopleExclOurUser[userId]}
                                online={true}
                            />
                        )}
                        {remainingOfflineFriends.map(userId=>
                            <Friends
                                key={userId} 
                                id={userId} 
                                addFriend={addFriend}
                                username={offlinePeople[userId]}
                                online={false}
                                />
                            )}
                        </div>)
                    }
                    
                    <div className='logout-div'>
                       <div className='name-icon'>
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                            </svg>
                        <p className='username'>{username}</p>
                        </div>
                       <div> <button type='button' className='logout-button' onClick={LogoutUser}>Logout</button></div>
                    </div>
                </div>
                    ):(
                        <div className='message-part'>
                        {!!selectedUser &&
                            <div className="first">
                                <div className='top-head'>{onlinePeopleExclOurUser[selectedUser] ? (    
                                    <div>                                 
                                    <div className='top-head-username'>
                                        <Avatar username={onlinePeopleExclOurUser[selectedUser]} userId={selectedUser} online={true} />
                                    </div>
                                     <div className='top-name'>{onlinePeopleExclOurUser[selectedUser]}</div>
                                     <button type="button" className='back' onClick={()=>setSelectedUser(null)}>
                                        Back
                                     </button>
                                    </div>
                                    ): 
                                    (
                                    <div>
                                    <div className='top-head-username'>
                                        <Avatar username={offlinePeople[selectedUser]} userId={selectedUser} online={false} />
                                    </div>
                                     <p className='top-name'> {offlinePeople[selectedUser]}</p>
                                     <button type="button" className='back' onClick={()=>setSelectedUser(null)}>
                                        Back
                                     </button>
                                    </div>
                                    )}
                                </div>
                            </div>
                        }
                         {!selectedUser && 
                         <div className="contacts-box">
                         <div className='online-offline'>
                         <div className='contact-heading'>
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                         <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                         </svg>
                         <h3>contacts</h3>
                         </div>
                         <div>
                             <input type="search" className='search-contacts' placeholder='Search' onChange={(ev)=>{setSearchContacts(ev.target.value)}}/>
                         </div>
     
                             <div className='line1'>
                              {friendIds.length===0 ? 
                                 (<div className='catchUp'>
                                     catch up some Friends to communicate &#9989;
                                 </div>) :
                                 (<div>
                                     {onlineFriendsToDisplay.map(userId=>
                                     <Contacts 
                                         key={userId}
                                         id={userId} 
                                         onClick={() => {
                                             setSelectedUser(userId);
                                             setShowContacts(false);
                                         }}
                                         username={onlinePeopleExclOurUser[userId]}
                                         selected={userId === selectedUser}
                                         online={true}
                                         />
                                     )}
                                     {offlineFriendsToDisplay.map(userId=>
                                         <Contacts 
                                         key={userId} 
                                         id={userId} 
                                         onClick={() => {setSelectedUser(userId);
                                             setShowContacts(false);
                                         }
                                     } 
                                         username={offlinePeople[userId]}
                                         selected={userId === selectedUser}
                                         online={false}
                                         />
                                     )}
                                 </div>)}
                          </div>
                         </div>
                         {(remainingOnlineFriends.length===0 && remainingOfflineFriends.length===0 ) ?
                         (<div className='allFriends'>
                             Now you can Communicate with all your Friends &#9989;
                         </div> ):
                             (<div className="FriendsContainer">
                             {remainingOnlineFriends.map(userId=>
                                 <Friends 
                                     key={userId}
                                     id={userId}
                                     addFriend={addFriend}
                                     username={onlinePeopleExclOurUser[userId]}
                                     online={true}
                                 />
                             )}
                             {remainingOfflineFriends.map(userId=>
                                 <Friends
                                     key={userId} 
                                     id={userId} 
                                     addFriend={addFriend}
                                     username={offlinePeople[userId]}
                                     online={false}
                                     />
                                 )}
                             </div>)
                         }
                         
                         <div className='logout-div'>
                            <div className='name-icon'>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                                 <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                                 </svg>
                             <p className='username'>{username}</p>
                             </div>
                            <div> <button type='button' className='logout-button' onClick={LogoutUser}>Logout</button></div>
                         </div>
                     </div>
                        }
                        <div className="messages-box">

                        {!!selectedUser && 
                        <div className='scroll'>
                         <div className='line'>
                            {messageWithOutDups.map(message => (                                
                            <div key={message._id} className={(message.sender === id ? "right" : "left")}>
                                 <div className={(message.sender === id ? "mydata" : "theredata")} >
                                    {message.text}
                                    {message.file && 
                                     <div>
                                        <a href={axios.defaults.baseURL+'/uploads/'+message.file}  className='file-style'>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="file-link">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                                        </svg>
                                            {message.file}
                                        </a>
                                     </div>
                                    }
                            </div>
                            </div>
                            ))}
                        <div ref={messageBox}></div>
                         </div>
                        </div>
                        }
                    </div>
                   {console.log("offlinePeople[selectedUser]:", offlinePeople[selectedUser])} 
                    {!!selectedUser && 
                    <form className='send-part' onSubmit={sendMessage}>
                        <input 
                            value={newMessageText || ''}
                            onChange={(ev)=>setNewMessageText(ev.target.value)}
                            type="text" 
                            placeholder="enter your message here" 
                            className="text-box"/>
                            <label type="button" className='lable'>
                                <input type="file" className='file' onChange={sendFile}/>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="image">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                                </svg>
                            </label>
                        <button type="submit" className='button'>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="image">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                            </svg>
                        </button>
                    </form>
                    }
                </div>
                    )
                ):(
                    <>
                                    <div className="contacts-box">
                    <div className='online-offline'>
                    <div className='contact-heading'>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
                    </svg>
                    <h3>contacts</h3>
                    </div>
                    <div>
                        <input type="search" className='search-contacts' placeholder='Search' onChange={(ev)=>{setSearchContacts(ev.target.value)}}/>
                    </div>

                        <div className='line1'>
                         {friendIds.length===0 ? 
                            (<div className='catchUp'>
                                catch up some Friends to communicate &#9989;
                            </div>) :
                            (<div>
                                {onlineFriendsToDisplay.map(userId=>
                                <Contacts 
                                    key={userId}
                                    id={userId} 
                                    onClick={() => setSelectedUser(userId)}
                                    username={onlinePeopleExclOurUser[userId]}
                                    selected={userId === selectedUser}
                                    online={true}
                                    />
                                )}
                                {offlineFriendsToDisplay.map(userId=>
                                    <Contacts 
                                    key={userId} 
                                    id={userId} 
                                    onClick={() => setSelectedUser(userId)} 
                                    username={offlinePeople[userId]}
                                    selected={userId === selectedUser}
                                    online={false}
                                    />
                                )}
                            </div>)}
                     </div>
                    </div>
                    {(remainingOnlineFriends.length===0 && remainingOfflineFriends.length===0 ) ?
                    (<div className='allFriends'>
                        Now you can Communicate with all your Friends &#9989;
                    </div> ):
                        (<div className="FriendsContainer">
                        {remainingOnlineFriends.map(userId=>
                            <Friends 
                                key={userId}
                                id={userId}
                                addFriend={addFriend}
                                username={onlinePeopleExclOurUser[userId]}
                                online={true}
                            />
                        )}
                        {remainingOfflineFriends.map(userId=>
                            <Friends
                                key={userId} 
                                id={userId} 
                                addFriend={addFriend}
                                username={offlinePeople[userId]}
                                online={false}
                                />
                            )}
                        </div>)
                    }
                    
                    <div className='logout-div'>
                       <div className='name-icon'>
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                            </svg>
                        <p className='username'>{username}</p>
                        </div>
                       <div> <button type='button' className='logout-button' onClick={LogoutUser}>Logout</button></div>
                    </div>
                </div>
                <div className='message-part'>
                    {!!selectedUser &&
                            <div className="first">
                                <div className='top-head'>{onlinePeopleExclOurUser[selectedUser] ? (    
                                    <div>                                 
                                    <div className='top-head-username'>
                                        <Avatar username={onlinePeopleExclOurUser[selectedUser]} userId={selectedUser} online={true} />
                                    </div>
                                     <p className='top-name'>{onlinePeopleExclOurUser[selectedUser]}</p>
                                    </div>
                                    ): 
                                    (
                                    <div>
                                    <div className='top-head-username'>
                                        <Avatar username={offlinePeople[selectedUser]} userId={selectedUser} online={false} />
                                    </div>
                                     <p className='top-name'> {offlinePeople[selectedUser]}</p>
                                    </div>
                                    )}</div>
                            </div>
                        }
                    <div className="messages-box">
                        {!selectedUser && 
                        <div className='select'>
                            &larr; Select a Person from side-bar
                        </div>
                        }
                        {!!selectedUser && 
                        <div className='scroll'>
                         <div className='line'>
                            {messageWithOutDups.map(message => (                                
                            <div key={message._id} className={(message.sender === id ? "right" : "left")}>
                                 <div className={(message.sender === id ? "mydata" : "theredata")} >
                                    {message.text}
                                    {message.file && 
                                     <div>
                                        <a href={axios.defaults.baseURL+'/uploads/'+message.file}  className='file-style'>
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="file-link">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                                        </svg>
                                            {message.file}
                                        </a>
                                     </div>
                                    }
                            </div>
                            </div>
                            ))}
                        <div ref={messageBox}></div>
                         </div>
                        </div>
                        }
                    </div>
                    {!!selectedUser && 
                    <form className='send-part' onSubmit={sendMessage}>
                        <input 
                            value={newMessageText || ''}
                            onChange={(ev)=>setNewMessageText(ev.target.value)}
                            type="text" 
                            placeholder="enter your message here" 
                            className="text-box"/>
                            <label type="button" className='lable'>
                                <input type="file" className='file' onChange={sendFile}/>
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="image">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                                </svg>
                            </label>
                        <button type="submit" className='button'>
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="image">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                            </svg>
                        </button>
                    </form>
                    }
                </div>
                    </>
                )
            }

            </div>
        </div>
    );
}
export default Chat;
