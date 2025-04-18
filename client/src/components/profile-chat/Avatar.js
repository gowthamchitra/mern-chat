import './avatart.css';
function Avatar({username,userId,online}){

    const colors=["pink","red","yellow","purple","lightblue","orange"];
    const userIdBase10=parseInt(userId,16);
    const colorIndex=userIdBase10 %colors.length;
    const color=colors[colorIndex];

    return(
    <div className="person">
        <div className="avatar" style={{backgroundColor:color,boxShadow:'0px 0px 3px black'}}>
            <div>{username[0]}</div>
            {online && (
                <div className='dot'></div>
            )}
            {!online && (
                <div className='dot1'></div>
            )}
        </div>
   </div>
    )
}

export default Avatar;