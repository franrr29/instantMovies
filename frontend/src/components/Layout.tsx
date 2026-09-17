import { Outlet } from 'react-router-dom';
import { Chat } from '../pages/Chat';
import { Navbar } from './Navbar';

export function Layout() {
  return (
    <div className="min-h-screen bg-bg text-ink">
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 py-10 sm:px-10">
        <Outlet />
      </main>
      <Chat />
    </div>
  );
}
