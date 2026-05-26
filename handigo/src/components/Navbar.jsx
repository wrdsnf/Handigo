import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Menu, X } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isLoggedIn = !!user;

  const handleHandigo = () => {
    navigate(isLoggedIn ? '/dashboard' : '/');
    setMobileOpen(false);
  };

  const closeMobile = () => setMobileOpen(false);

  const handleLogout = () => {
    logout();
    closeMobile();
  };

  return (
    <>
      {/* z-index diturunkan ke 40 agar tertutup overlay saat sidebar terbuka */}
      <nav className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-b border-gray-200">
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
              {!isLoggedIn ? (
                <div className="flex items-center space-x-3">
                  <Link to="/login" className="text-gray-700 hover:text-primary-blue transition">
                    Masuk
                  </Link>
                  <Link to="/register" className="bg-primary-blue text-white px-4 py-2 rounded-full hover:bg-primary-hover transition">
                    Daftar
                  </Link>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Link to="/profile" className="bg-black text-white px-4 py-2 rounded-full hover:bg-gray-800 transition">
                    Profil
                  </Link>
                  <button onClick={logout} className="text-gray-900 hover:text-black transition font-medium">
                    Logout
                  </button>
                </div>
              )}
            </div>

            {/* MOBILE MENU BUTTON (HANYA MUNCULKAN ICON HAMBURGER) */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden p-2 rounded-md text-gray-700 hover:text-primary-blue"
            >
              <Menu size={24} />
            </button>
          </div>
        </div>
      </nav>

      {/* ✅ OVERLAY GELAP */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 md:hidden transition-opacity"
          onClick={closeMobile}
        />
      )}

      {/* ✅ MOBILE SIDEBAR (SLIDE DARI KANAN) */}
      <div 
        className={`fixed top-0 right-0 h-full w-64 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out md:hidden flex flex-col ${
          mobileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* HEADER SIDEBAR */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <span className="text-lg font-bold text-primary-blue">Menu</span>
          <button 
            onClick={closeMobile}
            className="p-2 rounded-md text-gray-500 hover:text-primary-blue hover:bg-gray-100 transition"
          >
            <X size={24} />
          </button>
        </div>

        {/* KONTEN SIDEBAR */}
        <div className="p-4 flex flex-col space-y-4">
          {!isLoggedIn ? (
            <>
              <Link
                to="/login"
                onClick={closeMobile}
                className="block px-4 py-3 rounded-lg text-base font-medium text-gray-700 hover:text-primary-blue hover:bg-gray-50 transition"
              >
                Masuk
              </Link>
              <Link
                to="/register"
                onClick={closeMobile}
                className="block px-4 py-3 rounded-lg text-base font-medium bg-primary-blue text-white text-center hover:bg-primary-hover transition"
              >
                Daftar
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/profile"
                onClick={closeMobile}
                className="block px-4 py-3 rounded-lg text-base font-medium bg-black text-white text-center hover:bg-gray-800 transition"
              >
                Profil
              </Link>
              <button
                onClick={handleLogout}
                className="block w-full text-left px-4 py-3 rounded-lg text-base font-medium text-red-600 hover:bg-red-50 transition"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default Navbar;