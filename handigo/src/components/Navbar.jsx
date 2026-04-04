import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import clsx from 'clsx';
import logoImg from '../assets/handigo-logo.png';
import { useAuth } from '../context/AuthContext';
import { Menu, X } from 'lucide-react';

const Navbar = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleScroll = (id) => {
    setMobileOpen(false);
    if (location.pathname !== '/') {
      navigate('/#' + id);
    } else {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const handleNavClick = (path) => {
    setMobileOpen(false);
    navigate(path);
  };

  return (
    <nav className="fixed top-3 sm:top-4 left-1/2 -translate-x-1/2 z-50
      w-full max-w-[1400px] px-3 sm:px-6 md:px-8 lg:px-12 xl:px-16
      transition-all duration-300">
      <div className="w-full bg-dark-gray text-white px-4 sm:px-8 py-3 sm:py-4 flex justify-between items-center rounded-full shadow-lg border border-white/10">

        {/* LOGO */}
        <div className="font-bold text-base sm:text-lg flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
            <img src={logoImg} alt="Logo" className="w-5 h-5 sm:w-6 sm:h-6" /> Handigo
          </Link>
        </div>

        {/* DESKTOP NAV */}
        <div className="flex items-center gap-4 sm:gap-8">
          <div className="hidden md:flex gap-6 lg:gap-8 text-sm font-medium text-gray-300">
            {user && (
              <NavLink
                to="/dashboard"
                className={({ isActive }) => clsx("hover:text-white transition-colors cursor-pointer", isActive && "text-white font-bold")}
              >
                Dashboard
              </NavLink>
            )}
            <button
              onClick={() => handleScroll('tentang')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Tentang
            </button>
            <button
              onClick={() => handleScroll('fitur')}
              className="hover:text-white transition-colors cursor-pointer"
            >
              Fitur
            </button>
            <NavLink
              to="/modul"
              className={({ isActive }) => clsx("hover:text-white transition-colors cursor-pointer", isActive && "text-white font-bold")}
            >
              Modul
            </NavLink>
          </div>

          {/* AUTH BUTTON (always visible) */}
          <div className="hidden md:block">
            {user ? (
              <Link to="/profile" className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-primary-blue text-white rounded-full font-bold hover:scale-105 active:scale-95 transition-transform duration-200 shadow-md text-sm">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </Link>
            ) : (
              <Link to="/login" className="bg-white text-primary-blue px-5 sm:px-6 py-2 rounded-full text-sm font-bold hover:scale-105 active:scale-95 transition-transform duration-200 cursor-pointer">
                Masuk
              </Link>
            )}
          </div>

          {/* MOBILE HAMBURGER */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden flex items-center justify-center w-9 h-9 text-white"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* MOBILE MENU DROPDOWN */}
      {mobileOpen && (
        <div className="md:hidden mt-2 bg-dark-gray rounded-2xl shadow-xl border border-white/10 overflow-hidden animate-in">
          <div className="flex flex-col py-2">
            {user && (
              <button
                onClick={() => handleNavClick('/dashboard')}
                className={clsx(
                  "w-full text-left px-6 py-3 text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-colors",
                  location.pathname === '/dashboard' && "text-white font-bold bg-white/5"
                )}
              >
                Dashboard
              </button>
            )}
            <button
              onClick={() => handleScroll('tentang')}
              className="w-full text-left px-6 py-3 text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              Tentang
            </button>
            <button
              onClick={() => handleScroll('fitur')}
              className="w-full text-left px-6 py-3 text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
            >
              Fitur
            </button>
            <button
              onClick={() => handleNavClick('/modul')}
              className={clsx(
                "w-full text-left px-6 py-3 text-sm font-medium text-gray-300 hover:bg-white/10 hover:text-white transition-colors",
                location.pathname.startsWith('/modul') && "text-white font-bold bg-white/5"
              )}
            >
              Modul
            </button>

            {/* Mobile Auth */}
            <div className="border-t border-white/10 mt-1 pt-2 px-4 pb-3">
              {user ? (
                <button
                  onClick={() => handleNavClick('/profile')}
                  className="w-full flex items-center gap-3 px-2 py-3 text-sm text-gray-300 hover:text-white transition-colors"
                >
                  <div className="w-8 h-8 bg-primary-blue text-white rounded-full font-bold flex items-center justify-center text-xs">
                    {user.name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <span className="font-medium">{user.name || 'Profil'}</span>
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileOpen(false)}
                  className="block w-full text-center bg-white text-primary-blue py-2.5 rounded-full text-sm font-bold mt-1"
                >
                  Masuk
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
