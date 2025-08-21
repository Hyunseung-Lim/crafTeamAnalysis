import React, { useState } from 'react';
import './AnalysisReport.css';

const AnalysisReportFixed = ({ teams }) => {
  const [activeTab, setActiveTab] = useState('structure');

  if (!teams || teams.length === 0) {
    return <div>데이터를 로딩 중입니다...</div>;
  }

  return (
    <div className="analysis-report">
      <div className="report-header">
        <h2>📊 팀 데이터 분석 리포트</h2>
        <p className="report-subtitle">structured_teams.json 데이터 기반 종합 분석</p>
        
        <div className="analysis-tabs">
          <button 
            className={`tab-button ${activeTab === 'structure' ? 'active' : ''}`}
            onClick={() => setActiveTab('structure')}
          >
            🏗️ 팀 크기 및 구조 분석
          </button>
          <button 
            className={`tab-button ${activeTab === 'roles' ? 'active' : ''}`}
            onClick={() => setActiveTab('roles')}
          >
            👥 역할 분담 분석
          </button>
        </div>
      </div>

      <div className="analysis-content">
        {activeTab === 'structure' && (
          <div className="analysis-grid structure-tab">
            <div className="analysis-section">
              <h3>🏗️ 팀 구조 분석</h3>
              <p>팀 크기 및 구조 관련 분석 내용이 여기에 표시됩니다.</p>
              <p>총 {teams.length}개 팀의 데이터를 분석했습니다.</p>
            </div>
          </div>
        )}

        {activeTab === 'roles' && (
          <div className="analysis-grid roles-tab">
            <div className="analysis-section">
              <h3>👥 역할 분담 분석</h3>
              <p>역할 분담 관련 분석 내용이 여기에 표시됩니다.</p>
              <p>다양한 역할별 분석 결과를 확인할 수 있습니다.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisReportFixed;