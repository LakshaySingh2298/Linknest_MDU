import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, User, Mail, Phone, Home, Wifi } from 'lucide-react';
import { Tenant } from '../../types';

interface EditTenantModalProps {
  tenant: Tenant;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

const EditTenantModal: React.FC<EditTenantModalProps> = ({ tenant, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: tenant.name,
    email: tenant.email,
    phone: tenant.phone,
    unit_number: tenant.unit_number,
    plan_type: tenant.plan_type,
  });

  const [errors, setErrors] = useState<any>({});

  const validateForm = () => {
    const newErrors: any = {};
    
    if (!formData.name || formData.name.length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }
    
    if (!formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (!formData.phone || !/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = 'Phone must be 10 digits';
    }
    
    if (!formData.unit_number) {
      newErrors.unit_number = 'Unit number is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit Tenant</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Current Info */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Current Information</h3>
          <div className="space-y-1 text-sm text-gray-600">
            <p>ID: #{tenant.id}</p>
            <p>Status: {tenant.connection_status}</p>
            <p>Current Usage: {tenant.data_usage.toFixed(1)} GB</p>
            <p>Current Bill: ₹{tenant.current_bill}</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="label">
              <User className="w-4 h-4 inline mr-1" />
              Full Name
            </label>
            <input
              type="text"
              className={`input ${errors.name ? 'border-red-500' : ''}`}
              placeholder="Enter tenant's full name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="label">
              <Mail className="w-4 h-4 inline mr-1" />
              Email Address
            </label>
            <input
              type="email"
              className={`input ${errors.email ? 'border-red-500' : ''}`}
              placeholder="tenant@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="label">
              <Phone className="w-4 h-4 inline mr-1" />
              Phone Number
            </label>
            <input
              type="tel"
              className={`input ${errors.phone ? 'border-red-500' : ''}`}
              placeholder="9876543210"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              maxLength={10}
            />
            {errors.phone && (
              <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
            )}
          </div>

          {/* Unit Number */}
          <div>
            <label className="label">
              <Home className="w-4 h-4 inline mr-1" />
              Unit Number
            </label>
            <input
              type="text"
              className={`input ${errors.unit_number ? 'border-red-500' : ''}`}
              placeholder="A-101"
              value={formData.unit_number}
              onChange={(e) => setFormData({ ...formData, unit_number: e.target.value })}
            />
            {errors.unit_number && (
              <p className="text-red-500 text-sm mt-1">{errors.unit_number}</p>
            )}
          </div>

          {/* Plan Type */}
          <div>
            <label className="label">
              <Wifi className="w-4 h-4 inline mr-1" />
              Plan Type
            </label>
            <select
              className="input"
              value={formData.plan_type}
              onChange={(e) => setFormData({ ...formData, plan_type: e.target.value })}
            >
              <option value="Basic">Basic (25 Mbps - ₹5/GB)</option>
              <option value="Standard">Standard (50 Mbps - ₹10/GB)</option>
              <option value="Premium">Premium (100 Mbps - ₹20/GB)</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 btn-primary"
            >
              Update Tenant
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default EditTenantModal;
