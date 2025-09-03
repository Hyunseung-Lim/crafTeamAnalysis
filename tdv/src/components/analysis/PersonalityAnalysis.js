import React from 'react';

const PersonalityAnalysis = ({ analysisData }) => {
  if (!analysisData || !analysisData.personalityData) return null;

  const personalityData = analysisData.personalityData;
  const totalUsers = personalityData.totalUsers;
  const totalAgents = personalityData.totalAgents;
  const totalProfiles = totalUsers + totalAgents;

  // 프로필 완성도
  const profileCompleteness = {
    agents: {
      total: personalityData.profileCompleteness.total,
      completed: personalityData.profileCompleteness.completed,
      fields: personalityData.fieldStats
    }
  };

  // 통계 계산 함수
  const calculateStats = (values) => {
    if (values.length === 0) return { avg: 0, min: 0, max: 0, stdev: 0 };
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
    const stdev = parseFloat(Math.sqrt(variance).toFixed(2));
    return {
      avg: parseFloat(avg.toFixed(1)),
      min,
      max,
      stdev
    };
  };

  // 나이 통계
  const ageStats = {
    total: calculateStats(personalityData.ageData)
  };

  // 성격/배경 통계 (간단한 형태로 변환)
  const personalityStats = {
    gender: {
      total: personalityData.genderStats
    },
    personality: Object.fromEntries(
      Object.entries(personalityData.personalityTypes).map(([key, value]) => [
        key, { total: value }
      ])
    ),
    education: Object.fromEntries(
      Object.entries(personalityData.educationLevels).map(([key, value]) => [
        key, { total: value }
      ])
    ),
    major: Object.fromEntries(
      Object.entries(personalityData.majorFields).map(([key, value]) => [
        key, { total: value }
      ])
    ),
    professional: Object.fromEntries(
      Object.entries(personalityData.professions).map(([key, value]) => [
        key, { total: value }
      ])
    ),
    skills: Object.fromEntries(
      Object.entries(personalityData.skills).map(([key, value]) => [
        key, { total: value }
      ])
    )
  };

  return (
    <div className="analysis-content">
      {/* 프로필 개요 */}
      <div className="analysis-section">
        <h3>👥 프로필 개요</h3>
        <div className="profile-overview">
          <div className="overview-stats">
            <div className="overview-card">
              <div className="overview-number">{totalProfiles}</div>
              <div className="overview-label">총 프로필 수</div>
              <div className="overview-breakdown">
                사용자 {totalUsers}명 + AI 에이전트 {totalAgents}명
              </div>
            </div>
            <div className="overview-card">
              <div className="overview-number">
                {totalAgents > 0 ? Math.round((profileCompleteness.agents.completed / totalAgents) * 100) : 0}%
              </div>
              <div className="overview-label">AI 에이전트 프로필 완성도</div>
              <div className="overview-breakdown">
                {profileCompleteness.agents.completed}명 / {totalAgents}명 완성
              </div>
            </div>
            <div className="overview-card">
              <div className="overview-number">
                {analysisData?.userProfileCompleteness?.percentage || 0}%
              </div>
              <div className="overview-label">사용자 프로필 완성도</div>
              <div className="overview-breakdown">
                {analysisData?.userProfileCompleteness?.completedUsers || 0}명 / {analysisData?.userProfileCompleteness?.totalUsers || 0}명 완성
              </div>
            </div>
          </div>
          
          <div className="field-completeness">
            <h4>📋 필드별 입력률 (AI 에이전트)</h4>
            <div className="field-stats">
              {Object.entries({
                name: '이름',
                age: '나이', 
                gender: '성별',
                personality: '성격',
                education: '학력',
                skills: '스킬',
                professional: '직업',
                preferences: '선호사항',
                dislikes: '싫어하는 것',
                workStyle: '업무 스타일'
              }).map(([field, fieldName]) => {
                const count = profileCompleteness.agents.fields[field] || 0;
                const percentage = totalAgents > 0 ? Math.round((count / totalAgents) * 100) : 0;
                return (
                  <div key={field} className="field-stat">
                    <span className="field-name">{fieldName}:</span>
                    <div className="field-bar">
                      <div className="field-fill" style={{ width: `${percentage}%` }}></div>
                    </div>
                    <span className="field-percentage">{percentage}% ({count}/{totalAgents})</span>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="field-completeness">
            <h4>📋 필드별 입력률 (사용자)</h4>
            <div className="field-stats">
              {Object.entries({
                name: '이름',
                age: '나이', 
                gender: '성별',
                nationality: '국적',
                major: '전공',
                education: '학력',
                professional: '직업',
                skills: '스킬',
                personality: '성격',
                workStyle: '업무 스타일',
                preferences: '선호사항',
                dislikes: '싫어하는 것'
              }).map(([field, fieldName]) => {
                const count = analysisData?.userProfileCompleteness?.fields?.[field] || 0;
                const totalUsers = analysisData?.userProfileCompleteness?.totalUsers || 0;
                const percentage = totalUsers > 0 ? Math.round((count / totalUsers) * 100) : 0;
                return (
                  <div key={field} className="field-stat">
                    <span className="field-name">{fieldName}:</span>
                    <div className="field-bar">
                      <div className="field-fill" style={{ width: `${percentage}%` }}></div>
                    </div>
                    <span className="field-percentage">{percentage}% ({count}/{totalUsers})</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 나이 분석 */}
      <div className="analysis-section">
        <h3>👶 연령 분석 (AI 에이전트)</h3>
        {personalityData.ageData.length > 0 ? (
          <>
            <p className="section-description">
              AI 에이전트들의 연령 분포를 막대그래프로 표시합니다. 
              평균: {ageStats.total.avg}세, 범위: {ageStats.total.min}~{ageStats.total.max}세
            </p>
            <div className="age-bar-chart">
              {(() => {
                // 연령대별로 그룹핑 (5세 단위)
                const ageGroups = {};
                personalityData.ageData.forEach(age => {
                  const group = Math.floor(age / 5) * 5;
                  const groupLabel = `${group}-${group + 4}세`;
                  ageGroups[groupLabel] = (ageGroups[groupLabel] || 0) + 1;
                });
                
                const noAgeData = totalAgents - personalityData.ageData.length;
                if (noAgeData > 0) {
                  ageGroups['선택 안됨'] = noAgeData;
                }
                
                const ageEntries = Object.entries(ageGroups).sort(([a], [b]) => {
                  if (a === '선택 안됨') return 1;
                  if (b === '선택 안됨') return -1;
                  return parseInt(a) - parseInt(b);
                });
                
                const maxValue = Math.max(...ageEntries.map(([, count]) => count));
                
                return (
                  <svg width="800" height="400" className="age-bar-svg">
                    {ageEntries.map(([ageGroup, count], index) => {
                      const barWidth = 80;
                      const barHeight = (count / maxValue) * 300;
                      const x = 100 + index * 100;
                      const y = 350 - barHeight;
                      const color = ageGroup === '선택 안됨' ? '#DDD' : '#4A90E2';
                      
                      return (
                        <g key={ageGroup}>
                          <rect
                            x={x}
                            y={y}
                            width={barWidth}
                            height={barHeight}
                            fill={color}
                            stroke="#fff"
                            strokeWidth="2"
                            className="age-bar"
                          />
                          <text
                            x={x + barWidth / 2}
                            y={y - 12}
                            textAnchor="middle"
                            fontSize="14"
                            fontWeight="700"
                            fill="#2d3748"
                          >
                            {count}명
                          </text>
                          <text
                            x={x + barWidth / 2}
                            y={375}
                            textAnchor="middle"
                            fontSize="13"
                            fontWeight="600"
                            fill="#4a5568"
                          >
                            {ageGroup}
                          </text>
                        </g>
                      );
                    })}
                    {/* Y축 선 */}
                    <line x1="90" y1="50" x2="90" y2="350" stroke="#ddd" strokeWidth="1" />
                    {/* X축 선 */}
                    <line x1="90" y1="350" x2={90 + ageEntries.length * 100} y2="350" stroke="#ddd" strokeWidth="1" />
                  </svg>
                );
              })()}
            </div>
          </>
        ) : (
          <div className="no-data-message">
            <p>나이 정보가 입력된 AI 에이전트가 없습니다.</p>
            <small>AI 에이전트 프로필에 나이 정보를 입력하면 여기에서 연령 통계를 확인할 수 있습니다.</small>
          </div>
        )}
      </div>

      {/* 성별 분석 */}
      <div className="analysis-section">
        <h3>👫 성별 분석 (AI 에이전트)</h3>
        {(() => {
          const maleCount = personalityStats.gender.total.male;
          const femaleCount = personalityStats.gender.total.female;
          const totalWithGender = maleCount + femaleCount;
          const noGenderData = totalAgents - totalWithGender;
          
          if (totalWithGender > 0 || noGenderData > 0) {
            const chartData = [
              ...(maleCount > 0 ? [['남성', maleCount]] : []),
              ...(femaleCount > 0 ? [['여성', femaleCount]] : []),
              ...(noGenderData > 0 ? [['선택 안됨', noGenderData]] : [])
            ];
            
            const colors = ['#4A90E2', '#F39C12', '#DDD'];
            let currentAngle = 0;
            const centerX = 150;
            const centerY = 150;
            const radius = 120;
            
            return (
              <>
                <p className="section-description">
                  AI 에이전트들의 성별 분포를 파이차트로 표시합니다.
                </p>
                <div className="gender-pie-chart">
                  <div className="pie-chart-container">
                    <svg width="300" height="300" className="gender-pie-svg">
                      {chartData.map(([gender, count], index) => {
                        const percentage = (count / totalAgents) * 100;
                        const angle = (count / totalAgents) * 360;
                        const startAngle = currentAngle;
                        const endAngle = currentAngle + angle;
                        
                        const x1 = centerX + radius * Math.cos((startAngle - 90) * Math.PI / 180);
                        const y1 = centerY + radius * Math.sin((startAngle - 90) * Math.PI / 180);
                        const x2 = centerX + radius * Math.cos((endAngle - 90) * Math.PI / 180);
                        const y2 = centerY + radius * Math.sin((endAngle - 90) * Math.PI / 180);
                        const largeArc = angle > 180 ? 1 : 0;
                        
                        const pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
                        
                        currentAngle += angle;
                        
                        return (
                          <path
                            key={gender}
                            d={pathData}
                            fill={colors[index]}
                            stroke="#fff"
                            strokeWidth="3"
                            className="gender-pie-slice"
                            title={`${gender}: ${count}명 (${percentage.toFixed(1)}%)`}
                          />
                        );
                      })}
                    </svg>
                    <div className="pie-legend">
                      {chartData.map(([gender, count], index) => {
                        const percentage = (count / totalAgents) * 100;
                        return (
                          <div key={gender} className="pie-legend-item">
                            <div 
                              className="legend-color" 
                              style={{ backgroundColor: colors[index] }}
                            />
                            <span className="legend-text">
                              {gender}: {count}명 ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            );
          } else {
            return (
              <div className="no-data-message">
                <p>성별 정보가 입력된 AI 에이전트가 없습니다.</p>
                <small>AI 에이전트 프로필에 성별 정보를 입력하면 여기에서 성별 분포를 확인할 수 있습니다.</small>
              </div>
            );
          }
        })()}
      </div>


      {/* 교육 수준 분석 */}
      <div className="analysis-section">
        <h3>🎓 교육 수준 분석 (AI 에이전트)</h3>
        {(() => {
          const educationEntries = Object.entries(personalityStats.education).sort(([,a], [,b]) => b.total - a.total);
          const totalWithEducation = educationEntries.reduce((sum, [, stats]) => sum + stats.total, 0);
          const noEducationData = totalAgents - totalWithEducation;
          
          if (totalWithEducation > 0) {
            // 파이 차트 데이터 준비 (선택 안됨 포함)
            const chartData = [
              ...educationEntries,
              ...(noEducationData > 0 ? [['선택 안됨', { total: noEducationData }]] : [])
            ];
            
            const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD', '#DDD'];
            let currentAngle = 0;
            const centerX = 175;
            const centerY = 175;
            const radius = 120;
            
            return (
              <>
                <p className="section-description">
                  AI 에이전트들의 교육 수준 분포를 통해 팀의 학습 배경과 전문성 수준을 파악할 수 있습니다.
                </p>
                <div className="education-pie-chart">
                  <div className="pie-chart-container">
                    <svg width="350" height="350" className="pie-chart-svg">
                      {chartData.map(([education, stats], index) => {
                        const percentage = (stats.total / totalAgents) * 100;
                        const angle = (stats.total / totalAgents) * 360;
                        const startAngle = currentAngle;
                        const endAngle = currentAngle + angle;
                        
                        const x1 = centerX + radius * Math.cos((startAngle - 90) * Math.PI / 180);
                        const y1 = centerY + radius * Math.sin((startAngle - 90) * Math.PI / 180);
                        const x2 = centerX + radius * Math.cos((endAngle - 90) * Math.PI / 180);
                        const y2 = centerY + radius * Math.sin((endAngle - 90) * Math.PI / 180);
                        const largeArc = angle > 180 ? 1 : 0;
                        
                        const pathData = `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
                        
                        currentAngle += angle;
                        
                        return (
                          <path
                            key={education}
                            d={pathData}
                            fill={colors[index % colors.length]}
                            stroke="#fff"
                            strokeWidth="2"
                            className="pie-slice"
                            title={`${education}: ${stats.total}명 (${percentage.toFixed(1)}%)`}
                          />
                        );
                      })}
                    </svg>
                    <div className="pie-legend">
                      {chartData.map(([education, stats], index) => {
                        const percentage = (stats.total / totalAgents) * 100;
                        return (
                          <div key={education} className="pie-legend-item">
                            <div 
                              className="legend-color" 
                              style={{ backgroundColor: colors[index % colors.length] }}
                            />
                            <span className="legend-text">
                              {education}: {stats.total}명 ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            );
          } else {
            return (
              <div className="no-data-message">
                <p>교육 수준 정보가 입력된 AI 에이전트가 없습니다.</p>
                <small>AI 에이전트 프로필에 학력 정보를 입력하면 여기에서 교육 수준별 분포를 확인할 수 있습니다.</small>
              </div>
            );
          }
        })()}
      </div>

      {/* 직업 분석 */}
      <div className="analysis-section">
        <h3>💼 직업 분석 (AI 에이전트)</h3>
        {(() => {
          const professionEntries = Object.entries(personalityStats.professional).sort(([,a], [,b]) => b.total - a.total);
          const totalWithProfession = professionEntries.reduce((sum, [, stats]) => sum + stats.total, 0);
          const noProfessionData = totalAgents - totalWithProfession;
          
          if (totalWithProfession > 0 || noProfessionData > 0) {
            // 도넛 차트 데이터 준비 (상위 7개 + 기타 + 선택 안됨)
            const topProfessions = professionEntries.slice(0, 7);
            const otherProfessions = professionEntries.slice(7);
            const otherTotal = otherProfessions.reduce((sum, [, stats]) => sum + stats.total, 0);
            
            const chartData = [
              ...topProfessions,
              ...(otherTotal > 0 ? [['기타', { total: otherTotal }]] : []),
              ...(noProfessionData > 0 ? [['선택 안됨', { total: noProfessionData }]] : [])
            ];
            
            const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD', '#DDD'];
            let currentAngle = 0;
            const centerX = 175;
            const centerY = 175;
            const outerRadius = 120;
            const innerRadius = 60;
            
            return (
              <>
                <p className="section-description">
                  AI 에이전트들의 직업 분포를 통해 팀의 전문 분야와 업무 경험의 다양성을 확인할 수 있습니다.
                </p>
                <div className="profession-donut-chart">
                  <div className="donut-chart-container">
                    <svg width="350" height="350" className="donut-chart-svg">
                      {chartData.map(([profession, stats], index) => {
                        const percentage = (stats.total / totalAgents) * 100;
                        const angle = (stats.total / totalAgents) * 360;
                        const startAngle = currentAngle;
                        const endAngle = currentAngle + angle;
                        
                        const x1Outer = centerX + outerRadius * Math.cos((startAngle - 90) * Math.PI / 180);
                        const y1Outer = centerY + outerRadius * Math.sin((startAngle - 90) * Math.PI / 180);
                        const x2Outer = centerX + outerRadius * Math.cos((endAngle - 90) * Math.PI / 180);
                        const y2Outer = centerY + outerRadius * Math.sin((endAngle - 90) * Math.PI / 180);
                        
                        const x1Inner = centerX + innerRadius * Math.cos((startAngle - 90) * Math.PI / 180);
                        const y1Inner = centerY + innerRadius * Math.sin((startAngle - 90) * Math.PI / 180);
                        const x2Inner = centerX + innerRadius * Math.cos((endAngle - 90) * Math.PI / 180);
                        const y2Inner = centerY + innerRadius * Math.sin((endAngle - 90) * Math.PI / 180);
                        
                        const largeArc = angle > 180 ? 1 : 0;
                        
                        const pathData = `M ${x1Outer} ${y1Outer} A ${outerRadius} ${outerRadius} 0 ${largeArc} 1 ${x2Outer} ${y2Outer} L ${x2Inner} ${y2Inner} A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x1Inner} ${y1Inner} Z`;
                        
                        currentAngle += angle;
                        
                        return (
                          <path
                            key={profession}
                            d={pathData}
                            fill={colors[index % colors.length]}
                            stroke="#fff"
                            strokeWidth="2"
                            className="donut-slice"
                            title={`${profession}: ${stats.total}명 (${percentage.toFixed(1)}%)`}
                          />
                        );
                      })}
                      {/* 중앙 텍스트 */}
                      <text x={centerX} y={centerY - 5} textAnchor="middle" className="donut-center-text">
                        <tspan x={centerX} dy="0" fontSize="14" fontWeight="600">총 {totalAgents}명</tspan>
                        <tspan x={centerX} dy="15" fontSize="12" fill="#666">AI 에이전트</tspan>
                      </text>
                    </svg>
                    <div className="donut-legend">
                      {chartData.map(([profession, stats], index) => {
                        const percentage = (stats.total / totalAgents) * 100;
                        return (
                          <div key={profession} className="donut-legend-item">
                            <div 
                              className="legend-color" 
                              style={{ backgroundColor: colors[index % colors.length] }}
                            />
                            <span className="legend-text">
                              {profession}: {stats.total}명 ({percentage.toFixed(1)}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            );
          } else {
            return (
              <div className="no-data-message">
                <p>직업 정보가 입력된 AI 에이전트가 없습니다.</p>
                <small>AI 에이전트 프로필에 직업 정보를 입력하면 여기에서 직업별 분포를 확인할 수 있습니다.</small>
              </div>
            );
          }
        })()}
      </div>


      {/* 스킬 분석 */}
      <div className="analysis-section">
        <h3>💻 스킬 분석 (AI 에이전트)</h3>
        {Object.keys(personalityStats.skills).length > 0 ? (
          <>
            <p className="section-description">
              AI 에이전트들이 보유한 모든 스킬을 워드 클라우드 형태로 표시합니다. 
              스킬 크기는 보유 인원수에 비례하며, 클릭하면 상세 정보를 확인할 수 있습니다.
            </p>
            <div className="skills-word-cloud">
              {(() => {
                const skillEntries = Object.entries(personalityStats.skills)
                  .sort(([,a], [,b]) => b.total - a.total);
                
                const maxValue = Math.max(...skillEntries.map(([, stats]) => stats.total));
                const minValue = Math.min(...skillEntries.map(([, stats]) => stats.total));
                
                return (
                  <div className="word-cloud-container">
                    {skillEntries.map(([skill, stats], index) => {
                      // 크기 계산 (12px ~ 32px)
                      const normalizedSize = maxValue > minValue ? 
                        ((stats.total - minValue) / (maxValue - minValue)) : 0.5;
                      const fontSize = Math.round(12 + (normalizedSize * 20));
                      
                      // 색상 강도 계산
                      const color = `rgba(74, 144, 226, ${0.6 + (normalizedSize * 0.4)})`;
                      
                      return (
                        <span
                          key={skill}
                          className="skill-word"
                          style={{
                            fontSize: `${fontSize}px`,
                            color: color,
                            fontWeight: Math.round(400 + (normalizedSize * 300)),
                            margin: '4px 8px',
                            display: 'inline-block',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          title={`${skill}: ${stats.total}명 (${((stats.total / totalAgents) * 100).toFixed(1)}%)`}
                          onMouseEnter={(e) => {
                            e.target.style.transform = 'scale(1.1)';
                            e.target.style.textShadow = '2px 2px 4px rgba(0,0,0,0.3)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.transform = 'scale(1)';
                            e.target.style.textShadow = 'none';
                          }}
                        >
                          {skill}
                        </span>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
            
            {/* 상위 스킬 요약 */}
            <div className="skills-summary">
              <h4>📈 상위 보유 스킬 TOP 10</h4>
              <div className="top-skills-list">
                {Object.entries(personalityStats.skills)
                  .sort(([,a], [,b]) => b.total - a.total)
                  .slice(0, 10)
                  .map(([skill, stats], index) => {
                    const percentage = ((stats.total / totalAgents) * 100).toFixed(1);
                    return (
                      <div key={skill} className="top-skill-item">
                        <span className="skill-rank">#{index + 1}</span>
                        <span className="skill-name">{skill}</span>
                        <span className="skill-count">{stats.total}명 ({percentage}%)</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </>
        ) : (
          <div className="no-data-message">
            <p>스킬 정보가 입력된 AI 에이전트가 없습니다.</p>
            <small>AI 에이전트 프로필에 스킬 정보를 입력하면 여기에서 보유 스킬별 분포를 확인할 수 있습니다.</small>
          </div>
        )}
      </div>

    </div>
  );
};

export default PersonalityAnalysis;