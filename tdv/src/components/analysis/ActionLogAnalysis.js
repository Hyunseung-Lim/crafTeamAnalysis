import React from 'react';
import ActivityStatsDisplay from '../common/ActivityStatsDisplay';
import { calculateTeamActivityStats, generateStatsSummary } from '../../utils/teamDataCalculator';

const ActionLogAnalysis = ({ teams, analysisData }) => {
  if (!teams || teams.length === 0 || !analysisData) {
    return <div>데이터를 로딩 중입니다...</div>;
  }

  // ResultAnalysis.js와 동일한 방식으로 팀 데이터 분리
  const team1Data = teams.filter(team => {
    const teamName = team.team_info?.teamName || team.team_info?.name || '';
    return teamName.includes('1') || teamName.toLowerCase().includes('team 1');
  });
  
  const team2Data = teams.filter(team => {
    const teamName = team.team_info?.teamName || team.team_info?.name || '';
    return teamName.includes('2') || teamName.toLowerCase().includes('team 2');
  });
  
  const team3Data = teams.filter(team => {
    const teamName = team.team_info?.teamName || team.team_info?.name || '';
    return teamName.includes('3') || teamName.toLowerCase().includes('team 3');
  });

  // 개별 팀별 통계 계산 (정확한 아이디어 개수 사용)
  const calculateCorrectStats = (teamData) => {
    let ideaGeneration = 0;
    let evaluation = 0;
    let feedback = 0;
    let request = 0;

    teamData.forEach(team => {
      // 실제 아이디어 개수
      ideaGeneration += team.ideas?.length || 0;
      
      // 실제 평가 개수
      if (team.ideas) {
        team.ideas.forEach(ideaString => {
          try {
            let idea = typeof ideaString === 'string' ? JSON.parse(ideaString) : ideaString;
            let evaluations = idea.evaluations;
            if (typeof evaluations === 'string') {
              evaluations = JSON.parse(evaluations);
            }
            if (Array.isArray(evaluations)) {
              evaluation += evaluations.length;
            }
          } catch (e) {
            // 파싱 실패 무시
          }
        });
      }
      
      // 실제 피드백 개수
      if (team.chat) {
        team.chat.forEach(chatItem => {
          try {
            let messageData = typeof chatItem === 'string' ? JSON.parse(chatItem) : chatItem;
            if (messageData.type === 'feedback_session_summary') {
              feedback++;
            }
          } catch (e) {
            // 파싱 실패 무시
          }
        });
      }
      
      // 실제 요청 개수
      if (team.chat) {
        team.chat.forEach(chatItem => {
          try {
            let messageData = typeof chatItem === 'string' ? JSON.parse(chatItem) : chatItem;
            if (messageData.type === 'make_request') {
              request++;
            }
          } catch (e) {
            // 파싱 실패 무시
          }
        });
      }
    });

    return { ideaGeneration, evaluation, feedback, request };
  };

  const team1Stats = calculateCorrectStats(team1Data);
  const team2Stats = calculateCorrectStats(team2Data);
  const team3Stats = calculateCorrectStats(team3Data);

  const actionStats = {
    team1: team1Stats,
    team2: team2Stats,
    team3: team3Stats,
    total: {
      ideaGeneration: team1Stats.ideaGeneration + team2Stats.ideaGeneration + team3Stats.ideaGeneration,
      evaluation: team1Stats.evaluation + team2Stats.evaluation + team3Stats.evaluation,
      feedback: team1Stats.feedback + team2Stats.feedback + team3Stats.feedback,
      request: team1Stats.request + team2Stats.request + team3Stats.request
    }
  };

  const statsSummary = generateStatsSummary(actionStats);
  
  // 디버깅용 로그
  console.log('ActionLogAnalysis - Teams data:', teams);
  console.log('ActionLogAnalysis - Action stats:', actionStats);
  console.log('ActionLogAnalysis - Stats summary:', statsSummary);

  return (
    <div>
      <ActivityStatsDisplay 
        stats={actionStats}
        title="📈 행동 로그 분석"
        showTeamBreakdown={true}
        showComparison={true}
        showInsights={true}
      />
    </div>
  );
};

export default ActionLogAnalysis;