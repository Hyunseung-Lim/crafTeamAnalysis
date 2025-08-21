import React, { useState } from 'react';

const TestTabs = () => {
  const [activeTab, setActiveTab] = useState('structure');

  return (
    <div className="analysis-report">
      <div className="report-header">
        <h2>Test Tabs</h2>
        <div className="analysis-tabs">
          <button 
            className={`tab-button ${activeTab === 'structure' ? 'active' : ''}`}
            onClick={() => setActiveTab('structure')}
          >
            Structure
          </button>
          <button 
            className={`tab-button ${activeTab === 'roles' ? 'active' : ''}`}
            onClick={() => setActiveTab('roles')}
          >
            Roles
          </button>
        </div>
      </div>

      <div className="analysis-content">
        {activeTab === 'structure' && (
          <div>Structure content here</div>
        )}

        {activeTab === 'roles' && (
          <div>Roles content here</div>
        )}
      </div>
    </div>
  );
};

export default TestTabs;