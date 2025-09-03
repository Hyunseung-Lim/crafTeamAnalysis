import React from 'react';

const RolesAnalysis = ({ analysisData }) => {
  if (!analysisData) return null;

  // 안전한 데이터 접근을 위한 헬퍼 함수
  const safeGet = (path, defaultValue = '0.00') => {
    try {
      return path || defaultValue;
    } catch (e) {
      return defaultValue;
    }
  };

  return (
    <div className="analysis-content">
      {/* 1. 아이디어 생성 역할 분석 */}
      <div className="analysis-section">
        <h2>💡 아이디어 생성 역할 분석</h2>
        
        <div className="role-analysis-layout">
          <div className="role-stats-section">
            <h4>🤖 담당 에이전트 통계</h4>
            <p>아이디어 생성 역할을 맡은 AI 에이전트 수</p>
            <div className="team-stats-table">
              <div className="stats-header">
                <div className="stat-label">구분</div>
                <div className="stat-value">평균</div>
                <div className="stat-value">최소</div>
                <div className="stat-value">최대</div>
                <div className="stat-value">표준편차</div>
              </div>
              <div className="stats-row">
                <div className="stat-label">첫번째 팀</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team1?.generation?.avg)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team1?.generation?.min)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team1?.generation?.max)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team1?.generation?.stdev)}</div>
              </div>
              <div className="stats-row">
                <div className="stat-label">두번째 팀</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team2?.generation?.avg)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team2?.generation?.min)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team2?.generation?.max)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team2?.generation?.stdev)}</div>
              </div>
              <div className="stats-row">
                <div className="stat-label">세번째 팀</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team3?.generation?.avg)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team3?.generation?.min)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team3?.generation?.max)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team3?.generation?.stdev)}</div>
              </div>
              <div className="stats-row total-row">
                <div className="stat-label">전체</div>
                <div className="stat-value">{safeGet(analysisData.roles?.total?.generation?.avg)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.total?.generation?.min)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.total?.generation?.max)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.total?.generation?.stdev)}</div>
              </div>
            </div>
          </div>
          <div className="role-performance-section">
            <h4>📊 실제 아이디어 생성량 (에이전트당)</h4>
            <p>아이디어 생성 역할을 맡은 에이전트가 실제로 생성한 아이디어 수</p>
            <div className="team-stats-table">
              <div className="stats-header">
                <div className="stat-label">구분</div>
                <div className="stat-value">평균</div>
                <div className="stat-value">최소</div>
                <div className="stat-value">최대</div>
                <div className="stat-value">표준편차</div>
              </div>
              <div className="stats-row">
                <div className="stat-label">첫번째 팀</div>
                <div className="stat-value">{safeGet(analysisData.ideaPerAgent?.team1?.avg)}개</div>
                <div className="stat-value">{safeGet(analysisData.ideaPerAgent?.team1?.min)}개</div>
                <div className="stat-value">{safeGet(analysisData.ideaPerAgent?.team1?.max)}개</div>
                <div className="stat-value">{safeGet(analysisData.ideaPerAgent?.team1?.stdev)}</div>
              </div>
              <div className="stats-row">
                <div className="stat-label">두번째 팀</div>
                <div className="stat-value">{safeGet(analysisData.ideaPerAgent?.team2?.avg)}개</div>
                <div className="stat-value">{safeGet(analysisData.ideaPerAgent?.team2?.min)}개</div>
                <div className="stat-value">{safeGet(analysisData.ideaPerAgent?.team2?.max)}개</div>
                <div className="stat-value">{safeGet(analysisData.ideaPerAgent?.team2?.stdev)}</div>
              </div>
              <div className="stats-row">
                <div className="stat-label">세번째 팀</div>
                <div className="stat-value">{safeGet(analysisData.ideaPerAgent?.team3?.avg)}개</div>
                <div className="stat-value">{safeGet(analysisData.ideaPerAgent?.team3?.min)}개</div>
                <div className="stat-value">{safeGet(analysisData.ideaPerAgent?.team3?.max)}개</div>
                <div className="stat-value">{safeGet(analysisData.ideaPerAgent?.team3?.stdev)}</div>
              </div>
              <div className="stats-row total-row">
                <div className="stat-label">전체</div>
                <div className="stat-value">{safeGet(analysisData.ideaPerAgent?.total?.avg)}개</div>
                <div className="stat-value">{safeGet(analysisData.ideaPerAgent?.total?.min)}개</div>
                <div className="stat-value">{safeGet(analysisData.ideaPerAgent?.total?.max)}개</div>
                <div className="stat-value">{safeGet(analysisData.ideaPerAgent?.total?.stdev)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="user-activity-section">
          <h4>👤 사용자 아이디어 생성 활동</h4>
          <div className="team-stats-table">
            <div className="stats-header">
              <div className="stat-label">구분</div>
              <div className="stat-value">평균</div>
              <div className="stat-value">최소</div>
              <div className="stat-value">최대</div>
              <div className="stat-value">표준편차</div>
            </div>
            <div className="stats-row">
              <div className="stat-label">첫번째 팀</div>
              <div className="stat-value">{safeGet(analysisData.userIdeas?.team1?.avg)}개</div>
              <div className="stat-value">{safeGet(analysisData.userIdeas?.team1?.min)}개</div>
              <div className="stat-value">{safeGet(analysisData.userIdeas?.team1?.max)}개</div>
              <div className="stat-value">{safeGet(analysisData.userIdeas?.team1?.stdev)}</div>
            </div>
            <div className="stats-row">
              <div className="stat-label">두번째 팀</div>
              <div className="stat-value">{safeGet(analysisData.userIdeas?.team2?.avg)}개</div>
              <div className="stat-value">{safeGet(analysisData.userIdeas?.team2?.min)}개</div>
              <div className="stat-value">{safeGet(analysisData.userIdeas?.team2?.max)}개</div>
              <div className="stat-value">{safeGet(analysisData.userIdeas?.team2?.stdev)}</div>
            </div>
            <div className="stats-row">
              <div className="stat-label">세번째 팀</div>
              <div className="stat-value">{safeGet(analysisData.userIdeas?.team3?.avg)}개</div>
              <div className="stat-value">{safeGet(analysisData.userIdeas?.team3?.min)}개</div>
              <div className="stat-value">{safeGet(analysisData.userIdeas?.team3?.max)}개</div>
              <div className="stat-value">{safeGet(analysisData.userIdeas?.team3?.stdev)}</div>
            </div>
            <div className="stats-row total-row">
              <div className="stat-label">전체</div>
              <div className="stat-value">{safeGet(analysisData.userIdeas?.total?.avg)}개</div>
              <div className="stat-value">{safeGet(analysisData.userIdeas?.total?.min)}개</div>
              <div className="stat-value">{safeGet(analysisData.userIdeas?.total?.max)}개</div>
              <div className="stat-value">{safeGet(analysisData.userIdeas?.total?.stdev)}</div>
            </div>
          </div>

        </div>
      </div>

      {/* 2. 아이디어 평가 역할 분석 */}
      <div className="analysis-section">
        <h2>🔍 아이디어 평가 역할 분석</h2>
        
        <div className="role-analysis-layout">
          <div className="role-stats-section">
            <h4>🤖 담당 에이전트 통계</h4>
            <p>아이디어 평가 역할을 맡은 AI 에이전트 수</p>
            <div className="team-stats-table">
              <div className="stats-header">
                <div className="stat-label">구분</div>
                <div className="stat-value">평균</div>
                <div className="stat-value">최소</div>
                <div className="stat-value">최대</div>
                <div className="stat-value">표준편차</div>
              </div>
              <div className="stats-row">
                <div className="stat-label">첫번째 팀</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team1?.evaluation?.avg)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team1?.evaluation?.min)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team1?.evaluation?.max)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team1?.evaluation?.stdev)}</div>
              </div>
              <div className="stats-row">
                <div className="stat-label">두번째 팀</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team2?.evaluation?.avg)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team2?.evaluation?.min)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team2?.evaluation?.max)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team2?.evaluation?.stdev)}</div>
              </div>
              <div className="stats-row">
                <div className="stat-label">세번째 팀</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team3?.evaluation?.avg)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team3?.evaluation?.min)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team3?.evaluation?.max)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team3?.evaluation?.stdev)}</div>
              </div>
              <div className="stats-row total-row">
                <div className="stat-label">전체</div>
                <div className="stat-value">{safeGet(analysisData.roles?.total?.evaluation?.avg)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.total?.evaluation?.min)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.total?.evaluation?.max)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.total?.evaluation?.stdev)}</div>
              </div>
            </div>
          </div>
          <div className="role-performance-section">
            <h4>📊 실제 평가 수행량 (에이전트당)</h4>
            <p>평가 역할을 맡은 에이전트가 실제로 수행한 평가 수</p>
            <div className="team-stats-table">
              <div className="stats-header">
                <div className="stat-label">구분</div>
                <div className="stat-value">평균</div>
                <div className="stat-value">최소</div>
                <div className="stat-value">최대</div>
                <div className="stat-value">표준편차</div>
              </div>
              <div className="stats-row">
                <div className="stat-label">첫번째 팀</div>
                <div className="stat-value">{safeGet(analysisData.evaluationPerAgent?.team1?.avg)}개</div>
                <div className="stat-value">{safeGet(analysisData.evaluationPerAgent?.team1?.min)}개</div>
                <div className="stat-value">{safeGet(analysisData.evaluationPerAgent?.team1?.max)}개</div>
                <div className="stat-value">{safeGet(analysisData.evaluationPerAgent?.team1?.stdev)}</div>
              </div>
              <div className="stats-row">
                <div className="stat-label">두번째 팀</div>
                <div className="stat-value">{safeGet(analysisData.evaluationPerAgent?.team2?.avg)}개</div>
                <div className="stat-value">{safeGet(analysisData.evaluationPerAgent?.team2?.min)}개</div>
                <div className="stat-value">{safeGet(analysisData.evaluationPerAgent?.team2?.max)}개</div>
                <div className="stat-value">{safeGet(analysisData.evaluationPerAgent?.team2?.stdev)}</div>
              </div>
              <div className="stats-row">
                <div className="stat-label">세번째 팀</div>
                <div className="stat-value">{safeGet(analysisData.evaluationPerAgent?.team3?.avg)}개</div>
                <div className="stat-value">{safeGet(analysisData.evaluationPerAgent?.team3?.min)}개</div>
                <div className="stat-value">{safeGet(analysisData.evaluationPerAgent?.team3?.max)}개</div>
                <div className="stat-value">{safeGet(analysisData.evaluationPerAgent?.team3?.stdev)}</div>
              </div>
              <div className="stats-row total-row">
                <div className="stat-label">전체</div>
                <div className="stat-value">{safeGet(analysisData.evaluationPerAgent?.total?.avg)}개</div>
                <div className="stat-value">{safeGet(analysisData.evaluationPerAgent?.total?.min)}개</div>
                <div className="stat-value">{safeGet(analysisData.evaluationPerAgent?.total?.max)}개</div>
                <div className="stat-value">{safeGet(analysisData.evaluationPerAgent?.total?.stdev)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="user-activity-section">
          <h4>👤 사용자 평가 활동</h4>
          <div className="team-stats-table">
            <div className="stats-header">
              <div className="stat-label">구분</div>
              <div className="stat-value">평균</div>
              <div className="stat-value">최소</div>
              <div className="stat-value">최대</div>
              <div className="stat-value">표준편차</div>
            </div>
            <div className="stats-row">
              <div className="stat-label">첫번째 팀</div>
              <div className="stat-value">{safeGet(analysisData.userEvaluations?.team1?.avg)}개</div>
              <div className="stat-value">{safeGet(analysisData.userEvaluations?.team1?.min)}개</div>
              <div className="stat-value">{safeGet(analysisData.userEvaluations?.team1?.max)}개</div>
              <div className="stat-value">{safeGet(analysisData.userEvaluations?.team1?.stdev)}</div>
            </div>
            <div className="stats-row">
              <div className="stat-label">두번째 팀</div>
              <div className="stat-value">{safeGet(analysisData.userEvaluations?.team2?.avg)}개</div>
              <div className="stat-value">{safeGet(analysisData.userEvaluations?.team2?.min)}개</div>
              <div className="stat-value">{safeGet(analysisData.userEvaluations?.team2?.max)}개</div>
              <div className="stat-value">{safeGet(analysisData.userEvaluations?.team2?.stdev)}</div>
            </div>
            <div className="stats-row">
              <div className="stat-label">세번째 팀</div>
              <div className="stat-value">{safeGet(analysisData.userEvaluations?.team3?.avg)}개</div>
              <div className="stat-value">{safeGet(analysisData.userEvaluations?.team3?.min)}개</div>
              <div className="stat-value">{safeGet(analysisData.userEvaluations?.team3?.max)}개</div>
              <div className="stat-value">{safeGet(analysisData.userEvaluations?.team3?.stdev)}</div>
            </div>
            <div className="stats-row total-row">
              <div className="stat-label">전체</div>
              <div className="stat-value">{safeGet(analysisData.userEvaluations?.total?.avg)}개</div>
              <div className="stat-value">{safeGet(analysisData.userEvaluations?.total?.min)}개</div>
              <div className="stat-value">{safeGet(analysisData.userEvaluations?.total?.max)}개</div>
              <div className="stat-value">{safeGet(analysisData.userEvaluations?.total?.stdev)}</div>
            </div>
          </div>

        </div>
      </div>

      {/* 3. 피드백 역할 분석 */}
      <div className="analysis-section">
        <h2>💬 피드백 역할 분석</h2>
        
        <div className="role-analysis-layout">
          <div className="role-stats-section">
            <h4>🤖 담당 에이전트 통계</h4>
            <p>피드백 역할을 맡은 AI 에이전트 수</p>
            <div className="team-stats-table">
              <div className="stats-header">
                <div className="stat-label">구분</div>
                <div className="stat-value">평균</div>
                <div className="stat-value">최소</div>
                <div className="stat-value">최대</div>
                <div className="stat-value">표준편차</div>
              </div>
              <div className="stats-row">
                <div className="stat-label">첫번째 팀</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team1?.feedback?.avg)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team1?.feedback?.min)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team1?.feedback?.max)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team1?.feedback?.stdev)}</div>
              </div>
              <div className="stats-row">
                <div className="stat-label">두번째 팀</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team2?.feedback?.avg)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team2?.feedback?.min)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team2?.feedback?.max)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team2?.feedback?.stdev)}</div>
              </div>
              <div className="stats-row">
                <div className="stat-label">세번째 팀</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team3?.feedback?.avg)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team3?.feedback?.min)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team3?.feedback?.max)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team3?.feedback?.stdev)}</div>
              </div>
              <div className="stats-row total-row">
                <div className="stat-label">전체</div>
                <div className="stat-value">{safeGet(analysisData.roles?.total?.feedback?.avg)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.total?.feedback?.min)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.total?.feedback?.max)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.total?.feedback?.stdev)}</div>
              </div>
            </div>
          </div>
          <div className="role-performance-section">
            <h4>📊 실제 피드백 수행량 (에이전트당)</h4>
            <p>피드백 역할을 맡은 에이전트가 실제로 수행한 피드백 수</p>
            <div className="team-stats-table">
              <div className="stats-header">
                <div className="stat-label">구분</div>
                <div className="stat-value">평균</div>
                <div className="stat-value">최소</div>
                <div className="stat-value">최대</div>
                <div className="stat-value">표준편차</div>
              </div>
              <div className="stats-row">
                <div className="stat-label">첫번째 팀</div>
                <div className="stat-value">{safeGet(analysisData.feedbackPerAgent?.team1?.avg)}개</div>
                <div className="stat-value">{safeGet(analysisData.feedbackPerAgent?.team1?.min)}개</div>
                <div className="stat-value">{safeGet(analysisData.feedbackPerAgent?.team1?.max)}개</div>
                <div className="stat-value">{safeGet(analysisData.feedbackPerAgent?.team1?.stdev)}</div>
              </div>
              <div className="stats-row">
                <div className="stat-label">두번째 팀</div>
                <div className="stat-value">{safeGet(analysisData.feedbackPerAgent?.team2?.avg)}개</div>
                <div className="stat-value">{safeGet(analysisData.feedbackPerAgent?.team2?.min)}개</div>
                <div className="stat-value">{safeGet(analysisData.feedbackPerAgent?.team2?.max)}개</div>
                <div className="stat-value">{safeGet(analysisData.feedbackPerAgent?.team2?.stdev)}</div>
              </div>
              <div className="stats-row">
                <div className="stat-label">세번째 팀</div>
                <div className="stat-value">{safeGet(analysisData.feedbackPerAgent?.team3?.avg)}개</div>
                <div className="stat-value">{safeGet(analysisData.feedbackPerAgent?.team3?.min)}개</div>
                <div className="stat-value">{safeGet(analysisData.feedbackPerAgent?.team3?.max)}개</div>
                <div className="stat-value">{safeGet(analysisData.feedbackPerAgent?.team3?.stdev)}</div>
              </div>
              <div className="stats-row total-row">
                <div className="stat-label">전체</div>
                <div className="stat-value">{safeGet(analysisData.feedbackPerAgent?.total?.avg)}개</div>
                <div className="stat-value">{safeGet(analysisData.feedbackPerAgent?.total?.min)}개</div>
                <div className="stat-value">{safeGet(analysisData.feedbackPerAgent?.total?.max)}개</div>
                <div className="stat-value">{safeGet(analysisData.feedbackPerAgent?.total?.stdev)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="user-activity-section">
          <h4>👤 사용자 피드백 활동</h4>
          <div className="team-stats-table">
            <div className="stats-header">
              <div className="stat-label">구분</div>
              <div className="stat-value">평균</div>
              <div className="stat-value">최소</div>
              <div className="stat-value">최대</div>
              <div className="stat-value">표준편차</div>
            </div>
            <div className="stats-row">
              <div className="stat-label">첫번째 팀</div>
              <div className="stat-value">{safeGet(analysisData.userFeedbacks?.team1?.avg)}개</div>
              <div className="stat-value">{safeGet(analysisData.userFeedbacks?.team1?.min)}개</div>
              <div className="stat-value">{safeGet(analysisData.userFeedbacks?.team1?.max)}개</div>
              <div className="stat-value">{safeGet(analysisData.userFeedbacks?.team1?.stdev)}</div>
            </div>
            <div className="stats-row">
              <div className="stat-label">두번째 팀</div>
              <div className="stat-value">{safeGet(analysisData.userFeedbacks?.team2?.avg)}개</div>
              <div className="stat-value">{safeGet(analysisData.userFeedbacks?.team2?.min)}개</div>
              <div className="stat-value">{safeGet(analysisData.userFeedbacks?.team2?.max)}개</div>
              <div className="stat-value">{safeGet(analysisData.userFeedbacks?.team2?.stdev)}</div>
            </div>
            <div className="stats-row">
              <div className="stat-label">세번째 팀</div>
              <div className="stat-value">{safeGet(analysisData.userFeedbacks?.team3?.avg)}개</div>
              <div className="stat-value">{safeGet(analysisData.userFeedbacks?.team3?.min)}개</div>
              <div className="stat-value">{safeGet(analysisData.userFeedbacks?.team3?.max)}개</div>
              <div className="stat-value">{safeGet(analysisData.userFeedbacks?.team3?.stdev)}</div>
            </div>
            <div className="stats-row total-row">
              <div className="stat-label">전체</div>
              <div className="stat-value">{safeGet(analysisData.userFeedbacks?.total?.avg)}개</div>
              <div className="stat-value">{safeGet(analysisData.userFeedbacks?.total?.min)}개</div>
              <div className="stat-value">{safeGet(analysisData.userFeedbacks?.total?.max)}개</div>
              <div className="stat-value">{safeGet(analysisData.userFeedbacks?.total?.stdev)}</div>
            </div>
          </div>

        </div>

        {/* 상세 피드백 역할 분석 */}
        <details className="user-role-details">
          <summary>🔍 상세 피드백 역할 분석 보기</summary>
          <div className="user-role-analysis">
            <div className="role-summary">
              <p><strong>피드백 역할을 맡은 팀:</strong> {safeGet(analysisData.feedbackRoleAnalysis?.hasRoleCount, 0)}개 팀</p>
              <div className="role-breakdown">
                <div className="role-stat">✅ 역할도 있고 실제로도 피드백: {safeGet(analysisData.feedbackRoleAnalysis?.hasRoleAndDid, 0)}개 팀</div>
                <div className="role-stat">❌ 역할은 있지만 피드백하지 않음: {safeGet(analysisData.feedbackRoleAnalysis?.hasRoleButDidnt, 0)}개 팀</div>
                <div className="role-stat">📊 역할은 없지만 피드백함: {safeGet(analysisData.feedbackRoleAnalysis?.noRoleButDid, 0)}개 팀</div>
              </div>
            </div>
            
            <div className="role-details">
              <h5>사용자 피드백 활동 상세 분석</h5>
              <p>
                전체 {safeGet(analysisData.feedbackRoleAnalysis?.hasRoleCount, 0)}개 팀 중 {safeGet(analysisData.feedbackRoleAnalysis?.hasRoleAndDid, 0)}개 팀
                ({((safeGet(analysisData.feedbackRoleAnalysis?.hasRoleAndDid, 0) / Math.max(safeGet(analysisData.feedbackRoleAnalysis?.hasRoleCount, 1), 1)) * 100).toFixed(1)}%)에서 
                사용자가 피드백 역할을 맡고 실제로 피드백을 수행했습니다.
              </p>
            </div>
          </div>
        </details>
      </div>

      {/* 4. 요청 역할 분석 */}
      <div className="analysis-section">
        <h2>📝 요청 역할 분석</h2>
        
        <div className="role-analysis-layout">
          <div className="role-stats-section">
            <h4>🤖 담당 에이전트 통계</h4>
            <p>요청 역할을 맡은 AI 에이전트 수</p>
            <div className="team-stats-table">
              <div className="stats-header">
                <div className="stat-label">구분</div>
                <div className="stat-value">평균</div>
                <div className="stat-value">최소</div>
                <div className="stat-value">최대</div>
                <div className="stat-value">표준편차</div>
              </div>
              <div className="stats-row">
                <div className="stat-label">첫번째 팀</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team1?.request?.avg)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team1?.request?.min)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team1?.request?.max)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team1?.request?.stdev)}</div>
              </div>
              <div className="stats-row">
                <div className="stat-label">두번째 팀</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team2?.request?.avg)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team2?.request?.min)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team2?.request?.max)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team2?.request?.stdev)}</div>
              </div>
              <div className="stats-row">
                <div className="stat-label">세번째 팀</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team3?.request?.avg)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team3?.request?.min)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team3?.request?.max)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.team3?.request?.stdev)}</div>
              </div>
              <div className="stats-row total-row">
                <div className="stat-label">전체</div>
                <div className="stat-value">{safeGet(analysisData.roles?.total?.request?.avg)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.total?.request?.min)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.total?.request?.max)}개</div>
                <div className="stat-value">{safeGet(analysisData.roles?.total?.request?.stdev)}</div>
              </div>
            </div>
          </div>
          <div className="role-performance-section">
            <h4>📊 실제 요청 수행량 (에이전트당)</h4>
            <p>요청 역할을 맡은 에이전트가 실제로 수행한 요청 수</p>
            <div className="team-stats-table">
              <div className="stats-header">
                <div className="stat-label">구분</div>
                <div className="stat-value">평균</div>
                <div className="stat-value">최소</div>
                <div className="stat-value">최대</div>
                <div className="stat-value">표준편차</div>
              </div>
              <div className="stats-row">
                <div className="stat-label">첫번째 팀</div>
                <div className="stat-value">{safeGet(analysisData.requestPerAgent?.team1?.avg)}개</div>
                <div className="stat-value">{safeGet(analysisData.requestPerAgent?.team1?.min)}개</div>
                <div className="stat-value">{safeGet(analysisData.requestPerAgent?.team1?.max)}개</div>
                <div className="stat-value">{safeGet(analysisData.requestPerAgent?.team1?.stdev)}</div>
              </div>
              <div className="stats-row">
                <div className="stat-label">두번째 팀</div>
                <div className="stat-value">{safeGet(analysisData.requestPerAgent?.team2?.avg)}개</div>
                <div className="stat-value">{safeGet(analysisData.requestPerAgent?.team2?.min)}개</div>
                <div className="stat-value">{safeGet(analysisData.requestPerAgent?.team2?.max)}개</div>
                <div className="stat-value">{safeGet(analysisData.requestPerAgent?.team2?.stdev)}</div>
              </div>
              <div className="stats-row">
                <div className="stat-label">세번째 팀</div>
                <div className="stat-value">{safeGet(analysisData.requestPerAgent?.team3?.avg)}개</div>
                <div className="stat-value">{safeGet(analysisData.requestPerAgent?.team3?.min)}개</div>
                <div className="stat-value">{safeGet(analysisData.requestPerAgent?.team3?.max)}개</div>
                <div className="stat-value">{safeGet(analysisData.requestPerAgent?.team3?.stdev)}</div>
              </div>
              <div className="stats-row total-row">
                <div className="stat-label">전체</div>
                <div className="stat-value">{safeGet(analysisData.requestPerAgent?.total?.avg)}개</div>
                <div className="stat-value">{safeGet(analysisData.requestPerAgent?.total?.min)}개</div>
                <div className="stat-value">{safeGet(analysisData.requestPerAgent?.total?.max)}개</div>
                <div className="stat-value">{safeGet(analysisData.requestPerAgent?.total?.stdev)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="user-activity-section">
          <h4>👤 사용자 요청 활동</h4>
          <div className="team-stats-table">
            <div className="stats-header">
              <div className="stat-label">구분</div>
              <div className="stat-value">평균</div>
              <div className="stat-value">최소</div>
              <div className="stat-value">최대</div>
              <div className="stat-value">표준편차</div>
            </div>
            <div className="stats-row">
              <div className="stat-label">첫번째 팀</div>
              <div className="stat-value">{safeGet(analysisData.userRequests?.team1?.avg)}개</div>
              <div className="stat-value">{safeGet(analysisData.userRequests?.team1?.min)}개</div>
              <div className="stat-value">{safeGet(analysisData.userRequests?.team1?.max)}개</div>
              <div className="stat-value">{safeGet(analysisData.userRequests?.team1?.stdev)}</div>
            </div>
            <div className="stats-row">
              <div className="stat-label">두번째 팀</div>
              <div className="stat-value">{safeGet(analysisData.userRequests?.team2?.avg)}개</div>
              <div className="stat-value">{safeGet(analysisData.userRequests?.team2?.min)}개</div>
              <div className="stat-value">{safeGet(analysisData.userRequests?.team2?.max)}개</div>
              <div className="stat-value">{safeGet(analysisData.userRequests?.team2?.stdev)}</div>
            </div>
            <div className="stats-row">
              <div className="stat-label">세번째 팀</div>
              <div className="stat-value">{safeGet(analysisData.userRequests?.team3?.avg)}개</div>
              <div className="stat-value">{safeGet(analysisData.userRequests?.team3?.min)}개</div>
              <div className="stat-value">{safeGet(analysisData.userRequests?.team3?.max)}개</div>
              <div className="stat-value">{safeGet(analysisData.userRequests?.team3?.stdev)}</div>
            </div>
            <div className="stats-row total-row">
              <div className="stat-label">전체</div>
              <div className="stat-value">{safeGet(analysisData.userRequests?.total?.avg)}개</div>
              <div className="stat-value">{safeGet(analysisData.userRequests?.total?.min)}개</div>
              <div className="stat-value">{safeGet(analysisData.userRequests?.total?.max)}개</div>
              <div className="stat-value">{safeGet(analysisData.userRequests?.total?.stdev)}</div>
            </div>
          </div>

        </div>

        {/* 상세 요청 역할 분석 */}
        <details className="user-role-details">
          <summary>🔍 상세 요청 역할 분석 보기</summary>
          <div className="user-role-analysis">
            <div className="role-summary">
              <p><strong>요청 역할을 맡은 팀:</strong> {safeGet(analysisData.requestRoleAnalysis?.hasRoleCount, 0)}개 팀</p>
              <div className="role-breakdown">
                <div className="role-stat">✅ 역할도 있고 실제로도 요청: {safeGet(analysisData.requestRoleAnalysis?.hasRoleAndDid, 0)}개 팀</div>
                <div className="role-stat">❌ 역할은 있지만 요청하지 않음: {safeGet(analysisData.requestRoleAnalysis?.hasRoleButDidnt, 0)}개 팀</div>
                <div className="role-stat">📊 역할은 없지만 요청함: {safeGet(analysisData.requestRoleAnalysis?.noRoleButDid, 0)}개 팀</div>
              </div>
            </div>
            
            <div className="role-details">
              <h5>사용자 요청 활동 상세 분석</h5>
              <p>
                전체 {safeGet(analysisData.requestRoleAnalysis?.hasRoleCount, 0)}개 팀 중 {safeGet(analysisData.requestRoleAnalysis?.hasRoleAndDid, 0)}개 팀
                ({((safeGet(analysisData.requestRoleAnalysis?.hasRoleAndDid, 0) / Math.max(safeGet(analysisData.requestRoleAnalysis?.hasRoleCount, 1), 1)) * 100).toFixed(1)}%)에서 
                사용자가 요청 역할을 맡고 실제로 요청을 수행했습니다.
              </p>
            </div>
          </div>
        </details>
      </div>

    </div>
  );
};

export default RolesAnalysis;