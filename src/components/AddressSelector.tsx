import React, { useState, useEffect } from 'react';
import { MapPin, ChevronDown } from 'lucide-react';
import { egyptianGovernorates, getCitiesByGovernorate, type Governorate, type City } from '../data/egyptianLocations';

interface AddressSelectorProps {
  selectedGovernorate?: string;
  selectedCity?: string;
  onGovernorateChange: (governorateId: string) => void;
  onCityChange: (cityId: string) => void;
  disabled?: boolean;
  error?: string;
}

const AddressSelector: React.FC<AddressSelectorProps> = ({
  selectedGovernorate,
  selectedCity,
  onGovernorateChange,
  onCityChange,
  disabled = false,
  error
}) => {
  const [availableCities, setAvailableCities] = useState<City[]>([]);

  useEffect(() => {
    if (selectedGovernorate) {
      const cities = getCitiesByGovernorate(selectedGovernorate);
      setAvailableCities(cities);
      
      // Reset city selection if it's not valid for the new governorate
      if (selectedCity && !cities.find(city => city.id === selectedCity)) {
        onCityChange('');
      }
    } else {
      setAvailableCities([]);
      onCityChange('');
    }
  }, [selectedGovernorate, selectedCity, onCityChange]);

  return (
    <div className="space-y-4">
      {/* Governorate Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <MapPin className="h-4 w-4 inline mr-1" />
          Governorate *
        </label>
        <div className="relative">
          <select
            value={selectedGovernorate || ''}
            onChange={(e) => onGovernorateChange(e.target.value)}
            disabled={disabled}
            className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white ${
              error ? 'border-red-300 bg-red-50' : 'border-gray-300'
            } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <option value="">Select Governorate</option>
            {egyptianGovernorates.map((governorate) => (
              <option key={governorate.id} value={governorate.id}>
                {governorate.name} - {governorate.nameAr}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
        {error && (
          <p className="text-red-600 text-sm mt-1">{error}</p>
        )}
      </div>

      {/* City Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          City *
        </label>
        <div className="relative">
          <select
            value={selectedCity || ''}
            onChange={(e) => onCityChange(e.target.value)}
            disabled={disabled || !selectedGovernorate || availableCities.length === 0}
            className={`w-full px-3 py-2 pr-10 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white ${
              !selectedGovernorate || availableCities.length === 0
                ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                : 'border-gray-300 cursor-pointer'
            } ${disabled ? 'opacity-50' : ''}`}
          >
            <option value="">
              {!selectedGovernorate 
                ? 'Select governorate first' 
                : availableCities.length === 0 
                ? 'No cities available' 
                : 'Select City'
              }
            </option>
            {availableCities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name} - {city.nameAr}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
        {!selectedGovernorate && (
          <p className="text-gray-500 text-sm mt-1">Please select a governorate first</p>
        )}
      </div>

      {/* Selected Address Display */}
      {selectedGovernorate && selectedCity && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-sm font-medium text-blue-900">Selected Address:</p>
          <p className="text-blue-800">
            {availableCities.find(c => c.id === selectedCity)?.name}, {' '}
            {egyptianGovernorates.find(g => g.id === selectedGovernorate)?.name}
          </p>
        </div>
      )}
    </div>
  );
};

export default AddressSelector;