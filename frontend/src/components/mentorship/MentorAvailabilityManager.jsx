import React, { useEffect, useState, useCallback } from "react";
import { 
  getMentorAvailability, 
  createAvailability, 
  updateAvailability, 
  deleteAvailability,
  bulkCreateAvailability,
  getAvailabilitySummary 
} from "./mentorshipAPI";
import { Calendar, Clock, Plus, Edit, Trash2, Save, X, AlertCircle, Check } from "lucide-react";

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' }
];

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Australia/Sydney'
];

const MentorAvailabilityManager = () => {
  const [availability, setAvailability] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '17:00',
    timezone: 'America/New_York',
    isActive: true,
    recurring: true
  });
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkData, setBulkData] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [availabilityData, summaryData] = await Promise.all([
        getMentorAvailability(),
        getAvailabilitySummary()
      ]);
      
      setAvailability(availabilityData);
      setSummary(summaryData);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load availability");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    try {
      setError(null);
      await createAvailability(formData);
      setSuccess("Availability created successfully!");
      setFormData({
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00',
        timezone: 'America/New_York',
        isActive: true,
        recurring: true
      });
      fetchData();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create availability");
    }
  };

  const handleUpdate = async (id) => {
    try {
      setError(null);
      await updateAvailability(id, formData);
      setSuccess("Availability updated successfully!");
      setEditingId(null);
      fetchData();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to update availability");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this availability?")) return;
    
    try {
      setError(null);
      await deleteAvailability(id);
      setSuccess("Availability deleted successfully!");
      fetchData();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to delete availability");
    }
  };

  const handleBulkCreate = async () => {
    if (bulkData.length === 0) {
      setError("Please add at least one availability slot");
      return;
    }

    try {
      setError(null);
      const result = await bulkCreateAvailability(bulkData);
      setSuccess(`Created ${result.created.length} availability slots successfully!`);
      setBulkData([]);
      setBulkMode(false);
      fetchData();
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create bulk availability");
    }
  };

  const startEdit = (availability) => {
    setEditingId(availability.id);
    setFormData({
      dayOfWeek: availability.dayOfWeek,
      startTime: availability.startTime,
      endTime: availability.endTime,
      timezone: availability.timezone,
      isActive: availability.isActive,
      recurring: availability.recurring
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({
      dayOfWeek: 1,
      startTime: '09:00',
      endTime: '17:00',
      timezone: 'America/New_York',
      isActive: true,
      recurring: true
    });
  };

  const addBulkSlot = () => {
    setBulkData([...bulkData, { ...formData, id: Date.now() }]);
  };

  const removeBulkSlot = (id) => {
    setBulkData(bulkData.filter(slot => slot.id !== id));
  };

  const validateTimeRange = () => {
    const start = formData.startTime;
    const end = formData.endTime;
    return start < end;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Manage Availability</h1>
        <p className="text-gray-600">Set your available time slots for mentorship sessions</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <Check className="w-5 h-5 text-green-500 mr-2" />
            <span className="text-green-700">{success}</span>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Slots</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalSlots}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Weekly Hours</p>
                <p className="text-2xl font-bold text-gray-900">{summary.weeklyHours}</p>
              </div>
              <Clock className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Days</p>
                <p className="text-2xl font-bold text-gray-900">{Object.keys(summary.schedule).length}</p>
              </div>
              <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <span className="text-purple-600 text-sm font-bold">D</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Form */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {editingId ? 'Edit Availability' : 'Add Availability'}
            </h2>
            
            <div className="flex items-center space-x-2">
              {!bulkMode && (
                <button
                  onClick={() => setBulkMode(true)}
                  className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                >
                  Bulk Add
                </button>
              )}
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Day of Week
              </label>
              <select
                value={formData.dayOfWeek}
                onChange={(e) => setFormData({ ...formData, dayOfWeek: parseInt(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DAYS_OF_WEEK.map(day => (
                  <option key={day.value} value={day.value}>{day.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Time
              </label>
              <input
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Timezone
              </label>
              <select
                value={formData.timezone}
                onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {TIMEZONES.map(tz => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Active</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.recurring}
                  onChange={(e) => setFormData({ ...formData, recurring: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">Recurring</span>
              </label>
            </div>
          </div>

          {!validateTimeRange() && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="w-4 h-4 text-yellow-500 mr-2" />
                <span className="text-yellow-700 text-sm">End time must be after start time</span>
              </div>
            </div>
          )}

          <div className="mt-6 flex space-x-3">
            {editingId ? (
              <>
                <button
                  onClick={() => handleUpdate(editingId)}
                  disabled={!validateTimeRange()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <Save className="w-4 h-4 mr-2" />
                  Update
                </button>
                <button
                  onClick={cancelEdit}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors flex items-center"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </button>
              </>
            ) : (
              <button
                onClick={handleCreate}
                disabled={!validateTimeRange()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Availability
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Mode */}
      {bulkMode && (
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Bulk Add Availability</h2>
          </div>
          
          <div className="p-6">
            <div className="mb-4">
              <button
                onClick={addBulkSlot}
                disabled={!validateTimeRange()}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Slot
              </button>
            </div>

            {bulkData.length > 0 && (
              <div className="space-y-2">
                {bulkData.map((slot, index) => (
                  <div key={slot.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-sm text-gray-700">
                      {DAYS_OF_WEEK.find(d => d.value === slot.dayOfWeek)?.label} - {slot.startTime} to {slot.endTime} ({slot.timezone})
                    </span>
                    <button
                      onClick={() => removeBulkSlot(slot.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                
                <div className="mt-4 flex space-x-3">
                  <button
                    onClick={handleBulkCreate}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Create All ({bulkData.length})
                  </button>
                  <button
                    onClick={() => {
                      setBulkMode(false);
                      setBulkData([]);
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Availability List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Current Availability</h2>
        </div>
        
        {availability.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No availability set yet
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {availability.map((slot) => (
              <div key={slot.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <span className="font-medium text-gray-900">
                        {DAYS_OF_WEEK.find(d => d.value === slot.dayOfWeek)?.label}
                      </span>
                      <span className="text-gray-600">
                        {slot.startTime} - {slot.endTime}
                      </span>
                      <span className="text-sm text-gray-500">
                        ({slot.timezone})
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        slot.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {slot.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {slot.recurring && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          Recurring
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => startEdit(slot)}
                      className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(slot.id)}
                      className="p-2 text-gray-600 hover:text-red-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MentorAvailabilityManager;
