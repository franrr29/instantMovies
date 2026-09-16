import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { Chat } from './pages/Chat';
import { Landing } from './pages/Landing';
import { Likes } from './pages/Likes';
import { Login } from './pages/Login';
import { MovieList } from './pages/MovieList';
import { Recommendations } from './pages/Recommendations';
import { Register } from './pages/Register';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route path="/movies" element={<MovieList />} />
                <Route path="/likes" element={<Likes />} />
                <Route path="/recommendations" element={<Recommendations />} />
                <Route path="/chat" element={<Chat />} />
              </Route>
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
