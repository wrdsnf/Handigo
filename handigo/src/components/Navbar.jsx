import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Menu, X } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isLoggedIn = !!user;

  // ✅ LOGIC HANDIGO (FIX UTAMA)
  const handleHandigo = () => {
    navigate(isLoggedIn ? '/dashboard' : '/');
    setMobileOpen(false);
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        <div className="flex justify-between items-center h-16">

          {/* LOGO */}
          <div
            onClick={handleHandigo}
            className="flex items-center space-x-2 cursor-pointer"
          >
            <img
              src="/handigo-logo.png"
              alt="Handigo Logo"
              className="w-8 h-8 object-contain"
            />

            <span className="text-xl font-bold text-primary-blue">
              Handigo
            </span>
          </div>

          {/* USER MENU (DESKTOP) */}
          <div className="hidden md:flex items-center space-x-4">

            {/* GUEST */}
            {!isLoggedIn && (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="text-gray-700 hover:text-primary-blue transition"
                >
                  Masuk
                </Link>

                <Link
                  to="/register"
                  className="bg-primary-blue text-white px-4 py-2 rounded-full hover:bg-primary-hover transition"
                >
                  Daftar
                </Link>
              </div>
            )}

            {/* USER */}
            {isLoggedIn && (
              <div className="flex items-center space-x-3">

                <Link
                  to="/profile"
                  className="bg-black text-white px-4 py-2 rounded-full hover:bg-gray-800 transition"
                >
                  Profil
                </Link>

                <button
                  onClick={logout}
                  className="text-gray-900 hover:text-black transition font-medium"
                >
                  Logout
                </button>

              </div>
            )}

          </div>

          {/* MOBILE MENU BUTTON */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 rounded-md text-gray-700 hover:text-primary-blue"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>

        </div>
      </div>
    </nav>
  );
};

export default Navbar;