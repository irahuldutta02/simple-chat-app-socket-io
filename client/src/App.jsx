import { Chat } from "./components/Chat";
import { Loading } from "./components/Loading";
import { Login } from "./components/Login";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return <Loading />;
  }

  if (!user) {
    return <Login />;
  }

  return (
    <SocketProvider>
      <Chat />
    </SocketProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
