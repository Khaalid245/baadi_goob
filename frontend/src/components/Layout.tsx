import { Outlet, Link } from 'react-router-dom';

export default function Layout() {
  return (
    <div className="flex flex-col min-h-screen">
      <nav className="bg-blue-600 text-white p-4">
        <div className="container mx-auto flex justify-between">
          <Link to="/" className="font-bold text-xl">Furan</Link>
          <div className="space-x-4">
            <Link to="/opportunities">Opportunities</Link>
            <Link to="/competitions">Competitions</Link>
            <Link to="/login">Login</Link>
          </div>
        </div>
      </nav>
      <main className="flex-grow container mx-auto p-4">
        <Outlet />
      </main>
      <footer className="bg-gray-800 text-white p-4 text-center mt-auto">
        <p>&copy; {new Date().getFullYear()} Furan</p>
      </footer>
    </div>
  );
}
