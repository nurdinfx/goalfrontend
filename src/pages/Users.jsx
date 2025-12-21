import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Users as UsersIcon, Mail, User, Shield, Search, RefreshCw, Loader, Eye, EyeOff, Lock } from 'lucide-react';
import { apiService } from '../services/api';
import { useAuth } from '../context/AuthContext';

const Users = () => {
  const { user: currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    name: '',
    role: 'user',
    isActive: true
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const usersData = await apiService.getUsers();
      setUsers(usersData || []);
    } catch (error) {
      console.error('Error loading users:', error);
      alert('Error loading users: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter users based on search
  const filteredUsers = users.filter(user => {
    const searchLower = searchTerm?.toLowerCase() || '';
    return (
      user?.name?.toLowerCase().includes(searchLower) ||
      user?.email?.toLowerCase().includes(searchLower) ||
      user?.username?.toLowerCase().includes(searchLower) ||
      user?.role?.toLowerCase().includes(searchLower)
    );
  });

  // Validate form data
  const validateForm = (data, isEdit = false) => {
    const errors = {};
<<<<<<< HEAD
    
=======

>>>>>>> ddb7805 (initial frontend commit)
    if (!data.name?.trim()) {
      errors.name = 'Name is required';
    }
    if (!data.username?.trim()) {
      errors.username = 'Username is required';
    }
    if (!data.email?.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.email = 'Invalid email format';
    }
    if (!isEdit && !data.password) {
      errors.password = 'Password is required';
    } else if (data.password && data.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
<<<<<<< HEAD
    
=======

>>>>>>> ddb7805 (initial frontend commit)
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormErrors({});

    const errors = validateForm(formData, !!editingUser);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setFormLoading(false);
      return;
    }

    try {
      const userData = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        name: formData.name.trim(),
        role: formData.role,
        isActive: formData.isActive
      };

      // Only include password if it's provided (for new users or when updating)
      if (formData.password) {
        userData.password = formData.password;
      }

      if (editingUser) {
        await apiService.updateUser(editingUser._id, userData);
      } else {
        await apiService.createUser(userData);
      }
<<<<<<< HEAD
      
=======

>>>>>>> ddb7805 (initial frontend commit)
      setShowModal(false);
      setEditingUser(null);
      setFormErrors({});
      setFormData({
        username: '',
        email: '',
        password: '',
        name: '',
        role: 'user',
        isActive: true
      });
      await loadData();
      alert('User saved successfully!');
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Error saving user: ' + error.message);
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await apiService.deleteUser(userId);
        setUsers(prev => prev.filter(u => u._id !== userId));
        alert('User deleted successfully!');
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting user: ' + error.message);
      }
    }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({
      username: '',
      email: '',
      password: '',
      name: '',
      role: 'user',
      isActive: true
    });
    setFormErrors({});
    setShowPassword(false);
    setShowModal(true);
  };

  const openEditModal = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username || '',
      email: user.email || '',
      password: '', // Don't show existing password
      name: user.name || '',
      role: user.role || 'user',
      isActive: user.isActive !== undefined ? user.isActive : true
    });
    setFormErrors({});
    setShowPassword(false);
    setShowModal(true);
  };

  const refreshData = () => {
    loadData();
  };

  // Calculate statistics
  const calculateStats = () => {
    return users.reduce((stats, user) => {
      return {
        totalUsers: stats.totalUsers + 1,
        activeUsers: stats.activeUsers + (user.isActive ? 1 : 0),
        adminUsers: stats.adminUsers + (user.role === 'admin' ? 1 : 0),
        managerUsers: stats.managerUsers + (user.role === 'manager' ? 1 : 0),
        regularUsers: stats.regularUsers + (user.role === 'user' ? 1 : 0)
      };
    }, {
      totalUsers: 0,
      activeUsers: 0,
      adminUsers: 0,
      managerUsers: 0,
      regularUsers: 0
    });
  };

  const stats = calculateStats();

  // Role badge component
  const RoleBadge = ({ role }) => {
    const roleColors = {
      admin: 'bg-red-100 text-red-800',
      manager: 'bg-blue-100 text-blue-800',
      user: 'bg-gray-100 text-gray-800'
    };
<<<<<<< HEAD
    
=======

>>>>>>> ddb7805 (initial frontend commit)
    const roleText = {
      admin: 'Admin',
      manager: 'Manager',
      user: 'User'
    };
<<<<<<< HEAD
    
=======

>>>>>>> ddb7805 (initial frontend commit)
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${roleColors[role] || 'bg-gray-100 text-gray-800'}`}>
        {roleText[role] || 'Unknown'}
      </span>
    );
  };

  // Status badge component
  const StatusBadge = ({ isActive }) => {
    return (
<<<<<<< HEAD
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
        isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
      }`}>
=======
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
        }`}>
>>>>>>> ddb7805 (initial frontend commit)
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  // Check if user is admin
  if (currentUser?.role !== 'admin') {
    return (
      <div className="space-y-6 p-4 sm:p-6">
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          <h3 className="font-semibold">Access Denied</h3>
          <p>You must be an administrator to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 no-print">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">Users Management</h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">Manage system users, roles, and access permissions</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
          <button
            onClick={refreshData}
            className="bg-gray-600 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center hover:bg-gray-700 transition duration-200 text-sm sm:text-base flex-1 sm:flex-none"
          >
            <RefreshCw className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            <span className="hidden sm:inline">Refresh</span>
            <span className="sm:hidden">Refresh</span>
          </button>
          <button
            onClick={openCreateModal}
            className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg flex items-center justify-center hover:bg-blue-700 transition duration-200 text-sm sm:text-base flex-1 sm:flex-none"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            <span className="hidden sm:inline">Add User</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

<<<<<<< HEAD
      {/* Loading State */}
      {loading && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded no-print">
          <div className="flex items-center">
            <Loader className="w-5 h-5 animate-spin mr-2" />
            Loading users data...
          </div>
        </div>
      )}
=======

>>>>>>> ddb7805 (initial frontend commit)

      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4 no-print">
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200 text-center">
          <UsersIcon className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 mx-auto mb-2" />
          <p className="text-xs sm:text-sm text-gray-600">Total Users</p>
          <p className="text-lg sm:text-xl font-semibold">{stats.totalUsers}</p>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200 text-center">
          <User className="w-6 h-6 sm:w-8 sm:h-8 text-green-500 mx-auto mb-2" />
          <p className="text-xs sm:text-sm text-gray-600">Active Users</p>
          <p className="text-lg sm:text-xl font-semibold">{stats.activeUsers}</p>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200 text-center">
          <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-red-500 mx-auto mb-2" />
          <p className="text-xs sm:text-sm text-gray-600">Admins</p>
          <p className="text-lg sm:text-xl font-semibold">{stats.adminUsers}</p>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200 text-center">
          <User className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500 mx-auto mb-2" />
          <p className="text-xs sm:text-sm text-gray-600">Managers</p>
          <p className="text-lg sm:text-xl font-semibold">{stats.managerUsers}</p>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200 text-center">
          <User className="w-6 h-6 sm:w-8 sm:h-8 text-gray-500 mx-auto mb-2" />
          <p className="text-xs sm:text-sm text-gray-600">Regular Users</p>
          <p className="text-lg sm:text-xl font-semibold">{stats.regularUsers}</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 no-print">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search users by name, email, username, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-9 sm:pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 text-sm sm:text-base"
            />
          </div>
          <div className="flex items-center justify-end">
            <p className="text-sm text-gray-600">
              Showing {filteredUsers.length} of {users.length} users
            </p>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12">#</th>
                <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User Info</th>
                <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">Contact</th>
                <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.map((user, index) => (
                <tr key={user._id} className="hover:bg-gray-50">
                  <td className="px-3 sm:px-4 py-4 text-sm text-gray-500 text-center">
                    {index + 1}
                  </td>
                  <td className="px-3 sm:px-4 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 sm:w-6 sm:h-6 text-blue-600" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-gray-900 truncate">{user.name}</div>
                        <div className="text-xs text-gray-500 truncate">
                          @{user.username}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 py-4 hidden sm:table-cell">
                    <div className="text-sm text-gray-900">
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 mr-2 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{user.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 sm:px-4 py-4">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="px-3 sm:px-4 py-4">
                    <StatusBadge isActive={user.isActive} />
                  </td>
                  <td className="px-3 sm:px-4 py-4">
                    <div className="flex flex-col space-y-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="text-blue-600 hover:text-blue-800 p-2 rounded transition duration-200 border border-blue-200 hover:bg-blue-50 flex items-center justify-center"
                        title="Edit User"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {user._id !== currentUser?._id && (
                        <button
                          onClick={() => handleDelete(user._id)}
                          className="text-red-600 hover:text-red-800 p-2 rounded transition duration-200 border border-red-200 hover:bg-red-50 flex items-center justify-center"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <UsersIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No users found' : 'No users registered yet'}
              </h3>
              <p className="text-gray-600 mb-4">
                {searchTerm ? 'Try adjusting your search terms' : 'Get started by adding your first user'}
              </p>
              {!searchTerm && (
                <button
                  onClick={openCreateModal}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition duration-200"
                >
                  <Plus className="w-5 h-5 mr-2 inline" />
                  Add User
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white rounded-xl p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-2 sm:mx-4">
            <h2 className="text-xl font-semibold mb-4">
              {editingUser ? 'Edit User' : 'Add New User'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3 border-b pb-2">User Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
<<<<<<< HEAD
                      className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 text-sm sm:text-base ${
                        formErrors.name ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                      }`}
=======
                      className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 text-sm sm:text-base ${formErrors.name ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                        }`}
>>>>>>> ddb7805 (initial frontend commit)
                      placeholder="Enter full name"
                    />
                    {formErrors.name && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value.toLowerCase().trim() })}
<<<<<<< HEAD
                      className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 text-sm sm:text-base ${
                        formErrors.username ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                      }`}
=======
                      className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 text-sm sm:text-base ${formErrors.username ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                        }`}
>>>>>>> ddb7805 (initial frontend commit)
                      placeholder="Enter username"
                      disabled={!!editingUser}
                    />
                    {formErrors.username && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.username}</p>
                    )}
                    {editingUser && (
                      <p className="text-xs text-gray-500 mt-1">Username cannot be changed</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase().trim() })}
<<<<<<< HEAD
                      className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 text-sm sm:text-base ${
                        formErrors.email ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                      }`}
=======
                      className={`w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 text-sm sm:text-base ${formErrors.email ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                        }`}
>>>>>>> ddb7805 (initial frontend commit)
                      placeholder="Enter email address"
                    />
                    {formErrors.email && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role *
                    </label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 text-sm sm:text-base"
                    >
                      <option value="user">User</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password {!editingUser && '*'}
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required={!editingUser}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
<<<<<<< HEAD
                        className={`w-full border rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 text-sm sm:text-base ${
                          formErrors.password ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                        }`}
=======
                        className={`w-full border rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200 text-sm sm:text-base ${formErrors.password ? 'border-red-500' : 'border-gray-300 focus:border-blue-500'
                          }`}
>>>>>>> ddb7805 (initial frontend commit)
                        placeholder={editingUser ? "Leave blank to keep current password" : "Enter password"}
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                    {formErrors.password && (
                      <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>
                    )}
                    {editingUser && (
                      <p className="text-xs text-gray-500 mt-1">Leave blank to keep current password</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.isActive ? 'active' : 'inactive'}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition duration-200 text-sm sm:text-base"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>
<<<<<<< HEAD
              
=======

>>>>>>> ddb7805 (initial frontend commit)
              <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingUser(null);
                    setFormErrors({});
                    setFormData({
                      username: '',
                      email: '',
                      password: '',
                      name: '',
                      role: 'user',
                      isActive: true
                    });
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition duration-200 text-sm sm:text-base order-2 sm:order-1"
                  disabled={formLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200 flex items-center justify-center text-sm sm:text-base order-1 sm:order-2"
                >
                  {formLoading && <Loader className="w-4 h-4 animate-spin mr-2" />}
                  {editingUser ? 'Update' : 'Create'} User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;

