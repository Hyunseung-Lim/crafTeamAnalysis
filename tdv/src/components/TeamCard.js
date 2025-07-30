import React from 'react';
import './TeamCard.css';

const TeamCard = ({ team, onSelect }) => {
  const getAgentRoles = (agents) => {
    const allRoles = agents.flatMap(agent => agent.roles);
    const uniqueRoles = [...new Set(allRoles)];
    return uniqueRoles.slice(0, 3).join(', ') + (uniqueRoles.length > 3 ? '...' : '');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  const getLeaderAgent = (agents) => {
    return agents.find(agent => agent.isLeader);
  };

  const calculateActivityStats = (chatMessages) => {
    if (!chatMessages || chatMessages.length === 0) {
      return { ideaGeneration: 0, evaluation: 0, feedback: 0, request: 0 };
    }

    let ideaGeneration = 0;
    let evaluation = 0;
    let feedback = 0;
    let request = 0;

    chatMessages.forEach((message) => {
      if (typeof message === 'string') {
        try {
          message = JSON.parse(message);
        } catch {
          return;
        }
      }

      if (message.type === "system" && message.payload && typeof message.payload === "object") {
        const content = (message.payload).content;
        if (typeof content === "string") {
          if (content.includes("아이디어를 생성")) {
            ideaGeneration++;
          } else if (content.includes("아이디어를 평가")) {
            evaluation++;
          } else if (content.includes("피드백")) {
            feedback++;
          }
        }
      } else if (message.type === "make_request") {
        request++;
      } else if (message.type === "feedback_session_summary") {
        feedback++;
      }
    });

    return { ideaGeneration, evaluation, feedback, request };
  };

  return (
    <div className="team-card" onClick={onSelect}>
      <div className="team-card-header">
        <div className="team-title">
          <h3 className="team-name">{team.team_info?.teamName || 'Unknown Team'}</h3>
          <span className="team-index">{team.displayNumber}</span>
        </div>
        <div className="owner-info">
          <span className="owner-label">소유자:</span>
          <span className="owner-name">{team.owner_info?.name || 'Unknown'}</span>
        </div>
      </div>
      
      <div className="team-content">
        <div className="topic-section">
          <span className="topic-label">주제:</span>
          <p className="topic-text">{team.team_info?.topic || 'N/A'}</p>
        </div>
        
        <div className="mental-model-section">
          <span className="mental-model-label">공유 모델:</span>
          <p className="mental-model-text">{team.team_info?.sharedMentalModel || 'N/A'}</p>
        </div>
        
        <div className="team-meta">
          <div className="meta-item">
            <span className="meta-label">생성일:</span>
            <span className="meta-value">{formatDate(team.team_info?.createdAt)}</span>
          </div>
        </div>
      </div>
      
      <div className="team-stats">
        {(() => {
          const stats = calculateActivityStats(team.chat);
          return (
            <>
              <div className="stat-item">
                <div className="stat-number">{stats.ideaGeneration}</div>
                <div className="stat-label">아이디어 생성</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{stats.evaluation}</div>
                <div className="stat-label">평가</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{stats.feedback}</div>
                <div className="stat-label">피드백</div>
              </div>
              <div className="stat-item">
                <div className="stat-number">{stats.request}</div>
                <div className="stat-label">요청</div>
              </div>
            </>
          );
        })()}
      </div>
      
      <div className="agent-preview">
        <div className="agent-roles">
          <span className="roles-label">주요 역할:</span>
          <span className="roles-text">{getAgentRoles(team.agents)}</span>
        </div>
        
        {getLeaderAgent(team.agents) && (
          <div className="leader-info">
            <span className="leader-label">팀 리더:</span>
            <span className="leader-name">
              {getLeaderAgent(team.agents).agent_info?.name || 'Unknown'}
            </span>
          </div>
        )}
      </div>
      
      <div className="team-card-footer">
        <button className="view-detail-btn">자세히 보기 →</button>
      </div>
    </div>
  );
};

export default TeamCard;