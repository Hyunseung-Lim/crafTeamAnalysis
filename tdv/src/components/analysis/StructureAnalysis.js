import React from 'react';

const StructureAnalysis = ({ analysisData }) => {
  if (!analysisData) return null;

  return (
    <div className="analysis-content">
      {/* 팀 크기 분석 */}
      <div className="analysis-section">
        <h3>👥 팀 크기 분석</h3>
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
            <div className="stat-value">{analysisData.teamSizes.team1.avg}명</div>
            <div className="stat-value">{analysisData.teamSizes.team1.min}명</div>
            <div className="stat-value">{analysisData.teamSizes.team1.max}명</div>
            <div className="stat-value">{analysisData.teamSizes.team1.stdev}</div>
          </div>
          <div className="stats-row">
            <div className="stat-label">두번째 팀</div>
            <div className="stat-value">{analysisData.teamSizes.team2.avg}명</div>
            <div className="stat-value">{analysisData.teamSizes.team2.min}명</div>
            <div className="stat-value">{analysisData.teamSizes.team2.max}명</div>
            <div className="stat-value">{analysisData.teamSizes.team2.stdev}</div>
          </div>
          <div className="stats-row">
            <div className="stat-label">세번째 팀</div>
            <div className="stat-value">{analysisData.teamSizes.team3.avg}명</div>
            <div className="stat-value">{analysisData.teamSizes.team3.min}명</div>
            <div className="stat-value">{analysisData.teamSizes.team3.max}명</div>
            <div className="stat-value">{analysisData.teamSizes.team3.stdev}</div>
          </div>
          <div className="stats-row total-row">
            <div className="stat-label">전체</div>
            <div className="stat-value">{analysisData.teamSizes.total.avg}명</div>
            <div className="stat-value">{analysisData.teamSizes.total.min}명</div>
            <div className="stat-value">{analysisData.teamSizes.total.max}명</div>
            <div className="stat-value">{analysisData.teamSizes.total.stdev}</div>
          </div>
        </div>
      </div>

      {/* 아이디어 생성 분석 */}
      <div className="analysis-section">
        <h3>💡 아이디어 생성 분석</h3>
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
            <div className="stat-value">{analysisData.ideas.team1.avg}개</div>
            <div className="stat-value">{analysisData.ideas.team1.min}개</div>
            <div className="stat-value">{analysisData.ideas.team1.max}개</div>
            <div className="stat-value">{analysisData.ideas.team1.stdev}</div>
          </div>
          <div className="stats-row">
            <div className="stat-label">두번째 팀</div>
            <div className="stat-value">{analysisData.ideas.team2.avg}개</div>
            <div className="stat-value">{analysisData.ideas.team2.min}개</div>
            <div className="stat-value">{analysisData.ideas.team2.max}개</div>
            <div className="stat-value">{analysisData.ideas.team2.stdev}</div>
          </div>
          <div className="stats-row">
            <div className="stat-label">세번째 팀</div>
            <div className="stat-value">{analysisData.ideas.team3.avg}개</div>
            <div className="stat-value">{analysisData.ideas.team3.min}개</div>
            <div className="stat-value">{analysisData.ideas.team3.max}개</div>
            <div className="stat-value">{analysisData.ideas.team3.stdev}</div>
          </div>
          <div className="stats-row total-row">
            <div className="stat-label">전체</div>
            <div className="stat-value">{analysisData.ideas.total.avg}개</div>
            <div className="stat-value">{analysisData.ideas.total.min}개</div>
            <div className="stat-value">{analysisData.ideas.total.max}개</div>
            <div className="stat-value">{analysisData.ideas.total.stdev}</div>
          </div>
        </div>

        <div className="insight-section">
          <h4>📊 주요 인사이트</h4>
          <div className="insights-grid">
            <div className="insight-card">
              <h5>아이디어 생성 효율성</h5>
              <p>
                전체 팀 평균: {analysisData.ideas.total.avg}개 아이디어<br/>
                에이전트당 평균: {analysisData.ideaPerAgent.total.avg}개 아이디어<br/>
                채팅 활동 평균: {analysisData.chats.total.avg}개 메시지
              </p>
            </div>
            <div className="insight-card">
              <h5>팀 크기와 효율성</h5>
              <p>
                평균 팀 크기: {analysisData.teamSizes.total.avg}명<br/>
                최대 팀 크기: {analysisData.teamSizes.total.max}명<br/>
                최소 팀 크기: {analysisData.teamSizes.total.min}명
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 새로운 아이디어 vs 수정된 아이디어 분석 */}
      <div className="analysis-section">
        <h3>🆕 새로운 아이디어 vs 수정된 아이디어</h3>
        <div className="idea-breakdown-grid">
          <div className="idea-type-analysis">
            <h4>새로운 아이디어</h4>
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
                <div className="stat-value">{analysisData.newIdeas.team1.avg}개</div>
                <div className="stat-value">{analysisData.newIdeas.team1.min}개</div>
                <div className="stat-value">{analysisData.newIdeas.team1.max}개</div>
                <div className="stat-value">{analysisData.newIdeas.team1.stdev}</div>
              </div>
              <div className="stats-row">
                <div className="stat-label">두번째 팀</div>
                <div className="stat-value">{analysisData.newIdeas.team2.avg}개</div>
                <div className="stat-value">{analysisData.newIdeas.team2.min}개</div>
                <div className="stat-value">{analysisData.newIdeas.team2.max}개</div>
                <div className="stat-value">{analysisData.newIdeas.team2.stdev}</div>
              </div>
              <div className="stats-row">
                <div className="stat-label">세번째 팀</div>
                <div className="stat-value">{analysisData.newIdeas.team3.avg}개</div>
                <div className="stat-value">{analysisData.newIdeas.team3.min}개</div>
                <div className="stat-value">{analysisData.newIdeas.team3.max}개</div>
                <div className="stat-value">{analysisData.newIdeas.team3.stdev}</div>
              </div>
              <div className="stats-row total-row">
                <div className="stat-label">전체</div>
                <div className="stat-value">{analysisData.newIdeas.total.avg}개</div>
                <div className="stat-value">{analysisData.newIdeas.total.min}개</div>
                <div className="stat-value">{analysisData.newIdeas.total.max}개</div>
                <div className="stat-value">{analysisData.newIdeas.total.stdev}</div>
              </div>
            </div>
          </div>

          <div className="idea-type-analysis">
            <h4>수정된 아이디어</h4>
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
                <div className="stat-value">{analysisData.updatedIdeas.team1.avg}개</div>
                <div className="stat-value">{analysisData.updatedIdeas.team1.min}개</div>
                <div className="stat-value">{analysisData.updatedIdeas.team1.max}개</div>
                <div className="stat-value">{analysisData.updatedIdeas.team1.stdev}</div>
              </div>
              <div className="stats-row">
                <div className="stat-label">두번째 팀</div>
                <div className="stat-value">{analysisData.updatedIdeas.team2.avg}개</div>
                <div className="stat-value">{analysisData.updatedIdeas.team2.min}개</div>
                <div className="stat-value">{analysisData.updatedIdeas.team2.max}개</div>
                <div className="stat-value">{analysisData.updatedIdeas.team2.stdev}</div>
              </div>
              <div className="stats-row">
                <div className="stat-label">세번째 팀</div>
                <div className="stat-value">{analysisData.updatedIdeas.team3.avg}개</div>
                <div className="stat-value">{analysisData.updatedIdeas.team3.min}개</div>
                <div className="stat-value">{analysisData.updatedIdeas.team3.max}개</div>
                <div className="stat-value">{analysisData.updatedIdeas.team3.stdev}</div>
              </div>
              <div className="stats-row total-row">
                <div className="stat-label">전체</div>
                <div className="stat-value">{analysisData.updatedIdeas.total.avg}개</div>
                <div className="stat-value">{analysisData.updatedIdeas.total.min}개</div>
                <div className="stat-value">{analysisData.updatedIdeas.total.max}개</div>
                <div className="stat-value">{analysisData.updatedIdeas.total.stdev}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 에이전트당 아이디어 생산성 */}
      <div className="analysis-section">
        <h3>🤖 에이전트당 아이디어 생산성</h3>
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
            <div className="stat-value">{analysisData.ideaPerAgent.team1.avg}개</div>
            <div className="stat-value">{analysisData.ideaPerAgent.team1.min}개</div>
            <div className="stat-value">{analysisData.ideaPerAgent.team1.max}개</div>
            <div className="stat-value">{analysisData.ideaPerAgent.team1.stdev}</div>
          </div>
          <div className="stats-row">
            <div className="stat-label">두번째 팀</div>
            <div className="stat-value">{analysisData.ideaPerAgent.team2.avg}개</div>
            <div className="stat-value">{analysisData.ideaPerAgent.team2.min}개</div>
            <div className="stat-value">{analysisData.ideaPerAgent.team2.max}개</div>
            <div className="stat-value">{analysisData.ideaPerAgent.team2.stdev}</div>
          </div>
          <div className="stats-row">
            <div className="stat-label">세번째 팀</div>
            <div className="stat-value">{analysisData.ideaPerAgent.team3.avg}개</div>
            <div className="stat-value">{analysisData.ideaPerAgent.team3.min}개</div>
            <div className="stat-value">{analysisData.ideaPerAgent.team3.max}개</div>
            <div className="stat-value">{analysisData.ideaPerAgent.team3.stdev}</div>
          </div>
          <div className="stats-row total-row">
            <div className="stat-label">전체</div>
            <div className="stat-value">{analysisData.ideaPerAgent.total.avg}개</div>
            <div className="stat-value">{analysisData.ideaPerAgent.total.min}개</div>
            <div className="stat-value">{analysisData.ideaPerAgent.total.max}개</div>
            <div className="stat-value">{analysisData.ideaPerAgent.total.stdev}</div>
          </div>
        </div>
      </div>

      {/* 채팅 활동 분석 */}
      <div className="analysis-section">
        <h3>💬 채팅 활동 분석</h3>
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
            <div className="stat-value">{analysisData.chats.team1.avg}개</div>
            <div className="stat-value">{analysisData.chats.team1.min}개</div>
            <div className="stat-value">{analysisData.chats.team1.max}개</div>
            <div className="stat-value">{analysisData.chats.team1.stdev}</div>
          </div>
          <div className="stats-row">
            <div className="stat-label">두번째 팀</div>
            <div className="stat-value">{analysisData.chats.team2.avg}개</div>
            <div className="stat-value">{analysisData.chats.team2.min}개</div>
            <div className="stat-value">{analysisData.chats.team2.max}개</div>
            <div className="stat-value">{analysisData.chats.team2.stdev}</div>
          </div>
          <div className="stats-row">
            <div className="stat-label">세번째 팀</div>
            <div className="stat-value">{analysisData.chats.team3.avg}개</div>
            <div className="stat-value">{analysisData.chats.team3.min}개</div>
            <div className="stat-value">{analysisData.chats.team3.max}개</div>
            <div className="stat-value">{analysisData.chats.team3.stdev}</div>
          </div>
          <div className="stats-row total-row">
            <div className="stat-label">전체</div>
            <div className="stat-value">{analysisData.chats.total.avg}개</div>
            <div className="stat-value">{analysisData.chats.total.min}개</div>
            <div className="stat-value">{analysisData.chats.total.max}개</div>
            <div className="stat-value">{analysisData.chats.total.stdev}</div>
          </div>
        </div>
      </div>

      {/* 공유 멘탈 모델 길이 분석 */}
      <div className="analysis-section">
        <h3>🧠 공유 멘탈 모델 복잡도 분석 (음절 기준)</h3>
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
            <div className="stat-value">{analysisData.sharedMentalModel.team1.avg}음절</div>
            <div className="stat-value">{analysisData.sharedMentalModel.team1.min}음절</div>
            <div className="stat-value">{analysisData.sharedMentalModel.team1.max}음절</div>
            <div className="stat-value">{analysisData.sharedMentalModel.team1.stdev}</div>
          </div>
          <div className="stats-row">
            <div className="stat-label">두번째 팀</div>
            <div className="stat-value">{analysisData.sharedMentalModel.team2.avg}음절</div>
            <div className="stat-value">{analysisData.sharedMentalModel.team2.min}음절</div>
            <div className="stat-value">{analysisData.sharedMentalModel.team2.max}음절</div>
            <div className="stat-value">{analysisData.sharedMentalModel.team2.stdev}</div>
          </div>
          <div className="stats-row">
            <div className="stat-label">세번째 팀</div>
            <div className="stat-value">{analysisData.sharedMentalModel.team3.avg}음절</div>
            <div className="stat-value">{analysisData.sharedMentalModel.team3.min}음절</div>
            <div className="stat-value">{analysisData.sharedMentalModel.team3.max}음절</div>
            <div className="stat-value">{analysisData.sharedMentalModel.team3.stdev}</div>
          </div>
          <div className="stats-row total-row">
            <div className="stat-label">전체</div>
            <div className="stat-value">{analysisData.sharedMentalModel.total.avg}음절</div>
            <div className="stat-value">{analysisData.sharedMentalModel.total.min}음절</div>
            <div className="stat-value">{analysisData.sharedMentalModel.total.max}음절</div>
            <div className="stat-value">{analysisData.sharedMentalModel.total.stdev}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StructureAnalysis;