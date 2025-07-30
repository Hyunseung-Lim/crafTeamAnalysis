import React, { useState } from 'react';
import './TeamDetail.css';
import NetworkGraph from './NetworkGraph';

const TeamDetail = ({ team, onBack }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('ko-KR');
  };

  const parseMembers = (membersString) => {
    try {
      return JSON.parse(membersString);
    } catch {
      return [];
    }
  };

  const parseRelationships = (relationshipsString) => {
    try {
      return JSON.parse(relationshipsString);
    } catch {
      return [];
    }
  };

  const parseNodePositions = (nodePositionsString) => {
    try {
      return JSON.parse(nodePositionsString);
    } catch {
      return {};
    }
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

  const renderOverview = () => (
    <div className="overview-section">
      <div className="team-basic-info">
        <h2>{team.team_info?.teamName || 'Unknown Team'}</h2>
        <div className="info-grid">
          <div className="info-item">
            <span className="info-label">팀 ID:</span>
            <span className="info-value">{team.team_id}</span>
          </div>
          <div className="info-item">
            <span className="info-label">소유자:</span>
            <span className="info-value">{team.owner_info?.name || 'Unknown'}</span>
          </div>
          <div className="info-item">
            <span className="info-label">생성일:</span>
            <span className="info-value">{formatDate(team.team_info?.createdAt)}</span>
          </div>
          <div className="info-item">
            <span className="info-label">주제:</span>
            <span className="info-value">{team.team_info?.topic || 'N/A'}</span>
          </div>
        </div>
        
        <div className="mental-model">
          <h4>공유 정신 모델</h4>
          <p>{team.team_info?.sharedMentalModel || 'N/A'}</p>
        </div>

        <div className="team-stats-detail">
          {(() => {
            const stats = calculateActivityStats(team.chat);
            return (
              <>
                <div className="stat-card">
                  <div className="stat-number">{stats.ideaGeneration}</div>
                  <div className="stat-label">아이디어 생성</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{stats.evaluation}</div>
                  <div className="stat-label">평가</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{stats.feedback}</div>
                  <div className="stat-label">피드백</div>
                </div>
                <div className="stat-card">
                  <div className="stat-number">{stats.request}</div>
                  <div className="stat-label">요청</div>
                </div>
              </>
            );
          })()}
        </div>
      </div>
    </div>
  );

  const renderAgents = () => {
    // 소유자의 역할 정보 가져오기
    const getOwnerRoles = () => {
      try {
        const members = JSON.parse(team.team_info?.members || '[]');
        const ownerMember = members.find(member => member.isUser === true);
        return ownerMember?.roles || [];
      } catch {
        return [];
      }
    };

    return (
      <div className="agents-section">
        <h3>팀 멤버 ({team.agents.length + 1}명)</h3>
        <div className="agents-grid">
          {/* 소유자 카드 */}
          {team.owner_info && (
            <div className="agent-card owner-card">
              <div className="agent-header">
                <div className="agent-id">
                  <span className="node-key owner-key">나</span>
                  <span className="agent-name">
                    {team.owner_info.name || 'Unknown'}
                  </span>
                  <span className="owner-badge">소유자</span>
                </div>
              </div>
              
              <div className="agent-info">
                <div className="agent-detail">
                  <span className="detail-label">직업:</span>
                  <span className="detail-value">
                    {team.owner_info.professional || 'N/A'}
                  </span>
                </div>
                
                <div className="agent-detail">
                  <span className="detail-label">나이:</span>
                  <span className="detail-value">
                    {team.owner_info.age || 'N/A'}
                  </span>
                </div>
                
                <div className="agent-detail">
                  <span className="detail-label">성별:</span>
                  <span className="detail-value">
                    {team.owner_info.gender || 'N/A'}
                  </span>
                </div>
                
                <div className="agent-detail">
                  <span className="detail-label">학력:</span>
                  <span className="detail-value">
                    {team.owner_info.education || 'N/A'}
                  </span>
                </div>
                
                <div className="agent-detail">
                  <span className="detail-label">전공:</span>
                  <span className="detail-value">
                    {team.owner_info.major || 'N/A'}
                  </span>
                </div>
                
                {team.owner_info.skills && (
                  <div className="agent-detail">
                    <span className="detail-label">스킬:</span>
                    <span className="detail-value skills">
                      {team.owner_info.skills}
                    </span>
                  </div>
                )}
                
                <div className="agent-roles">
                  <span className="detail-label">역할:</span>
                  <div className="roles-list">
                    {getOwnerRoles().map((role, roleIndex) => (
                      <span key={roleIndex} className="role-tag">
                        {role}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        
        {/* 에이전트 카드들 */}
        {team.agents.map((agent, index) => (
          <div key={agent.agentId} className="agent-card">
            <div className="agent-header">
              <div className="agent-id">
                <span className="node-key">{agent.node_key}</span>
                <span className="agent-name">
                  {agent.agent_info?.name || 'Unknown'}
                </span>
                {agent.isLeader && (
                  <span className="leader-badge">리더</span>
                )}
              </div>
            </div>
            
            <div className="agent-info">
              <div className="agent-detail">
                <span className="detail-label">직업:</span>
                <span className="detail-value">
                  {agent.agent_info?.professional || 'N/A'}
                </span>
              </div>
              
              <div className="agent-detail">
                <span className="detail-label">나이:</span>
                <span className="detail-value">
                  {agent.agent_info?.age || 'N/A'}
                </span>
              </div>
              
              <div className="agent-detail">
                <span className="detail-label">성별:</span>
                <span className="detail-value">
                  {agent.agent_info?.gender || 'N/A'}
                </span>
              </div>
              
              {agent.agent_info?.skills && (
                <div className="agent-detail">
                  <span className="detail-label">스킬:</span>
                  <span className="detail-value skills">
                    {agent.agent_info.skills}
                  </span>
                </div>
              )}
              
              <div className="agent-roles">
                <span className="detail-label">역할:</span>
                <div className="roles-list">
                  {agent.roles.map((role, roleIndex) => (
                    <span key={roleIndex} className="role-tag">
                      {role}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
    );
  };


  const renderNetwork = () => {
    const members = parseMembers(team.team_info?.members || '[]');
    const relationships = parseRelationships(team.team_info?.relationships || '[]');

    return (
      <div className="network-section">
        <h3>팀 네트워크</h3>
        
        {/* 네트워크 그래프 */}
        <div className="network-graph-wrapper">
          <NetworkGraph team={team} />
        </div>
        
        {/* 범례 */}
        <div className="network-legend">
          <div className="legend-section">
            <h4>노드 타입</h4>
            <div className="legend-items">
              <div className="legend-item">
                <div className="legend-circle user"></div>
                <span>소유자 (나)</span>
              </div>
              <div className="legend-item">
                <div className="legend-circle agent"></div>
                <span>에이전트</span>
              </div>
              <div className="legend-item">
                <div className="legend-circle agent leader"></div>
                <span>리더</span>
              </div>
            </div>
          </div>
          
          <div className="legend-section">
            <h4>관계 타입</h4>
            <div className="legend-items">
              <div className="legend-item">
                <div className="legend-line supervisor"></div>
                <span>상급자 관계 (화살표)</span>
              </div>
              <div className="legend-item">
                <div className="legend-line peer"></div>
                <span>동료 관계 (실선)</span>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    );
  };

  const [expandedEvaluations, setExpandedEvaluations] = useState({});

  const toggleEvaluations = (ideaIndex) => {
    setExpandedEvaluations(prev => ({
      ...prev,
      [ideaIndex]: !prev[ideaIndex]
    }));
  };

  const parseIdeaContent = (idea) => {
    if (typeof idea === 'string') {
      try {
        return JSON.parse(idea);
      } catch {
        return { content: idea };
      }
    }
    return idea;
  };

  const renderStructuredData = (data, type) => {
    if (typeof data === 'string') {
      // 문자열이 JSON인지 확인하고 파싱 시도
      try {
        const parsed = JSON.parse(data);
        if (typeof parsed === 'object' && parsed !== null) {
          return renderStructuredData(parsed, type);
        }
      } catch {
        // JSON이 아니면 그냥 문자열로 표시
      }
      return <span className="simple-text">{data}</span>;
    }
    
    if (typeof data === 'object' && data !== null) {
      if (Array.isArray(data)) {
        // key-value 구조 배열인지 확인
        const isKeyValueArray = data.length > 0 && 
          data.every(item => 
            typeof item === 'object' && 
            item !== null && 
            'key' in item && 
            'value' in item
          );
        
        if (isKeyValueArray) {
          return (
            <div className="key-value-list">
              {data.map((item, index) => (
                <div key={index} className="key-value-item">
                  <div className="kv-compact">
                    <span className="kv-key">{item.key}</span>
                    <span className="kv-value">{item.value}</span>
                  </div>
                </div>
              ))}
            </div>
          );
        } else {
          // 일반 배열
          return (
            <div className="structured-array">
              {data.map((item, index) => (
                <div key={index} className="array-item">
                  <span className="array-index">#{index + 1}</span>
                  <span className="array-value">
                    {typeof item === 'string' ? item : JSON.stringify(item)}
                  </span>
                </div>
              ))}
            </div>
          );
        }
      } else {
        // 객체의 모든 값이 문자열인 경우 key-value 스타일로 렌더링
        const isSimpleKeyValueObject = Object.values(data).every(value => typeof value === 'string');
        
        if (isSimpleKeyValueObject) {
          return (
            <div className="key-value-list">
              {Object.entries(data).map(([key, value], index) => (
                <div key={index} className="key-value-item">
                  <div className="kv-compact">
                    <span className="kv-key">{key}</span>
                    <span className="kv-value">{value}</span>
                  </div>
                </div>
              ))}
            </div>
          );
        } else {
          return (
            <div className="structured-object">
              {Object.entries(data).map(([key, value], index) => (
                <div key={index} className="object-property">
                  <span className="property-key">{key}:</span>
                  <span className="property-value">
                    {typeof value === 'string' ? value : 
                     Array.isArray(value) ? renderStructuredData(value, 'array') :
                     typeof value === 'object' ? renderStructuredData(value, 'object') :
                     String(value)}
                  </span>
                </div>
              ))}
            </div>
          );
        }
      }
    }
    
    return <span className="simple-text">{String(data)}</span>;
  };

  const renderIdeas = () => {
    return (
      <div className="ideas-section">
        <h3>아이디어 ({team.ideas?.length || 0}개)</h3>
        
        {team.ideas && team.ideas.length > 0 ? (
          <div className="ideas-full-list">
            {team.ideas.map((idea, index) => {
              const parsedIdea = parseIdeaContent(idea);
              const content = parsedIdea.content || parsedIdea;
              const evaluations = parsedIdea.evaluations || [];
              const hasEvaluations = evaluations.length > 0;
              const ideaId = parsedIdea.id || (index + 1);
              
              return (
                <div key={index} className="idea-card">
                  <div className="idea-header">
                    <div className="idea-title-row">
                      <span className="idea-number">#{ideaId}</span>
                      {content && typeof content === 'object' && content.object && (
                        <div className="idea-title">
                          {renderStructuredData(content.object, 'object')}
                        </div>
                      )}
                    </div>
                    <div className="idea-meta">
                      {hasEvaluations && (
                        <span className="evaluation-count">
                          평가: {evaluations.length}개
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Content 구조화 표시 */}
                  {content && typeof content === 'object' && (
                    <div className="idea-content-structured">
                      {content.function && (
                        <div className="content-field function-field">
                          <span className="field-label">기능</span>
                          <div className="field-value">
                            {renderStructuredData(content.function, 'function')}
                          </div>
                        </div>
                      )}
                      {content.behavior && (
                        <div className="content-field">
                          <span className="field-label">행동</span>
                          <div className="field-value">
                            {renderStructuredData(content.behavior, 'behavior')}
                          </div>
                        </div>
                      )}
                      {content.structure && (
                        <div className="content-field">
                          <span className="field-label">구조</span>
                          <div className="field-value">
                            {renderStructuredData(content.structure, 'structure')}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* 단순 텍스트 컨텐츠 */}
                  {content && typeof content === 'string' && (
                    <div className="idea-content-simple">
                      {content}
                    </div>
                  )}
                  
                  {/* 평가 토글 섹션 */}
                  {hasEvaluations && (
                    <div className="evaluations-section">
                      <button 
                        className="evaluations-toggle"
                        onClick={() => toggleEvaluations(index)}
                      >
                        평가 보기 ({evaluations.length}개)
                        <span className={`toggle-arrow ${expandedEvaluations[index] ? 'expanded' : ''}`}>
                          ▼
                        </span>
                      </button>
                      
                      {expandedEvaluations[index] && (
                        <div className="evaluations-list">
                          {evaluations.map((evaluation, evalIndex) => (
                            <div key={evalIndex} className="evaluation-item">
                              <div className="evaluation-header">
                                <span className="evaluator-name">
                                  {getAgentDisplayName(evaluation.evaluator)}
                                </span>
                                {evaluation.timestamp && (
                                  <span className="evaluation-time">
                                    {new Date(evaluation.timestamp).toLocaleString('ko-KR')}
                                  </span>
                                )}
                              </div>
                              
                              <div className="evaluation-scores">
                                <div className="score-item">
                                  <span className="score-label">참신성</span>
                                  <span className="score-value">{evaluation.scores?.novelty || 0}/7</span>
                                </div>
                                <div className="score-item">
                                  <span className="score-label">완성도</span>
                                  <span className="score-value">{evaluation.scores?.completeness || 0}/7</span>
                                </div>
                                <div className="score-item">
                                  <span className="score-label">품질</span>
                                  <span className="score-value">{evaluation.scores?.quality || 0}/7</span>
                                </div>
                                <div className="score-item total">
                                  <span className="score-label">평균</span>
                                  <span className="score-value">
                                    {evaluation.scores ? 
                                      ((evaluation.scores.novelty + evaluation.scores.completeness + evaluation.scores.quality) / 3).toFixed(1) 
                                      : 0}/7
                                  </span>
                                </div>
                              </div>
                              
                              {evaluation.comment && (
                                <div className="evaluation-comment">
                                  <span className="comment-label">코멘트:</span>
                                  <p className="comment-text">"{evaluation.comment}"</p>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="no-ideas">
            <p>생성된 아이디어가 없습니다.</p>
          </div>
        )}
      </div>
    );
  };

  const getAgentDisplayName = (senderId) => {
    if (senderId === "나") {
      return team.owner_info?.name || "나";
    }
    
    // 팀 에이전트에서 찾기
    const agent = team.agents.find(a => a.agentId === senderId);
    if (agent && agent.agent_info) {
      return agent.agent_info.name;
    }
    
    return senderId;
  };

  const renderActivityDetails = (log) => {
    const { action, details } = log;

    // 아이디어 생성인 경우
    if (action === "아이디어 생성" && details) {
      // team.ideas에서 해당 아이디어 찾기 (timestamp 기반)
      const relatedIdea = team.ideas?.find(idea => {
        const parsedIdea = parseIdeaContent(idea);
        return parsedIdea.id || parsedIdea.timestamp;
      });

      if (relatedIdea) {
        const parsedIdea = parseIdeaContent(relatedIdea);
        const content = parsedIdea.content || parsedIdea;
        
        return (
          <div className="idea-details">
            <h5>생성된 아이디어</h5>
            {content && typeof content === 'object' && content.object && (
              <div className="idea-title-detail">{renderStructuredData(content.object, 'object')}</div>
            )}
            {content && typeof content === 'object' && content.function && (
              <div className="detail-field">
                <span className="detail-label">기능:</span>
                <span className="detail-value">{renderStructuredData(content.function, 'function')}</span>
              </div>
            )}
            {content && typeof content === 'object' && content.behavior && (
              <div className="detail-field">
                <span className="detail-label">행동:</span>
                <div className="detail-value">{renderStructuredData(content.behavior, 'behavior')}</div>
              </div>
            )}
            {content && typeof content === 'object' && content.structure && (
              <div className="detail-field">
                <span className="detail-label">구조:</span>
                <div className="detail-value">{renderStructuredData(content.structure, 'structure')}</div>
              </div>
            )}
          </div>
        );
      }
    }

    // 아이디어 평가인 경우
    if (action === "아이디어 평가" && details) {
      // 평가 정보가 있는 경우
      if (details.scores) {
        return (
          <div className="evaluation-details">
            <h5>평가 정보</h5>
            <div className="evaluation-scores-detail">
              <div className="score-detail-item">
                <span className="score-detail-label">참신성</span>
                <span className="score-detail-value">{details.scores.novelty || 0}/7</span>
              </div>
              <div className="score-detail-item">
                <span className="score-detail-label">완성도</span>
                <span className="score-detail-value">{details.scores.completeness || 0}/7</span>
              </div>
              <div className="score-detail-item">
                <span className="score-detail-label">품질</span>
                <span className="score-detail-value">{details.scores.quality || 0}/7</span>
              </div>
              <div className="score-detail-item average">
                <span className="score-detail-label">평균</span>
                <span className="score-detail-value">
                  {details.scores ? 
                    ((details.scores.novelty + details.scores.completeness + details.scores.quality) / 3).toFixed(1) 
                    : 0}/7
                </span>
              </div>
            </div>
            {details.comment && (
              <div className="evaluation-comment-detail">
                <span className="comment-detail-label">평가 코멘트:</span>
                <p className="comment-detail-text">"{details.comment}"</p>
              </div>
            )}
          </div>
        );
      }
    }

    // 피드백 세션인 경우
    if (action === "피드백 세션 완료" && details && details.sessionMessages) {
      return (
        <div className="feedback-details">
          <h5>피드백 대화 내용</h5>
          <div className="feedback-messages">
            {details.sessionMessages
              .filter(message => message.type !== "system")
              .map((message, index) => {
                const isMyMessage = message.sender === "나";
                const displayContent = message.content || 
                                     message.payload?.content || 
                                     message.payload?.message || 
                                     (typeof message.payload === 'string' ? message.payload : 
                                      JSON.stringify(message.payload));
                
                return (
                  <div key={index} className={`feedback-message ${isMyMessage ? 'my-message' : 'other-message'}`}>
                    <div className="message-sender">
                      {getAgentDisplayName(message.sender)}
                    </div>
                    <div className="message-content">
                      {displayContent}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      );
    }

    // 요청인 경우
    if (action === "요청하기" && details) {
      return (
        <div className="request-details">
          <h5>요청 상세 정보</h5>
          <div className="request-info">
            {details.mention && (
              <div className="detail-field">
                <span className="detail-label">대상:</span>
                <span className="detail-value">{getAgentDisplayName(details.mention)}</span>
              </div>
            )}
            {details.requestType && (
              <div className="detail-field">
                <span className="detail-label">요청 유형:</span>
                <span className="detail-value">
                  {details.requestType === "generate" ? "아이디어 생성" :
                   details.requestType === "evaluate" ? "아이디어 평가" :
                   details.requestType === "give_feedback" ? "피드백 제공" :
                   details.requestType}
                </span>
              </div>
            )}
            {details.content && (
              <div className="detail-field">
                <span className="detail-label">요청 내용:</span>
                <div className="detail-value">{details.content}</div>
              </div>
            )}
          </div>
        </div>
      );
    }

    // 기본 JSON 표시
    return (
      <pre className="json-fallback">
        {JSON.stringify(details, null, 2)}
      </pre>
    );
  };

  const renderActivityData = () => {
    const stats = calculateActivityStats(team.chat);
    
    // page.tsx의 extractActionLogs와 동일한 로직으로 활동 로그 생성
    const activityLogs = [];
    
    if (team.chat && team.chat.length > 0) {
      team.chat.forEach((message) => {
        if (typeof message === 'string') {
          try {
            message = JSON.parse(message);
          } catch {
            return;
          }
        }
        
        if (message.type === "system" && message.payload && typeof message.payload === "object") {
          const content = message.payload.content;
          if (typeof content === "string") {
            let actionType = "";
            let description = content;
            
            if (content.includes("아이디어를 생성")) {
              actionType = "아이디어 생성";
            } else if (content.includes("아이디어를 평가")) {
              actionType = "아이디어 평가";
            } else if (content.includes("피드백")) {
              actionType = "피드백 제공";
            } else if (content.includes("요청")) {
              actionType = "요청하기";
            } else {
              actionType = "기타 활동";
            }

            activityLogs.push({
              timestamp: message.timestamp || new Date().toISOString(),
              agentName: getAgentDisplayName(message.sender),
              action: actionType,
              type: 'system',
              description: description
            });
          }
        } else if (message.type === "make_request") {
          // 요청 메시지 처리
          const requester = getAgentDisplayName(message.sender);
          const target = message.payload?.mention ? getAgentDisplayName(message.payload.mention) : "팀원";
          const requestType = message.payload?.requestType;
          
          let requestDescription = `${requester}이 ${target}에게 `;
          if (requestType === "generate") {
            requestDescription += "아이디어 생성을 요청했습니다.";
          } else if (requestType === "evaluate") {
            requestDescription += "아이디어 평가를 요청했습니다.";
          } else if (requestType === "give_feedback") {
            requestDescription += "피드백을 요청했습니다.";
          } else {
            requestDescription += "요청을 했습니다.";
          }

          activityLogs.push({
            timestamp: message.timestamp || new Date().toISOString(),
            agentName: requester,
            action: "요청하기",
            type: 'request',
            description: requestDescription,
            details: message.payload
          });
        } else if (message.type === "feedback_session_summary") {
          // 피드백 세션 참여자 정보 추출
          let feedbackGiver = "";
          let feedbackReceiver = "";
          let messageCount = 0;
          
          if (message.payload && typeof message.payload === "object") {
            const payload = message.payload;
            
            // 메시지 수 추출
            if (payload.messageCount) {
              messageCount = payload.messageCount;
            } else if (payload.turnCount) {
              messageCount = payload.turnCount;
            }
            
            // sessionMessages에서 실제 참여자 추출
            if (payload.sessionMessages && Array.isArray(payload.sessionMessages)) {
              const actualParticipants = new Set();
              payload.sessionMessages.forEach((sessionMsg) => {
                if (sessionMsg.sender && sessionMsg.type !== "system") {
                  actualParticipants.add(sessionMsg.sender);
                }
              });
              
              const participantsList = Array.from(actualParticipants);
              
              if (participantsList.length >= 2) {
                feedbackGiver = getAgentDisplayName(participantsList[0]);
                feedbackReceiver = getAgentDisplayName(participantsList[1]);
              } else if (participantsList.length === 1) {
                feedbackGiver = getAgentDisplayName(participantsList[0]);
              }
            }
            
            // sessionMessages가 없으면 기존 방식 사용
            if (!feedbackGiver) {
              if (payload.from && payload.to) {
                feedbackGiver = getAgentDisplayName(payload.from);
                feedbackReceiver = getAgentDisplayName(payload.to);
              } else if (payload.sender && payload.receiver) {
                feedbackGiver = getAgentDisplayName(payload.sender);
                feedbackReceiver = getAgentDisplayName(payload.receiver);
              }
            }
          }
          
          // 로그 항목 생성
          let actionDescription = "";
          let displayName = "";
          
          if (feedbackGiver && feedbackReceiver) {
            displayName = `${feedbackGiver} → ${feedbackReceiver}`;
            if (messageCount > 0) {
              displayName += ` (${messageCount}회)`;
            }
            actionDescription = `${feedbackGiver}와 ${feedbackReceiver}이 피드백을 진행했습니다.`;
            if (messageCount > 0) {
              actionDescription += ` (${messageCount}개 메시지)`;
            }
          } else {
            displayName = "피드백 세션";
            actionDescription = "AI 피드백 세션이 완료되었습니다.";
          }

          activityLogs.push({
            timestamp: message.timestamp || new Date().toISOString(),
            agentName: displayName,
            action: "피드백 세션 완료",
            type: 'feedback',
            description: actionDescription,
            details: message.payload
          });
        }
      });
    }
    
    // 시간순 정렬 (최신순)
    activityLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return (
      <div className="activity-section">
        <h3>활동 로그 ({activityLogs.length}개)</h3>
        
        <div className="activity-summary">
          <div className="activity-card">
            <h4>아이디어 생성</h4>
            <div className="activity-count">{stats.ideaGeneration}</div>
            <p>아이디어 생성 활동 수</p>
          </div>
          
          <div className="activity-card">
            <h4>평가</h4>
            <div className="activity-count">{stats.evaluation}</div>
            <p>아이디어 평가 활동 수</p>
          </div>
          
          <div className="activity-card">
            <h4>피드백</h4>
            <div className="activity-count">{stats.feedback}</div>
            <p>피드백 활동 수</p>
          </div>
          
          <div className="activity-card">
            <h4>요청</h4>
            <div className="activity-count">{stats.request}</div>
            <p>요청 활동 수</p>
          </div>
        </div>
        
        <div className="activity-logs">
          <h4>활동 타임라인</h4>
          <div className="activity-timeline">
            {activityLogs.length > 0 ? (
              activityLogs.map((log, index) => (
                <div key={index} className={`activity-log-item ${log.type}`}>
                  <div className="activity-log-header">
                    <div className="activity-meta">
                      <span className="activity-sender">{log.agentName}</span>
                      <span className="activity-action-badge">{log.action}</span>
                    </div>
                    <span className="activity-timestamp">
                      {new Date(log.timestamp).toLocaleString('ko-KR')}
                    </span>
                  </div>
                  <div className="activity-log-content">
                    {log.description}
                  </div>
                  {log.details && (
                    <div className="activity-log-details">
                      <details>
                        <summary>상세 정보</summary>
                        <div className="details-content">
                          {renderActivityDetails(log)}
                        </div>
                      </details>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="no-activities">활동 로그가 없습니다.</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const convertLikertScale = (value) => {
    const likertMap = {
      '1': '전혀 그렇지 않다',
      '2': '그렇지 않다', 
      '3': '보통',
      '4': '그렇다',
      '5': '매우 그렇다'
    };
    
    // 숫자 문자열인 경우 변환
    if (typeof value === 'string' && likertMap[value]) {
      return likertMap[value];
    }
    
    // 숫자인 경우도 변환
    if (typeof value === 'number' && likertMap[value.toString()]) {
      return likertMap[value.toString()];
    }
    
    // 변환할 수 없는 경우 원본 반환
    return value;
  };

  const renderEvaluations = () => {
    if (!team.evaluations || team.evaluations.length === 0) {
      return (
        <div className="evaluations-section">
          <h3>팀 평가</h3>
          <div className="no-evaluations">
            <p>평가 데이터가 없습니다.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="evaluations-section">
        <h3>팀 평가 ({team.evaluations.length}개)</h3>
        
        {team.evaluations.map((evaluation, index) => (
          <div key={index} className="evaluation-item">
            {/* 기본 정보 */}
            <div className="evaluation-header">
              <div className="evaluation-meta">
                <span className="evaluation-date">
                  {evaluation["타임스탬프"] || '날짜 정보 없음'}
                </span>
                <span className="evaluator-info">
                  평가자: {evaluation["당신은 이름은?"] || '익명'}
                </span>
                <span className="team-number">
                  {evaluation["몇 번째 팀에 대한 평가인가요?"] && 
                    `${evaluation["몇 번째 팀에 대한 평가인가요?"]}번째 팀`}
                </span>
              </div>
            </div>

            {/* 팀 구조 평가 */}
            <div className="evaluation-section">
              <h4>팀 구조 및 규모</h4>
              <div className="evaluation-content">
                <div className="evaluation-question">
                  <span className="q-label">팀 규모는 적절했나요?</span>
                  <span className="q-answer">{convertLikertScale(evaluation["1.1 해당 팀의 규모 (인원 수) 는 적절했나요?"])}</span>
                </div>
                <div className="evaluation-reason">
                  <span className="reason-label">이유:</span>
                  <p className="reason-text">{evaluation["1.2 그렇게 생각한 이유는 무엇인가요?"]}</p>
                </div>
                
                <div className="evaluation-question">
                  <span className="q-label">팀 구조는 적절했나요?</span>
                  <span className="q-answer">{convertLikertScale(evaluation["1.3 해당 팀의 구조 (조직도)는 적절히 설계되었나요? "])}</span>
                </div>
                <div className="evaluation-reason">
                  <span className="reason-label">이유:</span>
                  <p className="reason-text">{evaluation["1.4 그렇게 생각한 이유는 무엇인가요?"]}</p>
                </div>
                
                <div className="evaluation-question">
                  <span className="q-label">팀원들이 조직도에 부합하여 업무를 수행했나요?</span>
                  <span className="q-answer">{convertLikertScale(evaluation["1.5 각 팀원들이 해당 조직도에 부합하여 업무를 수행했다고 생각하나요?"])}</span>
                </div>
                <div className="evaluation-reason">
                  <span className="reason-label">이유:</span>
                  <p className="reason-text">{evaluation["1.6 그 이유는 무엇인가요?"]}</p>
                </div>
              </div>
            </div>

            {/* 팀원별 평가 */}
            <div className="evaluation-section">
              <h4>팀원별 평가</h4>
              <div className="team-members-evaluation">
                {['A', 'B', 'C', 'D', 'E', "'나'"].map(member => {
                  const memberKey = member === "'나'" ? "팀원 '나'" : `팀원 ${member}`;
                  const hasData = Object.keys(evaluation).some(key => key.includes(memberKey));
                  
                  if (!hasData) return null;
                  
                  return (
                    <div key={member} className="member-evaluation">
                      <h5>팀원 {member}</h5>
                      <div className="member-ratings">
                        <div className="rating-item">
                          <span className="rating-label">역할 수행</span>
                          <span className="rating-value">
                            {convertLikertScale(evaluation[`${memberKey}에 대해 답변해주세요. [이 팀원은 부여된 역할을 잘 수행하였다.]`])}
                          </span>
                        </div>
                        <div className="rating-item">
                          <span className="rating-label">페르소나 적합성</span>
                          <span className="rating-value">
                            {convertLikertScale(evaluation[`${memberKey}에 대해 답변해주세요. [이 팀원은 자신의 페르소나에 어울리게 행동했다.]`])}
                          </span>
                        </div>
                        <div className="rating-item">
                          <span className="rating-label">팀 기여도</span>
                          <span className="rating-value">
                            {convertLikertScale(evaluation[`${memberKey}에 대해 답변해주세요. [이 팀원은 팀 성과에 기여했다]`])}
                          </span>
                        </div>
                        <div className="rating-item">
                          <span className="rating-label">팀 필요성</span>
                          <span className="rating-value">
                            {convertLikertScale(evaluation[`${memberKey}에 대해 답변해주세요. [이 팀원은 팀에 필요한 존재이다]`])}
                          </span>
                        </div>
                      </div>
                      <div className="member-comment">
                        <span className="comment-label">한줄평:</span>
                        <p className="comment-text">
                          {evaluation[`${memberKey}에 대한 한줄평을 작성해주세요.`]}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 공유 멘탈 모델 평가 */}
            <div className="evaluation-section">
              <h4>공유 멘탈 모델</h4>
              <div className="evaluation-content">
                <div className="evaluation-question">
                  <span className="q-label">공유 멘탈 모델이 적절했나요?</span>
                  <span className="q-answer">{convertLikertScale(evaluation["3.1 해당 팀의 공유 멘탈 모델은 팀이 운영되는데 있어서 적절했나요? (또는 도움이 되었나요?)"])}</span>
                </div>
                <div className="evaluation-reason">
                  <span className="reason-label">이유:</span>
                  <p className="reason-text">{evaluation["3.2 그렇게 생각한 이유는 무엇인가요?"]}</p>
                </div>
                
                <div className="evaluation-question">
                  <span className="q-label">팀원들이 공유 멘탈 모델을 고려하여 행동했나요?</span>
                  <span className="q-answer">{convertLikertScale(evaluation["3.3 팀원들이 공유 멘탈 모델을 고려하여 행동했다고 느껴지나요?"])}</span>
                </div>
                <div className="evaluation-reason">
                  <span className="reason-label">이유:</span>
                  <p className="reason-text">{evaluation["3.4 그렇게 생각한(느낀) 이유는 무엇인가요?"]}</p>
                </div>
              </div>
            </div>

            {/* 팀 성과 평가 */}
            <div className="evaluation-section">
              <h4>팀 성과</h4>
              <div className="evaluation-content">
                <div className="evaluation-question">
                  <span className="q-label">뛰어난 업무 성과를 냈나요?</span>
                  <span className="q-answer">{convertLikertScale(evaluation["4.1 이 팀은 주어진 시간동안 뛰어난 업무 성과를 냈나요? (아이디어를 냈나요?)"])}</span>
                </div>
                <div className="evaluation-reason">
                  <span className="reason-label">이유:</span>
                  <p className="reason-text">{evaluation["4.2 그렇게 생각한 이유는 무엇인가요?"]}</p>
                </div>
                
                <div className="evaluation-question">
                  <span className="q-label">팀워크를 보였나요?</span>
                  <span className="q-answer">{convertLikertScale(evaluation["4.3 이 팀의 팀워크 (또는 팀 케미스트리)를 보였다."])}</span>
                </div>
                <div className="evaluation-reason">
                  <span className="reason-label">이유:</span>
                  <p className="reason-text">{evaluation["4.4 그렇게 생각한 이유는 무엇인가요?"]}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="team-detail">
      <div className="team-detail-header">
        <button className="back-btn" onClick={onBack}>
          ← 목록으로 돌아가기
        </button>
        <h1>팀 상세 정보</h1>
      </div>
      
      <div className="team-detail-tabs">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          개요
        </button>
        <button 
          className={`tab-btn ${activeTab === 'agents' ? 'active' : ''}`}
          onClick={() => setActiveTab('agents')}
        >
          팀 멤버
        </button>
        <button 
          className={`tab-btn ${activeTab === 'network' ? 'active' : ''}`}
          onClick={() => setActiveTab('network')}
        >
          네트워크
        </button>
        <button 
          className={`tab-btn ${activeTab === 'ideas' ? 'active' : ''}`}
          onClick={() => setActiveTab('ideas')}
        >
          아이디어
        </button>
        <button 
          className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          활동
        </button>
        <button 
          className={`tab-btn ${activeTab === 'evaluations' ? 'active' : ''}`}
          onClick={() => setActiveTab('evaluations')}
        >
          평가
        </button>
      </div>
      
      <div className="team-detail-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'agents' && renderAgents()}
        {activeTab === 'network' && renderNetwork()}
        {activeTab === 'ideas' && renderIdeas()}
        {activeTab === 'activity' && renderActivityData()}
        {activeTab === 'evaluations' && renderEvaluations()}
      </div>
    </div>
  );
};

export default TeamDetail;