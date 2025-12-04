import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Users as UsersIcon, 
  MapPin, 
  UserCog, 
  Car, 
  BarChart3, 
  LogOut,
  Menu,
  X,
  DollarSign,
  Banknote,
  Shield,
  Home
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Safe user data access - Define these before using them
  const getUserDisplayName = () => {
    return user?.name || user?.fullName || user?.username || 'User';
  };

  const getUserRole = () => {
    return user?.role || 'user';
  };

  const getUserInitials = () => {
    const name = getUserDisplayName();
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  // Build navigation array after helper functions are defined
  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard },
    { name: 'Customers', href: '/customers', icon: UsersIcon },
    { name: 'Zones', href: '/zones', icon: MapPin },
    { name: 'Village Details', href: '/village-details', icon: Home },
    { name: 'Workers', href: '/workers', icon: UserCog },
    { name: 'Fleet', href: '/cars', icon: Car },
    { name: 'Company Expenses', href: '/company-expenses', icon: DollarSign },
    { name: 'Withdrawals', href: '/withdraws', icon: Banknote },
    { name: 'Reports', href: '/reports', icon: BarChart3 },
    ...(getUserRole() === 'admin' ? [{ name: 'Users', href: '/users', icon: Shield }] : []),
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>
        
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-blue-700">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-blue-700 font-bold text-sm">GC</span>
              </div>
              <span className="ml-3 text-xl font-bold text-white">SHIRKADA GAOL</span>
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                      isActive(item.href)
                        ? 'bg-blue-800 text-white'
                        : 'text-blue-100 hover:bg-blue-600 hover:text-white'
                    }`}
                    onClick={() => setSidebarOpen(false)}
                  >
                    <Icon className={`mr-4 flex-shrink-0 h-6 w-6 ${
                      isActive(item.href) ? 'text-white' : 'text-blue-200 group-hover:text-white'
                    }`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
          
          <div className="flex-shrink-0 flex border-t border-blue-600 p-4">
            <div className="flex items-center w-full">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-blue-800 flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {getUserInitials()}
                  </span>
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-white">{getUserDisplayName()}</p>
                <p className="text-xs font-medium text-blue-200 capitalize">{getUserRole()}</p>
              </div>
              <button
                onClick={handleLogout}
                className="ml-3 p-2 text-blue-200 hover:text-white transition duration-200"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 md:z-30">
        <div className="flex-1 flex flex-col min-h-0 border-r border-blue-600 bg-blue-700">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <div className="h-8 w-8 bg-white rounded-lg flex items-center justify-center">
                <span className="text-blue-700 font-bold text-sm">GC</span>
              </div>
              <span className="ml-3 text-xl font-bold text-white">SHIRKADA GAOL</span>
            </div>
            <nav className="mt-5 flex-1 px-2 bg-blue-700 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      isActive(item.href)
                        ? 'bg-blue-800 text-white'
                        : 'text-blue-100 hover:bg-blue-600 hover:text-white'
                    }`}
                  >
                    <Icon className={`mr-3 flex-shrink-0 h-6 w-6 ${
                      isActive(item.href) ? 'text-white' : 'text-blue-200 group-hover:text-white'
                    }`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>
          
          <div className="flex-shrink-0 flex border-t border-blue-600 p-4">
            <div className="flex items-center w-full">
              <div className="flex-shrink-0">
                <div className="h-10 w-10 rounded-full bg-blue-800 flex items-center justify-center">
                  <span className="text-white font-semibold text-sm">
                    {getUserInitials()}
                  </span>
                </div>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-white">{getUserDisplayName()}</p>
                <p className="text-xs font-medium text-blue-200 capitalize">{getUserRole()}</p>
              </div>
              <button
                onClick={handleLogout}
                className="ml-3 p-2 text-blue-200 hover:text-white transition duration-200"
                title="Logout"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        <div className="sticky top-0 z-10 md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-gray-50">
          <button
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>
        
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
