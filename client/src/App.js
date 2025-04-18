
import './App.css';

import { UserContextProvider } from './UserContext';
import Routes from './Routes';

function App() {
  return (
    <UserContextProvider>
    <Routes />
    </UserContextProvider>
  );
}

export default App;
