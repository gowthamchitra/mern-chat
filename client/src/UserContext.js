import { createContext, useState, useContext, useEffect } from 'react';
import axios from './components/profile-chat/axiosConfig';

// Create UserContext
export const UserContext = createContext();

// UserContextProvider component to provide context to children components

export function UserContextProvider({ children }) {
    const [username, setUsername] = useState(null);
    const [id, setId] = useState(null);
    useEffect(()=>{
        axios.get('/profile').then(response=>{
            setId(response.data.userId);
            setUsername(response.data.username);
        })
    },[]);

    return (
        <UserContext.Provider value={{ username, setUsername, id, setId }}>
            {children}
        </UserContext.Provider>
    );
}

// Custom hook to use the UserContext
export function useUserContext() {
    return useContext(UserContext);
}
