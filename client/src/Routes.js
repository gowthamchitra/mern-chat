
import { useUserContext } from "./UserContext";
import Register from "./components/register";
import Chat from "./components/profile-chat/chat";

export default function Routes(){
    const {username,id}=useUserContext();

    if(username){
        return (<Chat/>);
    }

    return (<Register/>);
}