import { useState } from 'react';
import './index.css';
import axios from './profile-chat/axiosConfig';
import { useUserContext } from '../UserContext';

function Register() {
    const { setUsername, setId } = useUserContext(); // Access context using custom hook
    const [username, setUsernameState] = useState('');
    const [password, setPassword] = useState('');
    const [isLoggedOrRegistered,setIsLoggedOrregistered]=useState('login');

    const handleSubmit = async (event) => {
        event.preventDefault();
        const url = isLoggedOrRegistered === 'register' ? 'register' : 'login';

        console.log("API Call URL:", url);

        try {
            const response = await axios.post(url, { username, password });
            // Assuming response contains the user ID
            setUsername(username);
            setId(response.data.id);
        } catch (err) {
            if(err.response && err.response.status===400){
               alert("username alredy exists");
               setUsernameState('');
               setPassword('');
            }else if(err.response.status==401){
                alert('Invalid credintials');
            }
            else{
            console.error('Registration failed:', err);
            alert(err.response?.data?.error);
            }
        }
    };

    return (
        <div className='Register-body'>
            <div style={{width:'100vw',height:'100vh', backgroundImage:"url(https://cdn.pixabay.com/photo/2020/12/23/14/41/forest-5855196_640.jpg)",backgroundPosition:"center",backgroundSize:"cover"}}>
            <form onSubmit={handleSubmit} className='form'>
               <div className='login-div'>
                    <div className='Login-text'>
                        Login
                    </div>
                    <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsernameState(e.target.value)}
                        className='user'
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className='user'
                    />
                    <input type="submit" value={isLoggedOrRegistered === 'register' ? 'Register' : 'Login'} className='submit'/>
                        <div className='register-text'>
                        {isLoggedOrRegistered === 'register' && (
                        <div>
                        Already a member?<button type="button" onClick={()=> setIsLoggedOrregistered('login')} className='Login-button'>Login</button>
                        </div>
                        )}

                        {isLoggedOrRegistered === 'login' && (
                            <div>
                                Don't have an account?
                                <button type="button" onClick={()=> setIsLoggedOrregistered('register')} className='Login-button'>
                                    Register
                                </button>
                            </div>
                        )}
                    </div>
                
                </div>   
            </form>
            </div>
           
        </div>
    );
}

export default Register;
