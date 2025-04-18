import Avatar from './Avatar';

export default function Contacts({id,onClick,username,selected,online}){
    return(
    <div onClick={()=> onClick(id)} key={id} className={'person '+(selected ? 'modified-person':'')} style={{cursor:'pointer'}}>
        <div className={(selected ? 'style-line':'')}></div>
        <Avatar online={online} username={username} userId={id}/>
        <span className='name'>{username}</span>
    </div>
    );
}