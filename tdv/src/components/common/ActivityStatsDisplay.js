import React from 'react';
import '../AnalysisReport.css';

/**
 * 활동 통계를 일관된 방식으로 표시하는 공통 컴포넌트
 */
const ActivityStatsDisplay = ({ 
  stats, 
  title = "📈 활동 통계", 
  showTeamBreakdown = true,
  showComparison = true,
  showInsights = true 
}) => {
  if (!stats) return null;

  // 차트 데이터 생성
  const createChartData = (teamStats) => {
    return [
      { name: '아이디어 생성', value: teamStats.ideaGeneration, color: '#4CAF50' },
      { name: '평가', value: teamStats.evaluation, color: '#2196F3' },
      { name: '피드백', value: teamStats.feedback, color: '#FF9800' },
      { name: '요청', value: teamStats.request, color: '#9C27B0' }
    ];
  };

  // 팀별 비교 차트 데이터
  const createTeamComparisonData = () => {
    const actions = ['ideaGeneration', 'evaluation', 'feedback', 'request'];
    const actionNames = ['아이디어 생성', '평가', '피드백', '요청'];
    const colors = ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0'];

    return actions.map((action, index) => ({
      name: actionNames[index],
      color: colors[index],
      team1: stats.team1[action],
      team2: stats.team2[action],
      team3: stats.team3[action]
    }));
  };

  const chartData = {
    total: createChartData(stats.total),
    team1: createChartData(stats.team1),
    team2: createChartData(stats.team2),
    team3: createChartData(stats.team3)
  };

  const comparisonData = createTeamComparisonData();

  return (
    <div className="activity-stats-display">
      <div className="analysis-header">
        <h2>{title}</h2>
        <p>팀별 아이디어 생성, 평가, 피드백, 요청 활동 통계</p>
      </div>

      {/* 전체 통계 */}
      <div className="stats-section">
        <h3>📊 전체 통계</h3>
        <div className="stats-cards">
          {chartData.total.map((item, index) => (
            <div key={index} className="stat-card" style={{ borderColor: item.color }}>
              <div className="activity-stats-display-stat-value" style={{ color: item.color }}>
                {item.value}
              </div>
              <div className="activity-stats-display-stat-label">{item.name}</div>
            </div>
          ))}
        </div>

        {/* 전체 차트 */}
        <div className="chart-container">
          <h4>전체 활동 분포</h4>
          <div className="bar-chart">
            {chartData.total.map((item, index) => {
              const maxValue = Math.max(...chartData.total.map(d => d.value));
              const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
              
              return (
                <div key={index} className="bar-item">
                  <div className="bar-label">{item.name}</div>
                  <div className="bar-container">
                    <div 
                      className="bar-fill"
                      style={{ 
                        width: `${percentage}%`, 
                        backgroundColor: item.color 
                      }}
                    />
                    <span className="bar-value">{item.value}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 팀별 상세 통계 */}
      {showTeamBreakdown && (
        <div className="team-stats-section">
          <h3>🏢 팀별 상세 통계</h3>
          
          <div className="team-stats-grid">
            {['team1', 'team2', 'team3'].map(teamKey => (
              <div key={teamKey} className="team-stat-card">
                <h4>팀 {teamKey.charAt(4)}</h4>
                
                <div className="team-summary">
                  {chartData[teamKey].map((item, index) => (
                    <div key={index} className="team-stat-item">
                      <span 
                        className="stat-dot" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="stat-name">{item.name}</span>
                      <span className="stat-count">{item.value}</span>
                    </div>
                  ))}
                </div>

                <div className="team-chart">
                  {chartData[teamKey].map((item, index) => {
                    const teamMax = Math.max(...chartData[teamKey].map(d => d.value));
                    const percentage = teamMax > 0 ? (item.value / teamMax) * 100 : 0;
                    
                    return (
                      <div key={index} className="mini-bar">
                        <div 
                          className="mini-bar-fill"
                          style={{ 
                            width: `${percentage}%`, 
                            backgroundColor: item.color 
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 팀간 비교 */}
      {showComparison && (
        <div className="team-comparison-section">
          <h3>⚖️ 팀간 활동 비교</h3>
          
          <div className="comparison-chart-row">
            {comparisonData.map((activity, index) => (
              <div key={index} className="comparison-item-compact">
                <h4 style={{ color: activity.color }}>{activity.name}</h4>
                
                <div className="comparison-bars">
                  {['team1', 'team2', 'team3'].map(teamKey => {
                    const maxValue = Math.max(activity.team1, activity.team2, activity.team3);
                    const value = activity[teamKey];
                    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
                    
                    return (
                      <div key={teamKey} className="comparison-bar-item">
                        <div className="team-label">팀 {teamKey.charAt(4)}</div>
                        <div className="comparison-bar-container">
                          <div 
                            className="comparison-bar-fill"
                            style={{ 
                              width: `${percentage}%`, 
                              backgroundColor: activity.color 
                            }}
                          />
                          <span className="comparison-value">{value}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default ActivityStatsDisplay;