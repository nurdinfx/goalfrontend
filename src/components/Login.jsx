import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Mail, Lock, User, Phone, AlertCircle, CheckCircle, Trash2, RefreshCw } from 'lucide-react';
import config from '../config/env';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    phoneNumber: '',
    role: 'admin'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [testingConnection, setTestingConnection] = useState(false);

  const { login, backendConnected, testBackendConnection } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';

  useEffect(() => {
    // Clear any existing errors when component mounts
    setMessage({ type: '', text: '' });
  }, []);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      let result;
      
      if (isLogin) {
        result = await login(formData.email, formData.password);
      } else {
        // For demo purposes, we'll use the same login function
        result = await login(formData.email, formData.password);
      }

      if (result.success) {
        setMessage({
          type: 'success',
          text: isLogin ? 'Login successful! Redirecting...' : 'Registration successful! Redirecting...'
        });
        
        // Redirect after a short delay
        setTimeout(() => {
          navigate(from, { replace: true });
        }, 1000);
      } else {
        setMessage({
          type: 'error',
          text: result.error
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'An unexpected error occurred. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setMessage({ type: '', text: '' });
    setFormData({
      fullName: '',
      email: '',
      password: '',
      phoneNumber: '',
      role: 'admin'
    });
  };


  const retryConnection = async () => {
    setTestingConnection(true);
    setMessage({ type: '', text: 'Testing connection to backend...' });
    
    try {
      await testBackendConnection();
      setMessage({ type: 'success', text: 'Backend connection successful!' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Still unable to connect to backend' });
    } finally {
      setTestingConnection(false);
    }
  };

  // Show connection testing screen only if backend is not connected AND we're not in the middle of testing
  if (!backendConnected && !testingConnection) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center">
            <div className="flex justify-center items-center mb-6">
              <Trash2 className="h-12 w-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Connection Issue</h2>
            <p className="text-gray-600 mb-4">
              Having trouble connecting to the backend server
            </p>
            
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                <p className="text-sm text-yellow-800">
                  Backend server not detected at {config.apiBaseUrl}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <button
                onClick={retryConnection}
                disabled={testingConnection}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50 transition duration-200 flex items-center justify-center"
              >
                {testingConnection ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2" />
                    Retry Connection
                  </>
                )}
              </button>
              
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg text-left">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Troubleshooting Tips:</h3>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• Make sure backend is running: <code>npm start</code> in backend folder</li>
                <li>• Check if port 5001 is available and not blocked</li>
                <li>• Verify backend URL: {config.apiBaseUrl}</li>
                <li>• Check console for detailed error messages</li>
                <li>• Ensure MongoDB is running if using database</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center items-center mb-4">
            <Trash2 className="h-12 w-12 text-green-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Garbage Management
          </h2>
          <p className="text-gray-600">
            {isLogin ? 'Sign in to your account' : 'Create new account'}
          </p>
          
          {/* Connection Status */}
          <div className={`mt-4 p-3 rounded-lg text-sm ${
            backendConnected 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
          }`}>
            <div className="flex items-center justify-center">
              {backendConnected ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  <span>✅ Connected to backend</span>
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                  <span>Connecting to backend...</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div className={`mb-6 p-4 rounded-lg flex items-center ${
            message.type === 'success' 
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {message.type === 'success' ? (
              <CheckCircle className="h-5 w-5 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 mr-2" />
            )}
            <span>{message.text}</span>
          </div>
        )}


        <form className="space-y-6" onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    required={!isLogin}
                    value={formData.fullName}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200"
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    required={!isLogin}
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200"
                    placeholder="Enter your phone number"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="block w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200"
                >
                  <option value="admin">Administrator</option>
                  <option value="manager">Manager</option>
                  <option value="worker">Worker</option>
                  <option value="driver">Driver</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200"
                placeholder="Enter your email"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={handleChange}
                className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition duration-200"
                placeholder="Enter your password"
                minLength="6"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center hover:text-gray-600 transition duration-200"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 text-gray-400" />
                ) : (
                  <Eye className="h-5 w-5 text-gray-400" />
                )}
              </button>
            </div>
            {!isLogin && (
              <p className="mt-2 text-sm text-gray-500">
                Password must be at least 6 characters long
              </p>
            )}
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  {isLogin ? 'Signing in...' : 'Creating account...'}
                </div>
              ) : (
                isLogin ? 'Sign in' : 'Create account'
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={switchMode}
            className="text-green-600 hover:text-green-500 font-medium transition duration-200"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>

      </div>
    </div>
  );
};

export default Login;
