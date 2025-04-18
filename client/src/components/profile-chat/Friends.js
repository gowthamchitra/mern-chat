import Avatar from './Avatar';

export default function Friends({id,username,online,addFriend}){
    return(
    <div className='friend'>
        <Avatar online={online} username={username} userId={id}/>
        <span className='friend-name'>{username}</span>
        <button className='add' onClick={()=>addFriend(id)}>Add Friend</button>
    </div>
    );
}