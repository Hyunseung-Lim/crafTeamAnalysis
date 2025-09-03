import React, { useState } from 'react';
import './AnalysisReport.css';
import { useAnalysisData } from '../hooks/useAnalysisData';
import StructureAnalysis from './analysis/StructureAnalysis';
import RolesAnalysis from './analysis/RolesAnalysis';
import PersonalityAnalysis from './analysis/PersonalityAnalysis';
import MentalModelAnalysis from './analysis/MentalModelAnalysis';
import CharacterTypeAnalysis from './analysis/CharacterTypeAnalysis';
import ResultAnalysis from './analysis/ResultAnalysis';

const AnalysisReportClean = ({ teams }) => {
  const [activeTab, setActiveTab] = useState('structure');
  const analysisData = useAnalysisData(teams);

  if (!analysisData) {
    return <div>데이터를 로딩 중입니다...</div>;
  }

  return (
    <div className="analysis-report">
      <div className="report-header">
        <h2>📊 팀 협업 데이터 분석 리포트</h2>
        <p>총 {analysisData.totalParticipants}명의 참가자, {analysisData.totalTeams}개 팀 분석</p>
      </div>

      <div className="analysis-tabs">
        <button 
          className={`tab-button ${activeTab === 'structure' ? 'active' : ''}`}
          onClick={() => setActiveTab('structure')}
        >
          📊 팀 크기 및 구조
        </button>
        <button 
          className={`tab-button ${activeTab === 'roles' ? 'active' : ''}`}
          onClick={() => setActiveTab('roles')}
        >
          🎭 역할 분담
        </button>
        <button 
          className={`tab-button ${activeTab === 'personality' ? 'active' : ''}`}
          onClick={() => setActiveTab('personality')}
        >
          🧠 성격 및 배경
        </button>
        <button 
          className={`tab-button ${activeTab === 'character-type' ? 'active' : ''}`}
          onClick={() => setActiveTab('character-type')}
        >
          🎭 캐릭터 유형
        </button>
        <button 
          className={`tab-button ${activeTab === 'mental-model' ? 'active' : ''}`}
          onClick={() => setActiveTab('mental-model')}
        >
          💭 멘탈 모델 변화
        </button>
        <button 
          className={`tab-button ${activeTab === 'result' ? 'active' : ''}`}
          onClick={() => setActiveTab('result')}
        >
          🎯 아이디에이션 결과
        </button>
      </div>

      <div className="analysis-tab-content">
        {activeTab === 'structure' && <StructureAnalysis analysisData={analysisData} />}
        {activeTab === 'roles' && <RolesAnalysis analysisData={analysisData} />}
        {activeTab === 'personality' && <PersonalityAnalysis analysisData={analysisData} />}
        {activeTab === 'character-type' && <CharacterTypeAnalysis teams={teams} />}
        {activeTab === 'mental-model' && <MentalModelAnalysis analysisData={analysisData} />}
        {activeTab === 'result' && <ResultAnalysis teams={teams} analysisData={analysisData} />}
      </div>
    </div>
  );
};

export default AnalysisReportClean;