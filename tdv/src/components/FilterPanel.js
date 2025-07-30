import React from 'react';
import './FilterPanel.css';

const FilterPanel = ({ filters, setFilters, availableParticipants }) => {
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="filter-panel">
      <div className="filter-header">
        <h3>필터링 옵션</h3>
      </div>
      
      <div className="filter-content">
        <div className="filter-group">
          <label className="filter-label">참가자 번호</label>
          <div className="participant-buttons">
            <button
              className={`participant-btn ${filters.participant === '' ? 'active' : ''}`}
              onClick={() => handleFilterChange('participant', '')}
            >
              전체
            </button>
            {availableParticipants.map(participant => (
              <button
                key={participant}
                className={`participant-btn ${filters.participant === participant ? 'active' : ''}`}
                onClick={() => handleFilterChange('participant', participant)}
              >
                {participant}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;