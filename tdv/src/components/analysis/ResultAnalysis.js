import React, { useState } from 'react';
import ActivityStatsDisplay from '../common/ActivityStatsDisplay';
import { calculateTeamActivityStats, generateStatsSummary } from '../../utils/teamDataCalculator';

const ResultAnalysis = ({ teams, analysisData }) => {
  const [activeResultTab, setActiveResultTab] = useState('generation');
  const [expandedSessionDetails, setExpandedSessionDetails] = useState(false);
  
  if (!teams || teams.length === 0 || !analysisData) {
    return <div>데이터를 로딩 중입니다...</div>;
  }

  // 사용자 정의 이름 찾기 함수 (중복 제거)
  const getUserDefinedName = (team) => {
    try {
      // 1. members에서 isUser: true인 멤버의 userProfile.name 확인 (최우선)
      const members = typeof team.team_info?.members === 'string' ? 
        JSON.parse(team.team_info.members) : team.team_info?.members || [];
      const userMember = members.find(member => member.isUser === true);
      if (userMember && userMember.userProfile && userMember.userProfile.name) {
        return userMember.userProfile.name;
      } else {
        // 2. relationships에서 '나' 노드 찾기 (특별한 경우)
        const relationships = typeof team.team_info?.relationships === 'string' ?
          JSON.parse(team.team_info.relationships) : team.team_info?.relationships || [];
        
        const hasNaNode = relationships.some(rel => rel.from === '나' || rel.to === '나');
        if (hasNaNode) {
          return '나';
        } else {
          // 3. nodePositions에서도 '나' 확인 (추가 체크)
          const nodePositions = typeof team.team_info?.nodePositions === 'string' ?
            JSON.parse(team.team_info.nodePositions) : team.team_info?.nodePositions || {};
          
          if (nodePositions['나']) {
            return '나';
          } else {
            // 4. relationships에서 agent_가 아닌 노드 찾기
            const allNodes = new Set();
            relationships.forEach(rel => {
              allNodes.add(rel.from);
              allNodes.add(rel.to);
            });
            
            const userNodes = Array.from(allNodes).filter(node => 
              !node.startsWith('agent_') && node !== 'Unknown'
            );
            
            if (userNodes.length > 0) {
              return userNodes.includes('나') ? '나' : userNodes[0];
            } else {
              // 5. fallback: owner_info.name 사용
              return team.owner_info?.name || 'Unknown';
            }
          }
        }
      }
    } catch (e) {
      return team.owner_info?.name || 'Unknown';
    }
  };

  // 팀 사이클별로 데이터 분리 (owner별로 구분)
  const getTeamsByOwner = () => {
    const teamsByOwner = {};
    
    teams.forEach((team, index) => {
      const ownerId = team.owner_info?.id || team.team_info?.ownerId || `unknown_${index}`;
      
      if (!teamsByOwner[ownerId]) {
        teamsByOwner[ownerId] = [];
      }
      teamsByOwner[ownerId].push(team);
    });
    
    // 각 owner별로 팀을 생성 시간순으로 정렬
    Object.keys(teamsByOwner).forEach(ownerId => {
      teamsByOwner[ownerId].sort((a, b) => {
        const timeA = new Date(a.team_info?.createdAt || 0);
        const timeB = new Date(b.team_info?.createdAt || 0);
        return timeA - timeB;
      });
    });
    
    return teamsByOwner;
  };

  // 사이클별로 팀 분리 (각 사용자의 1번째, 2번째, 3번째 팀)
  const getTeamsByPhase = (phase) => {
    const teamsByOwner = getTeamsByOwner();
    const phaseTeams = [];
    
    Object.values(teamsByOwner).forEach(ownerTeams => {
      if (ownerTeams[phase - 1]) { // phase는 1,2,3이므로 배열 인덱스는 0,1,2
        phaseTeams.push(ownerTeams[phase - 1]);
      }
    });
    
    return phaseTeams;
  };

  const team1Data = getTeamsByPhase(1);
  const team2Data = getTeamsByPhase(2);
  const team3Data = getTeamsByPhase(3);

  // 통계 계산 함수
  const calculateStats = (values) => {
    if (values.length === 0) return { avg: 0, min: 0, max: 0, stdev: 0 };
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
    const stdev = parseFloat(Math.sqrt(variance).toFixed(2));
    return {
      avg: parseFloat(avg.toFixed(2)),
      min,
      max,
      stdev: parseFloat(stdev.toFixed(2))
    };
  };

  // 각 팀의 아이디어 개수 계산
  const getIdeaCounts = (teamData) => {
    return teamData.map(team => {
      const ideas = team.ideas || [];
      return ideas.length;
    });
  };

  // 사용자/에이전트별 아이디어 개수 계산
  const getIdeaCountsByUserType = (teamData) => {
    const userCounts = [];
    const agentCounts = [];
    
    teamData.forEach(team => {
      const ideas = team.ideas || [];
      let userIdeasCount = 0;
      let agentIdeasCount = 0;
      
      ideas.forEach(ideaStr => {
        try {
          const idea = typeof ideaStr === 'string' ? JSON.parse(ideaStr) : ideaStr;
          
          // 아이디어 생성자 확인
          const creator = idea.creator || idea.sender || idea.author || '';
          const sender = idea.sender || '';
          
          
          const isUser = creator === '나' || sender === '나' || 
                        creator.includes('user') || sender.includes('user');
          
          const isAgent = creator.startsWith('agent_') || sender.startsWith('agent_') ||
                         creator.includes('agent') || sender.includes('agent');
          
          if (isUser) {
            userIdeasCount++;
          } else if (isAgent) {
            agentIdeasCount++;
          } else {
            // 명확하지 않은 경우 기본적으로 에이전트로 분류
            agentIdeasCount++;
          }
        } catch (e) {
          console.warn('Failed to parse idea for count:', ideaStr, e);
          // JSON 파싱 실패 시 에이전트로 분류
          agentIdeasCount++;
        }
      });
      
      userCounts.push(userIdeasCount);
      agentCounts.push(agentIdeasCount);
    });
    
    return { userCounts, agentCounts };
  };

  // 아이디어 속성별 길이 계산 함수
  const getIdeaAttributeLengths = (teamData, attribute) => {
    const lengths = [];
    
    teamData.forEach(team => {
      const ideas = team.ideas || [];
      ideas.forEach(ideaStr => {
        try {
          // ideas 배열의 각 항목은 JSON 문자열로 저장되어 있음
          const idea = typeof ideaStr === 'string' ? JSON.parse(ideaStr) : ideaStr;
          let content = idea.content?.[attribute];
          
          if (content && typeof content === 'string') {
            // behavior와 structure는 JSON 문자열로 저장되어 있어서 실제 내용만 추출
            if (attribute === 'behavior' || attribute === 'structure') {
              try {
                const parsedContent = JSON.parse(content);
                // JSON 객체의 모든 값들을 추출하여 하나의 문자열로 합침
                const extractValues = (obj) => {
                  let values = [];
                  for (const key in obj) {
                    if (typeof obj[key] === 'object' && obj[key] !== null) {
                      values = values.concat(extractValues(obj[key]));
                    } else if (typeof obj[key] === 'string') {
                      values.push(obj[key]);
                    }
                  }
                  return values;
                };
                const allValues = extractValues(parsedContent);
                content = allValues.join(' '); // 모든 값들을 공백으로 연결
              } catch (jsonError) {
                // JSON 파싱 실패 시 원본 문자열 사용
                console.warn('Failed to parse JSON content:', content, jsonError);
              }
            }
            
            // 한글 음절 개수 계산 (한글: 1음절, 영어/숫자: 0.5음절로 계산)
            const koreanLength = (content.match(/[가-힣]/g) || []).length;
            const otherLength = (content.match(/[^\가-힣\s]/g) || []).length * 0.5;
            lengths.push(Math.round(koreanLength + otherLength));
          }
        } catch (e) {
          // JSON 파싱 실패 시 무시
          console.warn('Failed to parse idea:', ideaStr, e);
        }
      });
    });
    
    return lengths;
  };

  // 아이디어 통계 계산
  const team1Ideas = getIdeaCounts(team1Data);
  const team2Ideas = getIdeaCounts(team2Data);
  const team3Ideas = getIdeaCounts(team3Data);
  const allIdeas = [...team1Ideas, ...team2Ideas, ...team3Ideas];

  const ideaCountStats = {
    team1: calculateStats(team1Ideas),
    team2: calculateStats(team2Ideas),
    team3: calculateStats(team3Ideas),
    total: calculateStats(allIdeas)
  };

  // 사용자/에이전트별 아이디어 개수 통계
  const team1IdeaCountsByType = getIdeaCountsByUserType(team1Data);
  const team2IdeaCountsByType = getIdeaCountsByUserType(team2Data);
  const team3IdeaCountsByType = getIdeaCountsByUserType(team3Data);


  const ideaCountStatsByType = {
    team1: {
      user: calculateStats(team1IdeaCountsByType.userCounts),
      agent: calculateStats(team1IdeaCountsByType.agentCounts),
      total: calculateStats([...team1IdeaCountsByType.userCounts, ...team1IdeaCountsByType.agentCounts]),
      userTotal: team1IdeaCountsByType.userCounts.reduce((sum, count) => sum + count, 0),
      agentTotal: team1IdeaCountsByType.agentCounts.reduce((sum, count) => sum + count, 0)
    },
    team2: {
      user: calculateStats(team2IdeaCountsByType.userCounts),
      agent: calculateStats(team2IdeaCountsByType.agentCounts),
      total: calculateStats([...team2IdeaCountsByType.userCounts, ...team2IdeaCountsByType.agentCounts]),
      userTotal: team2IdeaCountsByType.userCounts.reduce((sum, count) => sum + count, 0),
      agentTotal: team2IdeaCountsByType.agentCounts.reduce((sum, count) => sum + count, 0)
    },
    team3: {
      user: calculateStats(team3IdeaCountsByType.userCounts),
      agent: calculateStats(team3IdeaCountsByType.agentCounts),
      total: calculateStats([...team3IdeaCountsByType.userCounts, ...team3IdeaCountsByType.agentCounts]),
      userTotal: team3IdeaCountsByType.userCounts.reduce((sum, count) => sum + count, 0),
      agentTotal: team3IdeaCountsByType.agentCounts.reduce((sum, count) => sum + count, 0)
    },
    total: {
      user: calculateStats([
        ...team1IdeaCountsByType.userCounts,
        ...team2IdeaCountsByType.userCounts,
        ...team3IdeaCountsByType.userCounts
      ]),
      agent: calculateStats([
        ...team1IdeaCountsByType.agentCounts,
        ...team2IdeaCountsByType.agentCounts,
        ...team3IdeaCountsByType.agentCounts
      ]),
      total: calculateStats([
        ...team1IdeaCountsByType.userCounts, ...team1IdeaCountsByType.agentCounts,
        ...team2IdeaCountsByType.userCounts, ...team2IdeaCountsByType.agentCounts,
        ...team3IdeaCountsByType.userCounts, ...team3IdeaCountsByType.agentCounts
      ]),
      userTotal: [
        ...team1IdeaCountsByType.userCounts,
        ...team2IdeaCountsByType.userCounts,
        ...team3IdeaCountsByType.userCounts
      ].reduce((sum, count) => sum + count, 0),
      agentTotal: [
        ...team1IdeaCountsByType.agentCounts,
        ...team2IdeaCountsByType.agentCounts,
        ...team3IdeaCountsByType.agentCounts
      ].reduce((sum, count) => sum + count, 0)
    }
  };

  // 아이디어 속성별 길이 통계
  const calculateAttributeStats = (attribute) => {
    const team1Lengths = getIdeaAttributeLengths(team1Data, attribute);
    const team2Lengths = getIdeaAttributeLengths(team2Data, attribute);
    const team3Lengths = getIdeaAttributeLengths(team3Data, attribute);
    const totalLengths = [...team1Lengths, ...team2Lengths, ...team3Lengths];

    return {
      team1: calculateStats(team1Lengths),
      team2: calculateStats(team2Lengths),
      team3: calculateStats(team3Lengths),
      total: calculateStats(totalLengths)
    };
  };

  const objectStats = calculateAttributeStats('object');
  const functionStats = calculateAttributeStats('function');
  const behaviorStats = calculateAttributeStats('behavior');
  const structureStats = calculateAttributeStats('structure');

  // Object + Function + Behavior + Structure 총합 길이 계산 (사용자/에이전트별)
  const getTotalAttributeLengths = (teamData) => {
    const userLengths = [];
    const agentLengths = [];
    
    teamData.forEach(team => {
      const ideas = team.ideas || [];
      ideas.forEach(ideaStr => {
        try {
          const idea = typeof ideaStr === 'string' ? JSON.parse(ideaStr) : ideaStr;
          
          // 각 속성의 길이 계산
          let totalLength = 0;
          ['object', 'function', 'behavior', 'structure'].forEach(attribute => {
            let content = idea.content?.[attribute];
            
            if (content && typeof content === 'string') {
              // behavior와 structure는 JSON 문자열로 저장되어 있어서 실제 내용만 추출
              if (attribute === 'behavior' || attribute === 'structure') {
                try {
                  const parsedContent = JSON.parse(content);
                  const extractValues = (obj) => {
                    let values = [];
                    for (const key in obj) {
                      if (typeof obj[key] === 'object' && obj[key] !== null) {
                        values = values.concat(extractValues(obj[key]));
                      } else if (typeof obj[key] === 'string') {
                        values.push(obj[key]);
                      }
                    }
                    return values;
                  };
                  const allValues = extractValues(parsedContent);
                  content = allValues.join(' ');
                } catch (jsonError) {
                  // JSON 파싱 실패 시 원본 문자열 사용
                }
              }
              
              // 한글 음절 개수 계산
              const koreanLength = (content.match(/[가-힣]/g) || []).length;
              const otherLength = (content.match(/[^\가-힣\s]/g) || []).length * 0.5;
              totalLength += Math.round(koreanLength + otherLength);
            }
          });
          
          // 아이디어 생성자 확인 (사용자 vs 에이전트)
          // 여러 가능한 creator 필드 확인
          const creator = idea.creator || idea.sender || idea.author || '';
          const sender = idea.sender || '';
          
          // 사용자 식별: '나', 'user' 포함, 또는 agent가 아닌 경우
          const isUser = creator === '나' || sender === '나' || 
                        creator.includes('user') || sender.includes('user');
          
          // 에이전트 식별: agent로 시작하거나 포함하는 경우
          const isAgent = creator.startsWith('agent_') || sender.startsWith('agent_') ||
                         creator.includes('agent') || sender.includes('agent');
          
          if (isUser) {
            userLengths.push(totalLength);
          } else if (isAgent) {
            agentLengths.push(totalLength);
          } else {
            // 명확하지 않은 경우 기본적으로 에이전트로 분류 (사용자가 명시적이지 않은 경우)
            agentLengths.push(totalLength);
          }
        } catch (e) {
          console.warn('Failed to parse idea for total length:', ideaStr, e);
        }
      });
    });
    
    return { userLengths, agentLengths };
  };

  // 각 사이클별 총합 길이 통계
  const team1TotalLengths = getTotalAttributeLengths(team1Data);
  const team2TotalLengths = getTotalAttributeLengths(team2Data);
  const team3TotalLengths = getTotalAttributeLengths(team3Data);
  
  const totalAttributeLengthStats = {
    team1: {
      user: calculateStats(team1TotalLengths.userLengths),
      agent: calculateStats(team1TotalLengths.agentLengths),
      total: calculateStats([...team1TotalLengths.userLengths, ...team1TotalLengths.agentLengths])
    },
    team2: {
      user: calculateStats(team2TotalLengths.userLengths),
      agent: calculateStats(team2TotalLengths.agentLengths),
      total: calculateStats([...team2TotalLengths.userLengths, ...team2TotalLengths.agentLengths])
    },
    team3: {
      user: calculateStats(team3TotalLengths.userLengths),
      agent: calculateStats(team3TotalLengths.agentLengths),
      total: calculateStats([...team3TotalLengths.userLengths, ...team3TotalLengths.agentLengths])
    },
    total: {
      user: calculateStats([
        ...team1TotalLengths.userLengths,
        ...team2TotalLengths.userLengths,
        ...team3TotalLengths.userLengths
      ]),
      agent: calculateStats([
        ...team1TotalLengths.agentLengths,
        ...team2TotalLengths.agentLengths,
        ...team3TotalLengths.agentLengths
      ]),
      total: calculateStats([
        ...team1TotalLengths.userLengths, ...team1TotalLengths.agentLengths,
        ...team2TotalLengths.userLengths, ...team2TotalLengths.agentLengths,
        ...team3TotalLengths.userLengths, ...team3TotalLengths.agentLengths
      ])
    }
  };

  // 평가 데이터 계산
  const getEvaluationData = (teamData) => {
    const evaluations = [];
    teamData.forEach(team => {
      const teamEvals = team.evaluations || [];
      evaluations.push(...teamEvals);
    });
    return evaluations;
  };

  // 최소/최대 팀 정보 계산
  const getMinMaxTeamInfo = (teamData, ideaCounts, cycleNum) => {
    if (ideaCounts.length === 0) return { minTeam: null, maxTeam: null };
    
    const minCount = Math.min(...ideaCounts);
    const maxCount = Math.max(...ideaCounts);
    
    const minIndex = ideaCounts.indexOf(minCount);
    const maxIndex = ideaCounts.indexOf(maxCount);
    
    const getTeamLabel = (team, index) => {
      const ownerName = team.owner_info?.name || team.team_info?.ownerId || 'Unknown';
      const participantId = `P${Object.keys(getTeamsByOwner()).indexOf(team.owner_info?.id || team.team_info?.ownerId) + 1}`;
      return `${participantId}T${cycleNum}`;
    };
    
    return {
      minTeam: teamData[minIndex] ? {
        label: getTeamLabel(teamData[minIndex], minIndex),
        count: minCount,
        name: teamData[minIndex].team_info?.teamName || '이름 없음'
      } : null,
      maxTeam: teamData[maxIndex] ? {
        label: getTeamLabel(teamData[maxIndex], maxIndex),
        count: maxCount,
        name: teamData[maxIndex].team_info?.teamName || '이름 없음'
      } : null
    };
  };

  const team1MinMax = getMinMaxTeamInfo(team1Data, team1Ideas, 1);
  const team2MinMax = getMinMaxTeamInfo(team2Data, team2Ideas, 2);
  const team3MinMax = getMinMaxTeamInfo(team3Data, team3Ideas, 3);

  const team1Evaluations = getEvaluationData(team1Data);
  const team2Evaluations = getEvaluationData(team2Data);  
  const team3Evaluations = getEvaluationData(team3Data);
  const allEvaluations = [...team1Evaluations, ...team2Evaluations, ...team3Evaluations];

  const evaluationStats = {
    team1: {
      totalEvaluations: team1Evaluations.length,
      avgPerTeam: team1Data.length > 0 ? parseFloat((team1Evaluations.length / team1Data.length).toFixed(2)) : 0,
      minPerTeam: team1Data.length > 0 ? Math.min(...team1Data.map(team => (team.evaluations || []).length)) : 0,
      maxPerTeam: team1Data.length > 0 ? Math.max(...team1Data.map(team => (team.evaluations || []).length)) : 0,
      stdevPerTeam: 0 // 계산 복잡성으로 인해 추후 구현
    },
    team2: {
      totalEvaluations: team2Evaluations.length,
      avgPerTeam: team2Data.length > 0 ? parseFloat((team2Evaluations.length / team2Data.length).toFixed(2)) : 0,
      minPerTeam: team2Data.length > 0 ? Math.min(...team2Data.map(team => (team.evaluations || []).length)) : 0,
      maxPerTeam: team2Data.length > 0 ? Math.max(...team2Data.map(team => (team.evaluations || []).length)) : 0,
      stdevPerTeam: 0
    },
    team3: {
      totalEvaluations: team3Evaluations.length,
      avgPerTeam: team3Data.length > 0 ? parseFloat((team3Evaluations.length / team3Data.length).toFixed(2)) : 0,
      minPerTeam: team3Data.length > 0 ? Math.min(...team3Data.map(team => (team.evaluations || []).length)) : 0,
      maxPerTeam: team3Data.length > 0 ? Math.max(...team3Data.map(team => (team.evaluations || []).length)) : 0,
      stdevPerTeam: 0
    },
    total: {
      totalEvaluations: allEvaluations.length,
      avgPerTeam: teams.length > 0 ? parseFloat((allEvaluations.length / teams.length).toFixed(2)) : 0,
      minPerTeam: teams.length > 0 ? Math.min(...teams.map(team => (team.evaluations || []).length)) : 0,
      maxPerTeam: teams.length > 0 ? Math.max(...teams.map(team => (team.evaluations || []).length)) : 0,
      stdevPerTeam: 0
    }
  };

  // 요청 데이터 분석 함수 (make_request 타입 메시지 분석)
  const getRequestData = (teamData, cycleNum = 0) => {
    const requestCounts = [];
    const requestLengths = [];
    
    // 사용자 vs AI 요청 분리
    const userRequests = [];
    const aiRequests = [];
    
    // 요청자별 개시 횟수 추적 (SD 계산용)
    const userRequestCounts = [];
    const aiRequestCounts = [];
    
    // 각 팀별로 사용자 요청 횟수를 분리하여 계산
    const allUserRequestCounts = [];
    
    // 요청 유형별 카운팅 (사용자 vs AI 분류)
    const typeAnalysis = {
      generate: { user: 0, ai: 0, total: 0 },
      evaluate: { user: 0, ai: 0, total: 0 },
      feedback: { user: 0, ai: 0, total: 0 },
      other: { user: 0, ai: 0, total: 0 }
    };
    
    // 기타(빈 requestType) 케이스 저장
    const otherExamples = [];
    
    teamData.forEach(team => {
      let teamRequestCount = 0;
      let teamUserRequests = 0;
      
      if (team.chat) {
        team.chat.forEach(chatItem => {
          try {
            let messageData;
            if (typeof chatItem === 'string') {
              messageData = JSON.parse(chatItem);
            } else {
              messageData = chatItem;
            }
            
            if (messageData.type === 'make_request') {
              teamRequestCount++;
              
              // 요청 내용의 길이 계산
              const content = messageData.payload?.content || '';
              const koreanLength = (content.match(/[가-힣]/g) || []).length;
              const otherLength = (content.match(/[^\가-힣\s]/g) || []).length * 0.5;
              const requestLength = Math.round(koreanLength + otherLength);
              
              requestLengths.push(requestLength);
              
              // 요청 유형 분석 및 요청자 구분
              const requestType = messageData.payload?.requestType || '';
              const sender = messageData.sender || '';
              const isUser = sender === '나' || sender.includes('user') || content.includes('James Lee');
              
              let requestCategory = null;
              
              if (requestType === 'generate' || requestType === 'generate_idea') {
                requestCategory = 'generate';
              } else if (requestType === 'evaluate' || requestType === 'evaluate_idea') {
                requestCategory = 'evaluate';
              } else if (requestType === 'give_feedback') {
                requestCategory = 'feedback';
              } else {
                // requestType이 빈 값인 경우 내용으로 판단
                if (!requestType) {
                  // 아이디어 생성 관련 키워드 체크
                  const ideaGenerationKeywords = [
                    '아이디어', '제안', '생각', '방식', '방법', '개발', '설계', 
                    '창의', '혁신', '컨셉', '솔루션', '디자인', '기획', '구상',
                    '토의', '토론', '브레인스토밍', '상상', '발상', '전략'
                  ];
                  
                  const isIdeaGeneration = ideaGenerationKeywords.some(keyword => 
                    content.includes(keyword)
                  );
                  
                  if (isIdeaGeneration) {
                    requestCategory = 'generate';
                  } else {
                    requestCategory = 'other';
                    // 기타 케이스 저장 (최대 10개까지)
                    if (otherExamples.length < 10) {
                      otherExamples.push({
                        teamId: team.team_id,
                        messageId: messageData.id,
                        sender: messageData.sender,
                        requestType: requestType,
                        content: content,
                        timestamp: messageData.timestamp
                      });
                    }
                  }
                } else {
                  requestCategory = 'other';
                  // 기타 케이스 저장 (최대 10개까지)
                  if (otherExamples.length < 10) {
                    otherExamples.push({
                      teamId: team.team_id,
                      messageId: messageData.id,
                      sender: messageData.sender,
                      requestType: requestType,
                      content: content,
                      timestamp: messageData.timestamp
                    });
                  }
                }
              }
              
              // 요청자별 카운팅
              if (requestCategory) {
                if (isUser) {
                  typeAnalysis[requestCategory].user++;
                } else {
                  typeAnalysis[requestCategory].ai++;
                }
                typeAnalysis[requestCategory].total++;
              }
              
              // 요청자 구분 (사용자 vs AI) - 길이 분석용
              if (isUser) {
                userRequests.push(requestLength);
                teamUserRequests++;
              } else if (sender.startsWith('agent_')) {
                aiRequests.push(requestLength);
                
                // AI 개별 요청자별 카운팅
                const existingAiIndex = aiRequestCounts.findIndex(a => a.participantId === sender);
                if (existingAiIndex >= 0) {
                  aiRequestCounts[existingAiIndex].count++;
                } else {
                  aiRequestCounts.push({ participantId: sender, count: 1 });
                }
              }
            }
          } catch (e) {
            // JSON 파싱 실패 시 무시
          }
        });
      }
      
      requestCounts.push(teamRequestCount);
      allUserRequestCounts.push(teamUserRequests);
    });

    // AI별 요청 횟수 분석 (SD 계산용) - 중복 없이
    const allAiRequestCounts = [];
    const uniqueAiAgents = new Set();
    
    teamData.forEach(team => {
      try {
        const members = JSON.parse(team.team_info?.members || '[]');
        members.forEach(member => {
          if (member.roles && member.roles.includes('요청하기') && !member.isUser) {
            const participantId = member.agentId;
            if (!uniqueAiAgents.has(participantId)) {
              uniqueAiAgents.add(participantId);
              const existingCount = aiRequestCounts.find(a => a.participantId === participantId);
              allAiRequestCounts.push(existingCount ? existingCount.count : 0);
            }
          }
        });
      } catch (e) {
        // 파싱 실패 시 기본 5개 AI 에이전트
        for (let i = 0; i < 5; i++) {
          const agentId = `agent_${i}`;
          if (!uniqueAiAgents.has(agentId)) {
            uniqueAiAgents.add(agentId);
            allAiRequestCounts.push(aiRequestCounts.find(a => a.participantId === agentId)?.count || 0);
          }
        }
      }
    });

    // 최소/최대 팀 정보 계산
    let minMaxTeamInfo = { minTeam: null, maxTeam: null };
    if (requestCounts.length > 0 && cycleNum > 0) {
      const minCount = Math.min(...requestCounts);
      const maxCount = Math.max(...requestCounts);
      const minIndex = requestCounts.indexOf(minCount);
      const maxIndex = requestCounts.indexOf(maxCount);
      
      minMaxTeamInfo = {
        minTeam: minIndex >= 0 ? `P${cycleNum}T${minIndex + 1} (${minCount}회)` : null,
        maxTeam: maxIndex >= 0 ? `P${cycleNum}T${maxIndex + 1} (${maxCount}회)` : null
      };
    } else {
      minMaxTeamInfo = {
        minTeam: requestCounts.length > 0 ? Math.min(...requestCounts) : null,
        maxTeam: requestCounts.length > 0 ? Math.max(...requestCounts) : null
      };
    }

    // 요청 유형별 백분율 계산
    const totalRequestsForPercentage = typeAnalysis.generate.total + typeAnalysis.evaluate.total + typeAnalysis.feedback.total + typeAnalysis.other.total;
    const typeAnalysisWithPercent = {
      ...typeAnalysis,
      generatePercent: totalRequestsForPercentage > 0 ? Math.round((typeAnalysis.generate.total / totalRequestsForPercentage) * 100) : 0,
      evaluatePercent: totalRequestsForPercentage > 0 ? Math.round((typeAnalysis.evaluate.total / totalRequestsForPercentage) * 100) : 0,
      feedbackPercent: totalRequestsForPercentage > 0 ? Math.round((typeAnalysis.feedback.total / totalRequestsForPercentage) * 100) : 0,
      otherPercent: totalRequestsForPercentage > 0 ? Math.round((typeAnalysis.other.total / totalRequestsForPercentage) * 100) : 0
    };

    return {
      requestCounts,
      requestLengths,
      userRequests,
      aiRequests,
      totalRequests: requestCounts.reduce((sum, count) => sum + count, 0),
      totalRequestMessages: requestLengths.length,
      userRequestStats: calculateStats(allUserRequestCounts), // 사용자 요청 통계 (평균, SD 포함)
      aiRequestStats: calculateStats(allAiRequestCounts), // AI 요청 통계 (평균, SD 포함)
      totalUserRequesters: 1, // 일반적으로 사용자 한 명
      totalAiRequesters: uniqueAiAgents.size, // 요청 역할을 가진 AI 수
      minMaxTeamInfo,
      typeAnalysis: typeAnalysisWithPercent, // 요청 유형별 분석 (백분율 포함)
      otherExamples // 기타 케이스 예시
    };
  };

  // 평가 데이터 분석 함수
  const getDetailedEvaluationData = (teamData, cycleNum = 0) => {
    const evaluationCounts = [];
    const noveltyScores = [];
    const completenessScores = [];
    const qualityScores = [];
    const commentLengths = [];
    
    // 사용자 vs AI 평가 분리
    const userEvaluations = {
      novelty: [],
      completeness: [],
      quality: [],
      comments: []
    };
    const aiEvaluations = {
      novelty: [],
      completeness: [],
      quality: [],
      comments: []
    };

    teamData.forEach(team => {
      const ideas = team.ideas || [];
      let teamEvaluationCount = 0;

      ideas.forEach(ideaStr => {
        try {
          const idea = typeof ideaStr === 'string' ? JSON.parse(ideaStr) : ideaStr;
          const evaluations = idea.evaluations || [];
          
          teamEvaluationCount += evaluations.length;

          evaluations.forEach(evaluation => {
            const scores = evaluation.scores || {};
            const evaluator = evaluation.evaluator || '';
            
            // 개별 점수 수집
            if (typeof scores.novelty === 'number') {
              noveltyScores.push(scores.novelty);
              if (evaluator === '나') {
                userEvaluations.novelty.push(scores.novelty);
              } else {
                aiEvaluations.novelty.push(scores.novelty);
              }
            }
            if (typeof scores.completeness === 'number') {
              completenessScores.push(scores.completeness);
              if (evaluator === '나') {
                userEvaluations.completeness.push(scores.completeness);
              } else {
                aiEvaluations.completeness.push(scores.completeness);
              }
            }
            if (typeof scores.quality === 'number') {
              qualityScores.push(scores.quality);
              if (evaluator === '나') {
                userEvaluations.quality.push(scores.quality);
              } else {
                aiEvaluations.quality.push(scores.quality);
              }
            }

            // 코멘트 길이 계산
            const comment = evaluation.comment || '';
            if (comment) {
              const koreanLength = (comment.match(/[가-힣]/g) || []).length;
              const otherLength = (comment.match(/[^\가-힣\s]/g) || []).length * 0.5;
              const commentLength = Math.round(koreanLength + otherLength);
              
              commentLengths.push(commentLength);
              if (evaluator === '나') {
                userEvaluations.comments.push(commentLength);
              } else {
                aiEvaluations.comments.push(commentLength);
              }
            }
          });
        } catch (e) {
          console.warn('Failed to parse idea for evaluation:', ideaStr, e);
        }
      });

      evaluationCounts.push(teamEvaluationCount);
    });

    // 최소/최대 팀 정보 계산
    let minMaxTeamInfo = { minTeam: null, maxTeam: null };
    if (evaluationCounts.length > 0 && cycleNum > 0) {
      const minCount = Math.min(...evaluationCounts);
      const maxCount = Math.max(...evaluationCounts);
      const minIndex = evaluationCounts.indexOf(minCount);
      const maxIndex = evaluationCounts.indexOf(maxCount);
      
      minMaxTeamInfo = {
        minTeam: minIndex >= 0 ? `P${cycleNum}T${minIndex + 1} (${minCount}회)` : null,
        maxTeam: maxIndex >= 0 ? `P${cycleNum}T${maxIndex + 1} (${maxCount}회)` : null
      };
    }

    return {
      evaluationCounts,
      noveltyScores,
      completenessScores,
      qualityScores,
      commentLengths,
      userEvaluations,
      aiEvaluations,
      totalEvaluations: evaluationCounts.reduce((sum, count) => sum + count, 0),
      minMaxTeamInfo
    };
  };

  const team1RequestData = getRequestData(team1Data, 1);
  const team2RequestData = getRequestData(team2Data, 2);
  const team3RequestData = getRequestData(team3Data, 3);
  const totalRequestData = getRequestData(teams, 0);

  // 각 사이클별 평가 데이터
  const team1EvalData = getDetailedEvaluationData(team1Data, 1);
  const team2EvalData = getDetailedEvaluationData(team2Data, 2);
  const team3EvalData = getDetailedEvaluationData(team3Data, 3);
  const totalEvalData = {
    evaluationCounts: [...team1EvalData.evaluationCounts, ...team2EvalData.evaluationCounts, ...team3EvalData.evaluationCounts],
    noveltyScores: [...team1EvalData.noveltyScores, ...team2EvalData.noveltyScores, ...team3EvalData.noveltyScores],
    completenessScores: [...team1EvalData.completenessScores, ...team2EvalData.completenessScores, ...team3EvalData.completenessScores],
    qualityScores: [...team1EvalData.qualityScores, ...team2EvalData.qualityScores, ...team3EvalData.qualityScores],
    commentLengths: [...team1EvalData.commentLengths, ...team2EvalData.commentLengths, ...team3EvalData.commentLengths],
    totalEvaluations: team1EvalData.totalEvaluations + team2EvalData.totalEvaluations + team3EvalData.totalEvaluations,
    userEvaluations: {
      novelty: [...team1EvalData.userEvaluations.novelty, ...team2EvalData.userEvaluations.novelty, ...team3EvalData.userEvaluations.novelty],
      completeness: [...team1EvalData.userEvaluations.completeness, ...team2EvalData.userEvaluations.completeness, ...team3EvalData.userEvaluations.completeness],
      quality: [...team1EvalData.userEvaluations.quality, ...team2EvalData.userEvaluations.quality, ...team3EvalData.userEvaluations.quality],
      comments: [...team1EvalData.userEvaluations.comments, ...team2EvalData.userEvaluations.comments, ...team3EvalData.userEvaluations.comments]
    },
    aiEvaluations: {
      novelty: [...team1EvalData.aiEvaluations.novelty, ...team2EvalData.aiEvaluations.novelty, ...team3EvalData.aiEvaluations.novelty],
      completeness: [...team1EvalData.aiEvaluations.completeness, ...team2EvalData.aiEvaluations.completeness, ...team3EvalData.aiEvaluations.completeness],
      quality: [...team1EvalData.aiEvaluations.quality, ...team2EvalData.aiEvaluations.quality, ...team3EvalData.aiEvaluations.quality],
      comments: [...team1EvalData.aiEvaluations.comments, ...team2EvalData.aiEvaluations.comments, ...team3EvalData.aiEvaluations.comments]
    }
  };


  // 점수 통계 (각 criteria별로 분리)
  const scoreStats = {
    team1: {
      novelty: calculateStats(team1EvalData.noveltyScores),
      completeness: calculateStats(team1EvalData.completenessScores),
      quality: calculateStats(team1EvalData.qualityScores)
    },
    team2: {
      novelty: calculateStats(team2EvalData.noveltyScores),
      completeness: calculateStats(team2EvalData.completenessScores),
      quality: calculateStats(team2EvalData.qualityScores)
    },
    team3: {
      novelty: calculateStats(team3EvalData.noveltyScores),
      completeness: calculateStats(team3EvalData.completenessScores),
      quality: calculateStats(team3EvalData.qualityScores)
    },
    total: {
      novelty: calculateStats(totalEvalData.noveltyScores),
      completeness: calculateStats(totalEvalData.completenessScores),
      quality: calculateStats(totalEvalData.qualityScores)
    }
  };

  // 사용자 vs AI 평가 비교 통계 (사이클별)
  const userVsAiEvalStats = {
    team1: {
      user: {
        novelty: calculateStats(team1EvalData.userEvaluations.novelty),
        completeness: calculateStats(team1EvalData.userEvaluations.completeness),
        quality: calculateStats(team1EvalData.userEvaluations.quality),
        comments: calculateStats(team1EvalData.userEvaluations.comments)
      },
      ai: {
        novelty: calculateStats(team1EvalData.aiEvaluations.novelty),
        completeness: calculateStats(team1EvalData.aiEvaluations.completeness),
        quality: calculateStats(team1EvalData.aiEvaluations.quality),
        comments: calculateStats(team1EvalData.aiEvaluations.comments)
      }
    },
    team2: {
      user: {
        novelty: calculateStats(team2EvalData.userEvaluations.novelty),
        completeness: calculateStats(team2EvalData.userEvaluations.completeness),
        quality: calculateStats(team2EvalData.userEvaluations.quality),
        comments: calculateStats(team2EvalData.userEvaluations.comments)
      },
      ai: {
        novelty: calculateStats(team2EvalData.aiEvaluations.novelty),
        completeness: calculateStats(team2EvalData.aiEvaluations.completeness),
        quality: calculateStats(team2EvalData.aiEvaluations.quality),
        comments: calculateStats(team2EvalData.aiEvaluations.comments)
      }
    },
    team3: {
      user: {
        novelty: calculateStats(team3EvalData.userEvaluations.novelty),
        completeness: calculateStats(team3EvalData.userEvaluations.completeness),
        quality: calculateStats(team3EvalData.userEvaluations.quality),
        comments: calculateStats(team3EvalData.userEvaluations.comments)
      },
      ai: {
        novelty: calculateStats(team3EvalData.aiEvaluations.novelty),
        completeness: calculateStats(team3EvalData.aiEvaluations.completeness),
        quality: calculateStats(team3EvalData.aiEvaluations.quality),
        comments: calculateStats(team3EvalData.aiEvaluations.comments)
      }
    },
    total: {
      user: {
        novelty: calculateStats(totalEvalData.userEvaluations.novelty),
        completeness: calculateStats(totalEvalData.userEvaluations.completeness),
        quality: calculateStats(totalEvalData.userEvaluations.quality),
        comments: calculateStats(totalEvalData.userEvaluations.comments)
      },
      ai: {
        novelty: calculateStats(totalEvalData.aiEvaluations.novelty),
        completeness: calculateStats(totalEvalData.aiEvaluations.completeness),
        quality: calculateStats(totalEvalData.aiEvaluations.quality),
        comments: calculateStats(totalEvalData.aiEvaluations.comments)
      }
    }
  };

  // 사용자 vs AI 요청 비교 통계 (길이별)
  const userVsAiRequestStats = {
    cycle1: {
      user: team1RequestData.userRequests.length > 0 ? calculateStats(team1RequestData.userRequests) : { avg: 0, stdev: 0 },
      ai: team1RequestData.aiRequests.length > 0 ? calculateStats(team1RequestData.aiRequests) : { avg: 0, stdev: 0 },
      combined: [...team1RequestData.userRequests, ...team1RequestData.aiRequests].length > 0 ? 
        calculateStats([...team1RequestData.userRequests, ...team1RequestData.aiRequests]) : { avg: 0, stdev: 0 }
    },
    cycle2: {
      user: team2RequestData.userRequests.length > 0 ? calculateStats(team2RequestData.userRequests) : { avg: 0, stdev: 0 },
      ai: team2RequestData.aiRequests.length > 0 ? calculateStats(team2RequestData.aiRequests) : { avg: 0, stdev: 0 },
      combined: [...team2RequestData.userRequests, ...team2RequestData.aiRequests].length > 0 ? 
        calculateStats([...team2RequestData.userRequests, ...team2RequestData.aiRequests]) : { avg: 0, stdev: 0 }
    },
    cycle3: {
      user: team3RequestData.userRequests.length > 0 ? calculateStats(team3RequestData.userRequests) : { avg: 0, stdev: 0 },
      ai: team3RequestData.aiRequests.length > 0 ? calculateStats(team3RequestData.aiRequests) : { avg: 0, stdev: 0 },
      combined: [...team3RequestData.userRequests, ...team3RequestData.aiRequests].length > 0 ? 
        calculateStats([...team3RequestData.userRequests, ...team3RequestData.aiRequests]) : { avg: 0, stdev: 0 }
    },
    total: {
      user: totalRequestData.userRequests.length > 0 ? calculateStats(totalRequestData.userRequests) : { avg: 0, stdev: 0 },
      ai: totalRequestData.aiRequests.length > 0 ? calculateStats(totalRequestData.aiRequests) : { avg: 0, stdev: 0 },
      combined: [...totalRequestData.userRequests, ...totalRequestData.aiRequests].length > 0 ? 
        calculateStats([...totalRequestData.userRequests, ...totalRequestData.aiRequests]) : { avg: 0, stdev: 0 }
    }
  };

  // 코멘트 길이 통계
  const commentStats = {
    team1: calculateStats(team1EvalData.commentLengths),
    team2: calculateStats(team2EvalData.commentLengths),
    team3: calculateStats(team3EvalData.commentLengths),
    total: calculateStats(totalEvalData.commentLengths)
  };

  // 피드백 데이터 분석 함수
  const getFeedbackData = (teamData, cycleNum = 0) => {
    const feedbackCounts = [];
    const feedbackLengths = [];
    const userFeedbacks = [];
    const aiFeedbacks = [];
    const allAgents = new Set(); // 모든 에이전트 수집
    
    // 피드백 세션 개시자 분석
    let userInitiatedSessions = 0;
    let aiInitiatedSessions = 0;
    let noUserMessageSessions = 0; // 사용자 메시지가 없는 세션
    let hasRequestSessions = 0; // 피드백 요청이 있는 세션
    let noRequestSessions = 0; // 피드백 요청이 없는 세션
    
    // 세션 턴 수 및 평균 음절 분석
    const sessionTurns = [];
    const sessionUserTurns = []; // 세션별 사용자 턴수
    const sessionAiTurns = []; // 세션별 AI 턴수
    const sessionAverageSyllables = [];

    teamData.forEach(team => {
      let teamFeedbackCount = 0;
      
      if (team.chat) {
        const feedbackRequests = [];
        const feedbackSessions = [];
        
        // 채팅에서 피드백 관련 데이터 수집
        team.chat.forEach(chatItem => {
          try {
            let messageData;
            if (typeof chatItem === 'string') {
              messageData = JSON.parse(chatItem);
            } else {
              messageData = chatItem;
            }
            
            // 피드백 요청 수집
            if (messageData.type === 'give_feedback' || 
                (messageData.type === 'make_request' && messageData.payload?.requestType === 'give_feedback')) {
              feedbackRequests.push({
                timestamp: messageData.timestamp,
                sender: messageData.sender,
                content: messageData.payload?.content || ''
              });
            }
            
            // 피드백 세션 수집
            if (messageData.type === 'feedback_session_summary') {
              feedbackSessions.push({
                timestamp: messageData.timestamp,
                sessionId: messageData.payload?.sessionId,
                participants: messageData.payload?.participants || [],
                sessionMessages: messageData.payload?.sessionMessages || []
              });
            }
          } catch (e) {
            // JSON 파싱 실패 시 무시
          }
        });

        // 각 피드백 세션 분석
        feedbackSessions.forEach(session => {
          teamFeedbackCount++;
          
          // 세션 개시자 추론
          let initiator = 'unknown';
          let closestRequest = null;
          let minTimeDiff = Infinity;
          
          // 세션에서 사용자 메시지 개수 확인
          let userMessagesInSession = 0;
          if (session.sessionMessages) {
            // 팀 멤버 정보에서 사용자가 자신을 정의한 이름 찾기
            const userDefinedName = getUserDefinedName(team);
            
            session.sessionMessages.forEach(msg => {
              const sender = (msg.sender || '').trim();
              // 사용자가 정의한 이름이거나 "나"인 경우 사용자 메시지로 카운팅
              if (sender === userDefinedName || sender === '나') {
                userMessagesInSession++;
              }
            });
          }
          
          const sessionTime = new Date(session.timestamp);
          feedbackRequests.forEach(request => {
            const requestTime = new Date(request.timestamp);
            const timeDiff = sessionTime - requestTime;
            if (timeDiff >= 0 && timeDiff < minTimeDiff) {
              minTimeDiff = timeDiff;
              closestRequest = request;
            }
          });
          
          // 통계 수집
          if (userMessagesInSession === 0) {
            noUserMessageSessions++;
          }
          if (closestRequest) {
            hasRequestSessions++;
          } else {
            noRequestSessions++;
          }
          
          // 👤 표시와 동일한 로직으로 사용자 참여 판별
          const participants = session.payload?.participants || [];
          const userDefinedName = getUserDefinedName(team);
          
          // 3가지 조건 중 하나라도 만족하면 사용자 개시로 판별 (👤 표시와 동일)
          if (userMessagesInSession > 0 || participants.includes(userDefinedName) || participants.includes('나')) {
            initiator = 'user';
          } else {
            initiator = 'ai';
          }
          
          // 최종 분류
          if (initiator === 'user') {
            userInitiatedSessions++;
          } else {
            // unknown 포함해서 모두 AI로 분류
            aiInitiatedSessions++;
            initiator = 'ai';
          }
          
          // 세션 메시지 분석
          const sessionMessageLengths = [];
          let sessionMessageCount = 0;
          let sessionUserMessageCount = 0;
          let sessionAiMessageCount = 0;
          
          session.sessionMessages.forEach((message, messageIndex) => {
            if (message && message.content) {
              sessionMessageCount++;
              
              // 메시지 길이 계산
              const koreanLength = (message.content.match(/[가-힣]/g) || []).length;
              const otherLength = (message.content.match(/[^\가-힣\s]/g) || []).length * 0.5;
              const messageLength = Math.round(koreanLength + otherLength);
              
              feedbackLengths.push(messageLength);
              sessionMessageLengths.push(messageLength);
              
              // 발신자별 분류 - 사용자 정의 이름으로 판별
              const sender = (message.sender || '').trim();
              
              
              // AI 식별 (명확한 조건부터)
              if (sender.startsWith('agent_') || sender.includes('agent')) {
                aiFeedbacks.push(messageLength);
                allAgents.add(sender); // 에이전트 수집
                sessionAiMessageCount++;
              }
              // 사용자 식별 (사용자 정의 이름이거나 "나"인 경우)
              else if (sender === userDefinedName || sender === '나') {
                userFeedbacks.push(messageLength);
                sessionUserMessageCount++;
              }
              // 그 외는 AI로 분류 (참여자 이름이지만 사용자가 아닌 경우)
              else {
                aiFeedbacks.push(messageLength);
                sessionAiMessageCount++;
              }
            }
          });
          
          sessionTurns.push(sessionMessageCount);
          sessionUserTurns.push(sessionUserMessageCount);
          sessionAiTurns.push(sessionAiMessageCount);
          
          // 세션별 평균 음절 수 계산
          if (sessionMessageLengths.length > 0) {
            const sessionAvg = sessionMessageLengths.reduce((sum, len) => sum + len, 0) / sessionMessageLengths.length;
            sessionAverageSyllables.push(Math.round(sessionAvg * 100) / 100);
          } else {
            sessionAverageSyllables.push(0);
          }
        });
      }
      
      feedbackCounts.push(teamFeedbackCount);
    });

    
    return {
      feedbackCounts,
      feedbackLengths,
      userFeedbacks,
      aiFeedbacks,
      totalFeedbacks: feedbackCounts.reduce((sum, count) => sum + count, 0),
      totalFeedbackMessages: feedbackLengths.length,
      userInitiatedSessions,
      aiInitiatedSessions,
      sessionTurns,
      sessionAverageSyllables,
      userInitiationStats: { avg: userInitiatedSessions / Math.max(teamData.length, 1), stdev: 0 },
      aiInitiationStats: { avg: aiInitiatedSessions / Math.max(teamData.length, 1), stdev: 0 },
      // 피드백 개시 횟수 (총 피드백 세션 수와 일치해야 함)
      userInitiatedCount: userInitiatedSessions,
      aiInitiatedCount: aiInitiatedSessions,
      // 추가 분석 데이터
      noUserMessageSessions,
      hasRequestSessions,
      noRequestSessions,
      // 에이전트 수
      agentCount: allAgents.size,
      // 세션별 턴수 데이터
      sessionUserTurns,
      sessionAiTurns
    };
  };

  // 각 사이클별 피드백 데이터
  const team1FeedbackData = getFeedbackData(team1Data, 1);
  const team2FeedbackData = getFeedbackData(team2Data, 2);
  const team3FeedbackData = getFeedbackData(team3Data, 3);

  // 세션 참여자 분석을 위한 팀별 세션 통계 계산
  const calculateSessionStats = (teamData) => {
    const teamSessionCounts = teamData.map(team => {
      const teamFeedbacks = getFeedbackData([team]);
      
      return {
        userInitiated: teamFeedbacks.userInitiatedSessions,
        aiInitiated: teamFeedbacks.aiInitiatedSessions,
        total: teamFeedbacks.userInitiatedSessions + teamFeedbacks.aiInitiatedSessions,
        agentCount: teamFeedbacks.agentCount // getFeedbackData에서 계산된 에이전트 수 사용
      };
    });

    const userInitiatedCounts = teamSessionCounts.map(t => t.userInitiated);
    const aiInitiatedCounts = teamSessionCounts.map(t => t.aiInitiated);
    const totalSessionCounts = teamSessionCounts.map(t => t.total);
    
    // 총 에이전트 수 계산 (모든 팀의 에이전트 수 합산)
    const totalAgentCount = teamSessionCounts.reduce((sum, t) => sum + t.agentCount, 0);
    
    // 에이전트별 평균 계산 (각 팀의 AI 개시 세션 수를 해당 팀의 에이전트 수로 나눈 값들)
    const aiPerAgentCounts = teamSessionCounts.map(t => 
      t.agentCount > 0 ? parseFloat((t.aiInitiated / t.agentCount).toFixed(2)) : 0
    );
    
    // 전체 AI 개시 세션을 전체 에이전트 수로 나눈 평균
    const totalAiInitiated = aiInitiatedCounts.reduce((sum, val) => sum + val, 0);

    return {
      // 전체 세션 통계
      avgTotalPerTeam: parseFloat((totalSessionCounts.reduce((sum, val) => sum + val, 0) / Math.max(teamData.length, 1)).toFixed(2)),
      minTotalPerTeam: totalSessionCounts.length > 0 ? Math.min(...totalSessionCounts) : 0,
      maxTotalPerTeam: totalSessionCounts.length > 0 ? Math.max(...totalSessionCounts) : 0,
      stdevTotalPerTeam: parseFloat(calculateStats(totalSessionCounts).stdev.toFixed(2)),
      
      // 사용자 개시 세션 통계 (사용자는 팀당 1명으로 가정)
      avgUserPerTeam: parseFloat((userInitiatedCounts.reduce((sum, val) => sum + val, 0) / Math.max(teamData.length, 1)).toFixed(2)),
      minUserPerTeam: userInitiatedCounts.length > 0 ? Math.min(...userInitiatedCounts) : 0,
      maxUserPerTeam: userInitiatedCounts.length > 0 ? Math.max(...userInitiatedCounts) : 0,
      stdevUserPerTeam: parseFloat(calculateStats(userInitiatedCounts).stdev.toFixed(2)),
      
      // AI 개시 세션 통계 (실제 에이전트 총 수로 나눈 평균)
      avgAiPerAgent: parseFloat((totalAiInitiated / Math.max(totalAgentCount, 1)).toFixed(2)),
      minAiPerAgent: aiPerAgentCounts.length > 0 ? Math.min(...aiPerAgentCounts) : 0,
      maxAiPerAgent: aiPerAgentCounts.length > 0 ? Math.max(...aiPerAgentCounts) : 0,
      stdevAiPerAgent: parseFloat(calculateStats(aiPerAgentCounts).stdev.toFixed(2)),
      
      // 디버깅용
      totalAiInitiated: totalAiInitiated,
      totalAgentCount: totalAgentCount
    };
  };

  const team1SessionStats = calculateSessionStats(team1Data);
  const team2SessionStats = calculateSessionStats(team2Data);
  const team3SessionStats = calculateSessionStats(team3Data);
  
  // 디버깅: 에이전트 수 출력
  console.log('🤖 Agent Statistics:');
  console.log(`Cycle 1: ${team1SessionStats.totalAgentCount} agents (avg: ${team1SessionStats.avgAiPerAgent})`);
  console.log(`Cycle 2: ${team2SessionStats.totalAgentCount} agents (avg: ${team2SessionStats.avgAiPerAgent})`);
  console.log(`Cycle 3: ${team3SessionStats.totalAgentCount} agents (avg: ${team3SessionStats.avgAiPerAgent})`);
  
  // 전체 피드백 데이터 통합
  const totalFeedbackData = {
    feedbackCounts: [...team1FeedbackData.feedbackCounts, ...team2FeedbackData.feedbackCounts, ...team3FeedbackData.feedbackCounts],
    feedbackLengths: [...team1FeedbackData.feedbackLengths, ...team2FeedbackData.feedbackLengths, ...team3FeedbackData.feedbackLengths],
    userFeedbacks: [...team1FeedbackData.userFeedbacks, ...team2FeedbackData.userFeedbacks, ...team3FeedbackData.userFeedbacks],
    aiFeedbacks: [...team1FeedbackData.aiFeedbacks, ...team2FeedbackData.aiFeedbacks, ...team3FeedbackData.aiFeedbacks],
    totalFeedbacks: team1FeedbackData.totalFeedbacks + team2FeedbackData.totalFeedbacks + team3FeedbackData.totalFeedbacks,
    totalFeedbackMessages: team1FeedbackData.totalFeedbackMessages + team2FeedbackData.totalFeedbackMessages + team3FeedbackData.totalFeedbackMessages,
    userInitiatedSessions: team1FeedbackData.userInitiatedSessions + team2FeedbackData.userInitiatedSessions + team3FeedbackData.userInitiatedSessions,
    aiInitiatedSessions: team1FeedbackData.aiInitiatedSessions + team2FeedbackData.aiInitiatedSessions + team3FeedbackData.aiInitiatedSessions,
    sessionTurns: [...team1FeedbackData.sessionTurns, ...team2FeedbackData.sessionTurns, ...team3FeedbackData.sessionTurns],
    sessionAverageSyllables: [...team1FeedbackData.sessionAverageSyllables, ...team2FeedbackData.sessionAverageSyllables, ...team3FeedbackData.sessionAverageSyllables],
    // 피드백 개시 횟수 합계 (총 피드백과 일치해야 함)
    userInitiatedCount: team1FeedbackData.userInitiatedCount + team2FeedbackData.userInitiatedCount + team3FeedbackData.userInitiatedCount,
    aiInitiatedCount: team1FeedbackData.aiInitiatedCount + team2FeedbackData.aiInitiatedCount + team3FeedbackData.aiInitiatedCount,
    // 추가 분석 데이터 합계
    noUserMessageSessions: team1FeedbackData.noUserMessageSessions + team2FeedbackData.noUserMessageSessions + team3FeedbackData.noUserMessageSessions,
    hasRequestSessions: team1FeedbackData.hasRequestSessions + team2FeedbackData.hasRequestSessions + team3FeedbackData.hasRequestSessions,
    noRequestSessions: team1FeedbackData.noRequestSessions + team2FeedbackData.noRequestSessions + team3FeedbackData.noRequestSessions
  };

  // 피드백 통계 계산
  const feedbackStats = {
    team1: {
      totalFeedbacks: team1FeedbackData.totalFeedbacks,
      avgPerTeam: parseFloat((team1FeedbackData.totalFeedbacks / Math.max(team1Data.length, 1)).toFixed(2)),
      minPerTeam: team1FeedbackData.feedbackCounts.length > 0 ? Math.min(...team1FeedbackData.feedbackCounts) : 0,
      maxPerTeam: team1FeedbackData.feedbackCounts.length > 0 ? Math.max(...team1FeedbackData.feedbackCounts) : 0,
      stdevPerTeam: parseFloat(calculateStats(team1FeedbackData.feedbackCounts).stdev.toFixed(2))
    },
    team2: {
      totalFeedbacks: team2FeedbackData.totalFeedbacks,
      avgPerTeam: parseFloat((team2FeedbackData.totalFeedbacks / Math.max(team2Data.length, 1)).toFixed(2)),
      minPerTeam: team2FeedbackData.feedbackCounts.length > 0 ? Math.min(...team2FeedbackData.feedbackCounts) : 0,
      maxPerTeam: team2FeedbackData.feedbackCounts.length > 0 ? Math.max(...team2FeedbackData.feedbackCounts) : 0,
      stdevPerTeam: parseFloat(calculateStats(team2FeedbackData.feedbackCounts).stdev.toFixed(2))
    },
    team3: {
      totalFeedbacks: team3FeedbackData.totalFeedbacks,
      avgPerTeam: parseFloat((team3FeedbackData.totalFeedbacks / Math.max(team3Data.length, 1)).toFixed(2)),
      minPerTeam: team3FeedbackData.feedbackCounts.length > 0 ? Math.min(...team3FeedbackData.feedbackCounts) : 0,
      maxPerTeam: team3FeedbackData.feedbackCounts.length > 0 ? Math.max(...team3FeedbackData.feedbackCounts) : 0,
      stdevPerTeam: parseFloat(calculateStats(team3FeedbackData.feedbackCounts).stdev.toFixed(2))
    },
    total: {
      totalFeedbacks: totalFeedbackData.totalFeedbacks,
      avgPerTeam: parseFloat((totalFeedbackData.totalFeedbacks / Math.max(teams.length, 1)).toFixed(2)),
      minPerTeam: totalFeedbackData.feedbackCounts.length > 0 ? Math.min(...totalFeedbackData.feedbackCounts) : 0,
      maxPerTeam: totalFeedbackData.feedbackCounts.length > 0 ? Math.max(...totalFeedbackData.feedbackCounts) : 0,
      stdevPerTeam: parseFloat(calculateStats(totalFeedbackData.feedbackCounts).stdev.toFixed(2))
    }
  };

  // 사용자 vs AI 피드백 통계
  const userVsAiFeedbackStats = {
    team1: {
      user: calculateStats(team1FeedbackData.userFeedbacks),
      ai: calculateStats(team1FeedbackData.aiFeedbacks)
    },
    team2: {
      user: calculateStats(team2FeedbackData.userFeedbacks),
      ai: calculateStats(team2FeedbackData.aiFeedbacks)
    },
    team3: {
      user: calculateStats(team3FeedbackData.userFeedbacks),
      ai: calculateStats(team3FeedbackData.aiFeedbacks)
    },
    total: {
      user: calculateStats(totalFeedbackData.userFeedbacks),
      ai: calculateStats(totalFeedbackData.aiFeedbacks)
    }
  };

  // 요청 통계 변수 추가 (피드백과 동일한 구조)
  const requestStats = {
    team1: {
      totalRequests: team1RequestData.totalRequests,
      avgPerTeam: parseFloat((team1RequestData.totalRequests / Math.max(team1Data.length, 1)).toFixed(2)),
      minPerTeam: team1RequestData.requestCounts.length > 0 ? Math.min(...team1RequestData.requestCounts) : 0,
      maxPerTeam: team1RequestData.requestCounts.length > 0 ? Math.max(...team1RequestData.requestCounts) : 0,
      stdevPerTeam: parseFloat(calculateStats(team1RequestData.requestCounts).stdev.toFixed(2))
    },
    team2: {
      totalRequests: team2RequestData.totalRequests,
      avgPerTeam: parseFloat((team2RequestData.totalRequests / Math.max(team2Data.length, 1)).toFixed(2)),
      minPerTeam: team2RequestData.requestCounts.length > 0 ? Math.min(...team2RequestData.requestCounts) : 0,
      maxPerTeam: team2RequestData.requestCounts.length > 0 ? Math.max(...team2RequestData.requestCounts) : 0,
      stdevPerTeam: parseFloat(calculateStats(team2RequestData.requestCounts).stdev.toFixed(2))
    },
    team3: {
      totalRequests: team3RequestData.totalRequests,
      avgPerTeam: parseFloat((team3RequestData.totalRequests / Math.max(team3Data.length, 1)).toFixed(2)),
      minPerTeam: team3RequestData.requestCounts.length > 0 ? Math.min(...team3RequestData.requestCounts) : 0,
      maxPerTeam: team3RequestData.requestCounts.length > 0 ? Math.max(...team3RequestData.requestCounts) : 0,
      stdevPerTeam: parseFloat(calculateStats(team3RequestData.requestCounts).stdev.toFixed(2))
    },
    total: {
      totalRequests: totalRequestData.totalRequests,
      avgPerTeam: parseFloat((totalRequestData.totalRequests / Math.max(teams.length, 1)).toFixed(2)),
      minPerTeam: totalRequestData.requestCounts.length > 0 ? Math.min(...totalRequestData.requestCounts) : 0,
      maxPerTeam: totalRequestData.requestCounts.length > 0 ? Math.max(...totalRequestData.requestCounts) : 0,
      stdevPerTeam: parseFloat(calculateStats(totalRequestData.requestCounts).stdev.toFixed(2))
    }
  };

  // 피드백 세션 분석
  const sessionStats = {
    team1: {
      avgTurns: calculateStats(team1FeedbackData.sessionTurns).avg,
      avgSyllables: calculateStats(team1FeedbackData.sessionAverageSyllables).avg,
      userInitiated: team1FeedbackData.userInitiatedSessions,
      aiInitiated: team1FeedbackData.aiInitiatedSessions,
      totalSessions: team1FeedbackData.userInitiatedSessions + team1FeedbackData.aiInitiatedSessions
    },
    team2: {
      avgTurns: calculateStats(team2FeedbackData.sessionTurns).avg,
      avgSyllables: calculateStats(team2FeedbackData.sessionAverageSyllables).avg,
      userInitiated: team2FeedbackData.userInitiatedSessions,
      aiInitiated: team2FeedbackData.aiInitiatedSessions,
      totalSessions: team2FeedbackData.userInitiatedSessions + team2FeedbackData.aiInitiatedSessions
    },
    team3: {
      avgTurns: calculateStats(team3FeedbackData.sessionTurns).avg,
      avgSyllables: calculateStats(team3FeedbackData.sessionAverageSyllables).avg,
      userInitiated: team3FeedbackData.userInitiatedSessions,
      aiInitiated: team3FeedbackData.aiInitiatedSessions,
      totalSessions: team3FeedbackData.userInitiatedSessions + team3FeedbackData.aiInitiatedSessions
    },
    total: {
      avgTurns: calculateStats(totalFeedbackData.sessionTurns).avg,
      avgSyllables: calculateStats(totalFeedbackData.sessionAverageSyllables).avg,
      userInitiated: totalFeedbackData.userInitiatedSessions,
      aiInitiated: totalFeedbackData.aiInitiatedSessions,
      totalSessions: totalFeedbackData.userInitiatedSessions + totalFeedbackData.aiInitiatedSessions
    }
  };

  // 피드백 세션별 턴 분석 통계 (사용자/AI 참여 세션 기준으로 계산)
  const calculateTurnStats = (feedbackData) => {
    // 사용자가 참여한 세션의 사용자 턴수만 추출 (> 0인 경우)
    const userParticipatedSessions = feedbackData.sessionUserTurns.filter(turns => turns > 0);
    // AI가 참여한 세션의 AI 턴수만 추출 (> 0인 경우)
    const aiParticipatedSessions = feedbackData.sessionAiTurns.filter(turns => turns > 0);
    // 전체 세션의 총 턴수
    const allSessionTotalTurns = feedbackData.sessionUserTurns.map((userTurns, i) => 
      userTurns + (feedbackData.sessionAiTurns[i] || 0)
    );
    
    return {
      userTurns: userParticipatedSessions.length > 0 ? calculateStats(userParticipatedSessions) : { avg: 0, stdev: 0 },
      aiTurns: aiParticipatedSessions.length > 0 ? calculateStats(aiParticipatedSessions) : { avg: 0, stdev: 0 },
      totalTurns: calculateStats(allSessionTotalTurns),
      userSessionCount: userParticipatedSessions.length,
      aiSessionCount: aiParticipatedSessions.length
    };
  };

  const turnAnalysisStats = {
    team1: calculateTurnStats(team1FeedbackData),
    team2: calculateTurnStats(team2FeedbackData),
    team3: calculateTurnStats(team3FeedbackData),
    total: (() => {
      // 전체 통계: 모든 사이클의 데이터 통합
      const allUserTurns = [
        ...team1FeedbackData.sessionUserTurns,
        ...team2FeedbackData.sessionUserTurns,
        ...team3FeedbackData.sessionUserTurns
      ];
      const allAiTurns = [
        ...team1FeedbackData.sessionAiTurns,
        ...team2FeedbackData.sessionAiTurns,
        ...team3FeedbackData.sessionAiTurns
      ];
      
      const userParticipatedSessions = allUserTurns.filter(turns => turns > 0);
      const aiParticipatedSessions = allAiTurns.filter(turns => turns > 0);
      const allTotalTurns = allUserTurns.map((userTurns, i) => userTurns + (allAiTurns[i] || 0));
      
      return {
        userTurns: userParticipatedSessions.length > 0 ? calculateStats(userParticipatedSessions) : { avg: 0, stdev: 0 },
        aiTurns: aiParticipatedSessions.length > 0 ? calculateStats(aiParticipatedSessions) : { avg: 0, stdev: 0 },
        totalTurns: calculateStats(allTotalTurns),
        userSessionCount: userParticipatedSessions.length,
        aiSessionCount: aiParticipatedSessions.length
      };
    })()
  };

  // 행동 로그 분석을 위한 통계 계산
  const actionStats = calculateTeamActivityStats(teams);
  const statsSummary = generateStatsSummary(actionStats);

  return (
    <div className="analysis-content">
      {/* 행동 로그 분석 섹션 (맨 위에 배치) */}
      <div className="analysis-section">
        <ActivityStatsDisplay 
          stats={actionStats}
          title="📈 행동 로그 분석"
          showTeamBreakdown={true}
          showComparison={true}
          showInsights={true}
        />
      </div>

      {/* 아이디어 결과 분석 헤더 */}
      <div className="analysis-section">
        <h2>🎯 아이디어 결과 분석</h2>
        <p className="analysis-description">
          각 팀 사이클에서 생성된 아이디어의 양적 분석과 아이디어 속성별 내용 복잡도를 분석한 결과입니다.
        </p>
        
        {/* 결과 분석 탭 네비게이션 */}
        <div className="result-analysis-tabs">
          <button 
            className={`tab-button ${activeResultTab === 'generation' ? 'active' : ''}`}
            onClick={() => setActiveResultTab('generation')}
          >
            💡 아이디어 생성
          </button>
          <button 
            className={`tab-button ${activeResultTab === 'evaluation' ? 'active' : ''}`}
            onClick={() => setActiveResultTab('evaluation')}
          >
            🔍 평가
          </button>
          <button 
            className={`tab-button ${activeResultTab === 'feedback' ? 'active' : ''}`}
            onClick={() => setActiveResultTab('feedback')}
          >
            💬 피드백
          </button>
          <button 
            className={`tab-button ${activeResultTab === 'request' ? 'active' : ''}`}
            onClick={() => setActiveResultTab('request')}
          >
            📝 요청
          </button>
        </div>
      </div>

      {/* 아이디어 생성 탭 */}
      {activeResultTab === 'generation' && (
        <div className="tab-content">
          {/* 팀 사이클별 아이디어 개수 분석 */}
          <div className="analysis-section">
            <h3>💡 팀 사이클별 아이디어 생성 개수</h3>
            <p className="section-description">
              각 사이클에서 팀들이 생성한 총 아이디어 개수의 분포를 보여줍니다.
            </p>
            
            <div className="team-stats-table">
              <div className="stats-header">
                <div className="stat-label">구분</div>
                <div className="stat-value">팀 수</div>
                <div className="stat-value">평균</div>
                <div className="stat-value">최소</div>
                <div className="stat-value">최대</div>
                <div className="stat-value">표준편차</div>
              </div>
              <div className="stats-row">
                <div className="stat-label">팀 사이클 1</div>
                <div className="stat-value">{team1Data.length}개</div>
                <div className="stat-value">{ideaCountStats.team1.avg}개</div>
                <div className="stat-value">{ideaCountStats.team1.min}개 {team1MinMax.minTeam ? `(${team1MinMax.minTeam.label})` : ''}</div>
                <div className="stat-value">{ideaCountStats.team1.max}개 {team1MinMax.maxTeam ? `(${team1MinMax.maxTeam.label})` : ''}</div>
                <div className="stat-value">{ideaCountStats.team1.stdev}</div>
              </div>
              <div className="stats-row">
                <div className="stat-label">팀 사이클 2</div>
                <div className="stat-value">{team2Data.length}개</div>
                <div className="stat-value">{ideaCountStats.team2.avg}개</div>
                <div className="stat-value">{ideaCountStats.team2.min}개 {team2MinMax.minTeam ? `(${team2MinMax.minTeam.label})` : ''}</div>
                <div className="stat-value">{ideaCountStats.team2.max}개 {team2MinMax.maxTeam ? `(${team2MinMax.maxTeam.label})` : ''}</div>
                <div className="stat-value">{ideaCountStats.team2.stdev}</div>
              </div>
              <div className="stats-row">
                <div className="stat-label">팀 사이클 3</div>
                <div className="stat-value">{team3Data.length}개</div>
                <div className="stat-value">{ideaCountStats.team3.avg}개</div>
                <div className="stat-value">{ideaCountStats.team3.min}개 {team3MinMax.minTeam ? `(${team3MinMax.minTeam.label})` : ''}</div>
                <div className="stat-value">{ideaCountStats.team3.max}개 {team3MinMax.maxTeam ? `(${team3MinMax.maxTeam.label})` : ''}</div>
                <div className="stat-value">{ideaCountStats.team3.stdev}</div>
              </div>
              <div className="stats-row total-row">
                <div className="stat-label">전체</div>
                <div className="stat-value">{teams.length}개</div>
                <div className="stat-value">{ideaCountStats.total.avg}개</div>
                <div className="stat-value">{ideaCountStats.total.min}개</div>
                <div className="stat-value">{ideaCountStats.total.max}개</div>
                <div className="stat-value">{ideaCountStats.total.stdev}</div>
              </div>
            </div>
          </div>

          <div className="analysis-section">
            <h3>👥 사이클별 아이디어 생성 개수 (사용자/에이전트별)</h3>
            <p className="section-description">
              각 사이클에서 사용자와 에이전트가 생성한 아이디어 개수를 분석합니다.
            </p>
            
            {/* 검증 정보 */}
            <div style={{backgroundColor: '#fff3cd', padding: '10px', margin: '10px 0', fontSize: '12px', border: '1px solid #ffeaa7'}}>
              <strong>🔍 개수 검증:</strong><br/>
              <table style={{fontSize: '11px', borderCollapse: 'collapse'}}>
                <tr>
                  <td style={{padding: '2px 8px', border: '1px solid #ddd'}}>구분</td>
                  <td style={{padding: '2px 8px', border: '1px solid #ddd'}}>기존 총개수</td>
                  <td style={{padding: '2px 8px', border: '1px solid #ddd'}}>사용자</td>
                  <td style={{padding: '2px 8px', border: '1px solid #ddd'}}>에이전트</td>
                  <td style={{padding: '2px 8px', border: '1px solid #ddd'}}>합계</td>
                  <td style={{padding: '2px 8px', border: '1px solid #ddd'}}>차이</td>
                </tr>
                <tr>
                  <td style={{padding: '2px 8px', border: '1px solid #ddd'}}>사이클1</td>
                  <td style={{padding: '2px 8px', border: '1px solid #ddd'}}>{team1Ideas.reduce((sum, count) => sum + count, 0)}</td>
                  <td style={{padding: '2px 8px', border: '1px solid #ddd'}}>{team1IdeaCountsByType.userCounts.reduce((sum, count) => sum + count, 0)}</td>
                  <td style={{padding: '2px 8px', border: '1px solid #ddd'}}>{team1IdeaCountsByType.agentCounts.reduce((sum, count) => sum + count, 0)}</td>
                  <td style={{padding: '2px 8px', border: '1px solid #ddd'}}>{team1IdeaCountsByType.userCounts.reduce((sum, count) => sum + count, 0) + team1IdeaCountsByType.agentCounts.reduce((sum, count) => sum + count, 0)}</td>
                  <td style={{padding: '2px 8px', border: '1px solid #ddd', color: team1Ideas.reduce((sum, count) => sum + count, 0) !== (team1IdeaCountsByType.userCounts.reduce((sum, count) => sum + count, 0) + team1IdeaCountsByType.agentCounts.reduce((sum, count) => sum + count, 0)) ? 'red' : 'green'}}>
                    {team1Ideas.reduce((sum, count) => sum + count, 0) - (team1IdeaCountsByType.userCounts.reduce((sum, count) => sum + count, 0) + team1IdeaCountsByType.agentCounts.reduce((sum, count) => sum + count, 0))}
                  </td>
                </tr>
                <tr>
                  <td style={{padding: '2px 8px', border: '1px solid #ddd'}}>사이클2</td>
                  <td style={{padding: '2px 8px', border: '1px solid #ddd'}}>{team2Ideas.reduce((sum, count) => sum + count, 0)}</td>
                  <td style={{padding: '2px 8px', border: '1px solid #ddd'}}>{team2IdeaCountsByType.userCounts.reduce((sum, count) => sum + count, 0)}</td>
                  <td style={{padding: '2px 8px', border: '1px solid #ddd'}}>{team2IdeaCountsByType.agentCounts.reduce((sum, count) => sum + count, 0)}</td>
                  <td style={{padding: '2px 8px', border: '1px solid #ddd'}}>{team2IdeaCountsByType.userCounts.reduce((sum, count) => sum + count, 0) + team2IdeaCountsByType.agentCounts.reduce((sum, count) => sum + count, 0)}</td>
                  <td style={{padding: '2px 8px', border: '1px solid #ddd', color: team2Ideas.reduce((sum, count) => sum + count, 0) !== (team2IdeaCountsByType.userCounts.reduce((sum, count) => sum + count, 0) + team2IdeaCountsByType.agentCounts.reduce((sum, count) => sum + count, 0)) ? 'red' : 'green'}}>
                    {team2Ideas.reduce((sum, count) => sum + count, 0) - (team2IdeaCountsByType.userCounts.reduce((sum, count) => sum + count, 0) + team2IdeaCountsByType.agentCounts.reduce((sum, count) => sum + count, 0))}
                  </td>
                </tr>
                <tr>
                  <td style={{padding: '2px 8px', border: '1px solid #ddd'}}>사이클3</td>
                  <td style={{padding: '2px 8px', border: '1px solid #ddd'}}>{team3Ideas.reduce((sum, count) => sum + count, 0)}</td>
                  <td style={{padding: '2px 8px', border: '1px solid #ddd'}}>{team3IdeaCountsByType.userCounts.reduce((sum, count) => sum + count, 0)}</td>
                  <td style={{padding: '2px 8px', border: '1px solid #ddd'}}>{team3IdeaCountsByType.agentCounts.reduce((sum, count) => sum + count, 0)}</td>
                  <td style={{padding: '2px 8px', border: '1px solid #ddd'}}>{team3IdeaCountsByType.userCounts.reduce((sum, count) => sum + count, 0) + team3IdeaCountsByType.agentCounts.reduce((sum, count) => sum + count, 0)}</td>
                  <td style={{padding: '2px 8px', border: '1px solid #ddd', color: team3Ideas.reduce((sum, count) => sum + count, 0) !== (team3IdeaCountsByType.userCounts.reduce((sum, count) => sum + count, 0) + team3IdeaCountsByType.agentCounts.reduce((sum, count) => sum + count, 0)) ? 'red' : 'green'}}>
                    {team3Ideas.reduce((sum, count) => sum + count, 0) - (team3IdeaCountsByType.userCounts.reduce((sum, count) => sum + count, 0) + team3IdeaCountsByType.agentCounts.reduce((sum, count) => sum + count, 0))}
                  </td>
                </tr>
              </table>
            </div>

            {/* 올바른 팀별 아이디어 개수 표시 */}
            <div style={{backgroundColor: '#d1ecf1', padding: '10px', margin: '10px 0', fontSize: '12px', border: '1px solid #bee5eb'}}>
              <strong>✅ 올바른 팀별 아이디어 개수:</strong><br/>
              사이클1: {team1Ideas.reduce((sum, count) => sum + count, 0)}개 | 
              사이클2: {team2Ideas.reduce((sum, count) => sum + count, 0)}개 | 
              사이클3: {team3Ideas.reduce((sum, count) => sum + count, 0)}개<br/>
              <em>🏢 팀별 상세 통계가 이 값과 다르다면, 팀별 통계 컴포넌트에서 다른 데이터를 사용하고 있는 것입니다.</em>
            </div>
            
            <div className="team-stats-table">
              <div className="stats-header">
                <div className="stat-label">구분</div>
                <div className="stat-value">사용자총개수</div>
                <div className="stat-value">평균</div>
                <div className="stat-value">SD</div>
                <div className="stat-value">에이전트총개수</div>
                <div className="stat-value">평균</div>
                <div className="stat-value">SD</div>
              </div>
              <div className="stats-row">
                <div className="stat-label">사이클 1</div>
                <div className="stat-value">{ideaCountStatsByType.team1.userTotal}개</div>
                <div className="stat-value">{ideaCountStatsByType.team1.user.avg.toFixed(2)}</div>
                <div className="stat-value">{ideaCountStatsByType.team1.user.stdev.toFixed(2)}</div>
                <div className="stat-value">{ideaCountStatsByType.team1.agentTotal}개</div>
                <div className="stat-value">{ideaCountStatsByType.team1.agent.avg.toFixed(2)}</div>
                <div className="stat-value">{ideaCountStatsByType.team1.agent.stdev.toFixed(2)}</div>
              </div>
              <div className="stats-row">
                <div className="stat-label">사이클 2</div>
                <div className="stat-value">{ideaCountStatsByType.team2.userTotal}개</div>
                <div className="stat-value">{ideaCountStatsByType.team2.user.avg.toFixed(2)}</div>
                <div className="stat-value">{ideaCountStatsByType.team2.user.stdev.toFixed(2)}</div>
                <div className="stat-value">{ideaCountStatsByType.team2.agentTotal}개</div>
                <div className="stat-value">{ideaCountStatsByType.team2.agent.avg.toFixed(2)}</div>
                <div className="stat-value">{ideaCountStatsByType.team2.agent.stdev.toFixed(2)}</div>
              </div>
              <div className="stats-row">
                <div className="stat-label">사이클 3</div>
                <div className="stat-value">{ideaCountStatsByType.team3.userTotal}개</div>
                <div className="stat-value">{ideaCountStatsByType.team3.user.avg.toFixed(2)}</div>
                <div className="stat-value">{ideaCountStatsByType.team3.user.stdev.toFixed(2)}</div>
                <div className="stat-value">{ideaCountStatsByType.team3.agentTotal}개</div>
                <div className="stat-value">{ideaCountStatsByType.team3.agent.avg.toFixed(2)}</div>
                <div className="stat-value">{ideaCountStatsByType.team3.agent.stdev.toFixed(2)}</div>
              </div>
              <div className="stats-row total-row">
                <div className="stat-label">전체</div>
                <div className="stat-value">{ideaCountStatsByType.total.userTotal}개</div>
                <div className="stat-value">{ideaCountStatsByType.total.user.avg.toFixed(2)}</div>
                <div className="stat-value">{ideaCountStatsByType.total.user.stdev.toFixed(2)}</div>
                <div className="stat-value">{ideaCountStatsByType.total.agentTotal}개</div>
                <div className="stat-value">{ideaCountStatsByType.total.agent.avg.toFixed(2)}</div>
                <div className="stat-value">{ideaCountStatsByType.total.agent.stdev.toFixed(2)}</div>
              </div>
            </div>
          </div>

          <div className="analysis-section">
            <h3>📏 아이디어 속성별 내용 복잡도 분석</h3>
            <p className="section-description">
              아이디어의 각 속성(Object, Function, Behavior, Structure)별 내용의 길이를 음절 단위로 분석합니다.
            </p>
            {/* 첫 번째 줄: Object와 Function */}
            <div className="attribute-analysis-row">
              {/* Object 분석 */}
              <div className="attribute-analysis-half">
                <h4>🎯 Object (대상) 속성 길이</h4>
                <div className="team-stats-table">
                  <div className="stats-header">
                    <div className="stat-label">구분</div>
                    <div className="stat-value">평균</div>
                    <div className="stat-value">표준편차</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">사이클 1</div>
                    <div className="stat-value">{objectStats.team1.avg}음절</div>
                    <div className="stat-value">{objectStats.team1.stdev}</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">사이클 2</div>
                    <div className="stat-value">{objectStats.team2.avg}음절</div>
                    <div className="stat-value">{objectStats.team2.stdev}</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">사이클 3</div>
                    <div className="stat-value">{objectStats.team3.avg}음절</div>
                    <div className="stat-value">{objectStats.team3.stdev}</div>
                  </div>
                  <div className="stats-row total-row">
                    <div className="stat-label">전체</div>
                    <div className="stat-value">{objectStats.total.avg}음절</div>
                    <div className="stat-value">{objectStats.total.stdev}</div>
                  </div>
                </div>
              </div>

              {/* Function 분석 */}
              <div className="attribute-analysis-half">
                <h4>⚙️ Function (기능) 속성 길이</h4>
                <div className="team-stats-table">
                  <div className="stats-header">
                    <div className="stat-label">구분</div>
                    <div className="stat-value">평균</div>
                    <div className="stat-value">표준편차</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">사이클 1</div>
                    <div className="stat-value">{functionStats.team1.avg}음절</div>
                    <div className="stat-value">{functionStats.team1.stdev}</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">사이클 2</div>
                    <div className="stat-value">{functionStats.team2.avg}음절</div>
                    <div className="stat-value">{functionStats.team2.stdev}</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">사이클 3</div>
                    <div className="stat-value">{functionStats.team3.avg}음절</div>
                    <div className="stat-value">{functionStats.team3.stdev}</div>
                  </div>
                  <div className="stats-row total-row">
                    <div className="stat-label">전체</div>
                    <div className="stat-value">{functionStats.total.avg}음절</div>
                    <div className="stat-value">{functionStats.total.stdev}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 두 번째 줄: Behavior와 Structure */}
            <div className="attribute-analysis-row">
              {/* Behavior 분석 */}
              <div className="attribute-analysis-half">
                <h4>🎭 Behavior (행동) 속성 길이</h4>
                <div className="team-stats-table">
                  <div className="stats-header">
                    <div className="stat-label">구분</div>
                    <div className="stat-value">평균</div>
                    <div className="stat-value">표준편차</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">사이클 1</div>
                    <div className="stat-value">{behaviorStats.team1.avg}음절</div>
                    <div className="stat-value">{behaviorStats.team1.stdev}</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">사이클 2</div>
                    <div className="stat-value">{behaviorStats.team2.avg}음절</div>
                    <div className="stat-value">{behaviorStats.team2.stdev}</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">사이클 3</div>
                    <div className="stat-value">{behaviorStats.team3.avg}음절</div>
                    <div className="stat-value">{behaviorStats.team3.stdev}</div>
                  </div>
                  <div className="stats-row total-row">
                    <div className="stat-label">전체</div>
                    <div className="stat-value">{behaviorStats.total.avg}음절</div>
                    <div className="stat-value">{behaviorStats.total.stdev}</div>
                  </div>
                </div>
              </div>

              {/* Structure 분석 */}
              <div className="attribute-analysis-half">
                <h4>🏗️ Structure (구조) 속성 길이</h4>
                <div className="team-stats-table">
                  <div className="stats-header">
                    <div className="stat-label">구분</div>
                    <div className="stat-value">평균</div>
                    <div className="stat-value">표준편차</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">사이클 1</div>
                    <div className="stat-value">{structureStats.team1.avg}음절</div>
                    <div className="stat-value">{structureStats.team1.stdev}</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">사이클 2</div>
                    <div className="stat-value">{structureStats.team2.avg}음절</div>
                    <div className="stat-value">{structureStats.team2.stdev}</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">사이클 3</div>
                    <div className="stat-value">{structureStats.team3.avg}음절</div>
                    <div className="stat-value">{structureStats.team3.stdev}</div>
                  </div>
                  <div className="stats-row total-row">
                    <div className="stat-label">전체</div>
                    <div className="stat-value">{structureStats.total.avg}음절</div>
                    <div className="stat-value">{structureStats.total.stdev}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Object + Function + Behavior + Structure 총합 길이 분석 */}
            <div className="analysis-section">
              <h3>📐 아이디어 속성 총합 길이 분석 (사용자/에이전트별)</h3>
              <p className="section-description">
                Object + Function + Behavior + Structure 속성의 총합 길이를 사용자와 에이전트별로 분석합니다.
              </p>
              <div className="team-stats-table">
                <div className="stats-header">
                  <div className="stat-label">구분</div>
                  <div className="stat-value">사용자평균</div>
                  <div className="stat-value">SD</div>
                  <div className="stat-value">에이전트평균</div>
                  <div className="stat-value">SD</div>
                  <div className="stat-value">전체평균</div>
                  <div className="stat-value">SD</div>
                </div>
                <div className="stats-row">
                  <div className="stat-label">사이클 1</div>
                  <div className="stat-value">{totalAttributeLengthStats.team1.user.avg.toFixed(2)}음절</div>
                  <div className="stat-value">{totalAttributeLengthStats.team1.user.stdev.toFixed(2)}</div>
                  <div className="stat-value">{totalAttributeLengthStats.team1.agent.avg.toFixed(2)}음절</div>
                  <div className="stat-value">{totalAttributeLengthStats.team1.agent.stdev.toFixed(2)}</div>
                  <div className="stat-value">{totalAttributeLengthStats.team1.total.avg.toFixed(2)}음절</div>
                  <div className="stat-value">{totalAttributeLengthStats.team1.total.stdev.toFixed(2)}</div>
                </div>
                <div className="stats-row">
                  <div className="stat-label">사이클 2</div>
                  <div className="stat-value">{totalAttributeLengthStats.team2.user.avg.toFixed(2)}음절</div>
                  <div className="stat-value">{totalAttributeLengthStats.team2.user.stdev.toFixed(2)}</div>
                  <div className="stat-value">{totalAttributeLengthStats.team2.agent.avg.toFixed(2)}음절</div>
                  <div className="stat-value">{totalAttributeLengthStats.team2.agent.stdev.toFixed(2)}</div>
                  <div className="stat-value">{totalAttributeLengthStats.team2.total.avg.toFixed(2)}음절</div>
                  <div className="stat-value">{totalAttributeLengthStats.team2.total.stdev.toFixed(2)}</div>
                </div>
                <div className="stats-row">
                  <div className="stat-label">사이클 3</div>
                  <div className="stat-value">{totalAttributeLengthStats.team3.user.avg.toFixed(2)}음절</div>
                  <div className="stat-value">{totalAttributeLengthStats.team3.user.stdev.toFixed(2)}</div>
                  <div className="stat-value">{totalAttributeLengthStats.team3.agent.avg.toFixed(2)}음절</div>
                  <div className="stat-value">{totalAttributeLengthStats.team3.agent.stdev.toFixed(2)}</div>
                  <div className="stat-value">{totalAttributeLengthStats.team3.total.avg.toFixed(2)}음절</div>
                  <div className="stat-value">{totalAttributeLengthStats.team3.total.stdev.toFixed(2)}</div>
                </div>
                <div className="stats-row total-row">
                  <div className="stat-label">전체</div>
                  <div className="stat-value">{totalAttributeLengthStats.total.user.avg.toFixed(2)}음절</div>
                  <div className="stat-value">{totalAttributeLengthStats.total.user.stdev.toFixed(2)}</div>
                  <div className="stat-value">{totalAttributeLengthStats.total.agent.avg.toFixed(2)}음절</div>
                  <div className="stat-value">{totalAttributeLengthStats.total.agent.stdev.toFixed(2)}</div>
                  <div className="stat-value">{totalAttributeLengthStats.total.total.avg.toFixed(2)}음절</div>
                  <div className="stat-value">{totalAttributeLengthStats.total.total.stdev.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 평가 탭 */}
      {activeResultTab === 'evaluation' && (
        <div className="tab-content">
          <div className="analysis-section">
            <h3>⭐ 아이디어 평가 분석</h3>
            <p className="section-description">
              각 팀 사이클에서 수행된 아이디어 평가의 횟수, 점수 분포, 코멘트 길이를 분석합니다.
            </p>
            
            {/* 평가 횟수 분석 */}
            <div className="evaluation-analysis">
              <h4>📊 사이클별 평가 횟수</h4>
              <div className="team-stats-table">
                <div className="stats-header">
                  <div className="stat-label">구분</div>
                  <div className="stat-value">총 평가수</div>
                  <div className="stat-value">팀당 평균</div>
                  <div className="stat-value">최소</div>
                  <div className="stat-value">최대</div>
                  <div className="stat-value">표준편차</div>
                </div>
                <div className="stats-row">
                  <div className="stat-label">사이클 1</div>
                  <div className="stat-value">{evaluationStats.team1.totalEvaluations}회</div>
                  <div className="stat-value">{evaluationStats.team1.avgPerTeam}회</div>
                  <div className="stat-value">{evaluationStats.team1.minPerTeam}회</div>
                  <div className="stat-value">{evaluationStats.team1.maxPerTeam}회</div>
                  <div className="stat-value">{evaluationStats.team1.stdevPerTeam}</div>
                </div>
                <div className="stats-row">
                  <div className="stat-label">사이클 2</div>
                  <div className="stat-value">{evaluationStats.team2.totalEvaluations}회</div>
                  <div className="stat-value">{evaluationStats.team2.avgPerTeam}회</div>
                  <div className="stat-value">{evaluationStats.team2.minPerTeam}회</div>
                  <div className="stat-value">{evaluationStats.team2.maxPerTeam}회</div>
                  <div className="stat-value">{evaluationStats.team2.stdevPerTeam}</div>
                </div>
                <div className="stats-row">
                  <div className="stat-label">사이클 3</div>
                  <div className="stat-value">{evaluationStats.team3.totalEvaluations}회</div>
                  <div className="stat-value">{evaluationStats.team3.avgPerTeam}회</div>
                  <div className="stat-value">{evaluationStats.team3.minPerTeam}회</div>
                  <div className="stat-value">{evaluationStats.team3.maxPerTeam}회</div>
                  <div className="stat-value">{evaluationStats.team3.stdevPerTeam}</div>
                </div>
                <div className="stats-row total-row">
                  <div className="stat-label">전체</div>
                  <div className="stat-value">{evaluationStats.total.totalEvaluations}회</div>
                  <div className="stat-value">{evaluationStats.total.avgPerTeam}회</div>
                  <div className="stat-value">{evaluationStats.total.minPerTeam}회</div>
                  <div className="stat-value">{evaluationStats.total.maxPerTeam}회</div>
                  <div className="stat-value">{evaluationStats.total.stdevPerTeam}</div>
                </div>
              </div>
            </div>

            {/* 평가 점수 분석 */}
            <div className="evaluation-analysis">
              <h4>📊 평가 기준별 점수 분포</h4>
              <p className="section-description">
                참신성(Novelty), 완성도(Completeness), 품질(Quality) 기준별 평가 점수의 통계적 분포입니다.
              </p>

              {/* 참신성, 완성도, 품질 점수 */}
              <div className="attribute-analysis-row">
                <div className="attribute-analysis-third">
                  <h5>💡 참신성 점수</h5>
                  <div className="team-stats-table">
                    <div className="stats-header">
                      <div className="stat-label">구분</div>
                      <div className="stat-value">평균</div>
                      <div className="stat-value">표준편차</div>
                    </div>
                    <div className="stats-row">
                      <div className="stat-label">사이클 1</div>
                      <div className="stat-value">{scoreStats.team1.novelty.avg}점</div>
                      <div className="stat-value">{scoreStats.team1.novelty.stdev}</div>
                    </div>
                    <div className="stats-row">
                      <div className="stat-label">사이클 2</div>
                      <div className="stat-value">{scoreStats.team2.novelty.avg}점</div>
                      <div className="stat-value">{scoreStats.team2.novelty.stdev}</div>
                    </div>
                    <div className="stats-row">
                      <div className="stat-label">사이클 3</div>
                      <div className="stat-value">{scoreStats.team3.novelty.avg}점</div>
                      <div className="stat-value">{scoreStats.team3.novelty.stdev}</div>
                    </div>
                    <div className="stats-row total-row">
                      <div className="stat-label">전체</div>
                      <div className="stat-value">{scoreStats.total.novelty.avg}점</div>
                      <div className="stat-value">{scoreStats.total.novelty.stdev}</div>
                    </div>
                  </div>
                </div>

                <div className="attribute-analysis-third">
                  <h5>🏗️ 완성도 점수</h5>
                  <div className="team-stats-table">
                    <div className="stats-header">
                      <div className="stat-label">구분</div>
                      <div className="stat-value">평균</div>
                      <div className="stat-value">표준편차</div>
                    </div>
                    <div className="stats-row">
                      <div className="stat-label">사이클 1</div>
                      <div className="stat-value">{scoreStats.team1.completeness.avg}점</div>
                      <div className="stat-value">{scoreStats.team1.completeness.stdev}</div>
                    </div>
                    <div className="stats-row">
                      <div className="stat-label">사이클 2</div>
                      <div className="stat-value">{scoreStats.team2.completeness.avg}점</div>
                      <div className="stat-value">{scoreStats.team2.completeness.stdev}</div>
                    </div>
                    <div className="stats-row">
                      <div className="stat-label">사이클 3</div>
                      <div className="stat-value">{scoreStats.team3.completeness.avg}점</div>
                      <div className="stat-value">{scoreStats.team3.completeness.stdev}</div>
                    </div>
                    <div className="stats-row total-row">
                      <div className="stat-label">전체</div>
                      <div className="stat-value">{scoreStats.total.completeness.avg}점</div>
                      <div className="stat-value">{scoreStats.total.completeness.stdev}</div>
                    </div>
                  </div>
                </div>

                <div className="attribute-analysis-third">
                  <h5>⭐ 품질 점수</h5>
                  <div className="team-stats-table">
                    <div className="stats-header">
                      <div className="stat-label">구분</div>
                      <div className="stat-value">평균</div>
                      <div className="stat-value">표준편차</div>
                    </div>
                    <div className="stats-row">
                      <div className="stat-label">사이클 1</div>
                      <div className="stat-value">{scoreStats.team1.quality.avg}점</div>
                      <div className="stat-value">{scoreStats.team1.quality.stdev}</div>
                    </div>
                    <div className="stats-row">
                      <div className="stat-label">사이클 2</div>
                      <div className="stat-value">{scoreStats.team2.quality.avg}점</div>
                      <div className="stat-value">{scoreStats.team2.quality.stdev}</div>
                    </div>
                    <div className="stats-row">
                      <div className="stat-label">사이클 3</div>
                      <div className="stat-value">{scoreStats.team3.quality.avg}점</div>
                      <div className="stat-value">{scoreStats.team3.quality.stdev}</div>
                    </div>
                    <div className="stats-row total-row">
                      <div className="stat-label">전체</div>
                      <div className="stat-value">{scoreStats.total.quality.avg}점</div>
                      <div className="stat-value">{scoreStats.total.quality.stdev}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 사용자 vs AI 평가 비교 */}
            <div className="evaluation-analysis">
              <h4>👥 사용자 vs AI 평가 비교</h4>
              <p className="section-description">
                사용자와 AI가 제공한 평가의 점수 차이와 패턴을 비교 분석합니다.
              </p>

              {/* 참신성 점수 비교 */}
              <div className="comparison-section">
                <h5>💡 참신성 점수 비교</h5>
                <div className="team-stats-table">
                  <div className="stats-header">
                    <div className="stat-label">구분</div>
                    <div className="stat-value">사용자 평균</div>
                    <div className="stat-value">AI 평균</div>
                    <div className="stat-value">점수 차이</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">사이클 1</div>
                    <div className="stat-value">{userVsAiEvalStats.team1.user.novelty.avg}점</div>
                    <div className="stat-value">{userVsAiEvalStats.team1.ai.novelty.avg}점</div>
                    <div className="stat-value">{(userVsAiEvalStats.team1.user.novelty.avg - userVsAiEvalStats.team1.ai.novelty.avg).toFixed(2)}점</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">사이클 2</div>
                    <div className="stat-value">{userVsAiEvalStats.team2.user.novelty.avg}점</div>
                    <div className="stat-value">{userVsAiEvalStats.team2.ai.novelty.avg}점</div>
                    <div className="stat-value">{(userVsAiEvalStats.team2.user.novelty.avg - userVsAiEvalStats.team2.ai.novelty.avg).toFixed(2)}점</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">사이클 3</div>
                    <div className="stat-value">{userVsAiEvalStats.team3.user.novelty.avg}점</div>
                    <div className="stat-value">{userVsAiEvalStats.team3.ai.novelty.avg}점</div>
                    <div className="stat-value">{(userVsAiEvalStats.team3.user.novelty.avg - userVsAiEvalStats.team3.ai.novelty.avg).toFixed(2)}점</div>
                  </div>
                  <div className="stats-row total-row">
                    <div className="stat-label">전체</div>
                    <div className="stat-value">{userVsAiEvalStats.total.user.novelty.avg}점</div>
                    <div className="stat-value">{userVsAiEvalStats.total.ai.novelty.avg}점</div>
                    <div className="stat-value">{(userVsAiEvalStats.total.user.novelty.avg - userVsAiEvalStats.total.ai.novelty.avg).toFixed(2)}점</div>
                  </div>
                </div>
              </div>

              {/* 완성도 점수 비교 */}
              <div className="comparison-section">
                <h5>🏗️ 완성도 점수 비교</h5>
                <div className="team-stats-table">
                  <div className="stats-header">
                    <div className="stat-label">구분</div>
                    <div className="stat-value">사용자 평균</div>
                    <div className="stat-value">AI 평균</div>
                    <div className="stat-value">점수 차이</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">사이클 1</div>
                    <div className="stat-value">{userVsAiEvalStats.team1.user.completeness.avg}점</div>
                    <div className="stat-value">{userVsAiEvalStats.team1.ai.completeness.avg}점</div>
                    <div className="stat-value">{(userVsAiEvalStats.team1.user.completeness.avg - userVsAiEvalStats.team1.ai.completeness.avg).toFixed(2)}점</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">사이클 2</div>
                    <div className="stat-value">{userVsAiEvalStats.team2.user.completeness.avg}점</div>
                    <div className="stat-value">{userVsAiEvalStats.team2.ai.completeness.avg}점</div>
                    <div className="stat-value">{(userVsAiEvalStats.team2.user.completeness.avg - userVsAiEvalStats.team2.ai.completeness.avg).toFixed(2)}점</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">사이클 3</div>
                    <div className="stat-value">{userVsAiEvalStats.team3.user.completeness.avg}점</div>
                    <div className="stat-value">{userVsAiEvalStats.team3.ai.completeness.avg}점</div>
                    <div className="stat-value">{(userVsAiEvalStats.team3.user.completeness.avg - userVsAiEvalStats.team3.ai.completeness.avg).toFixed(2)}점</div>
                  </div>
                  <div className="stats-row total-row">
                    <div className="stat-label">전체</div>
                    <div className="stat-value">{userVsAiEvalStats.total.user.completeness.avg}점</div>
                    <div className="stat-value">{userVsAiEvalStats.total.ai.completeness.avg}점</div>
                    <div className="stat-value">{(userVsAiEvalStats.total.user.completeness.avg - userVsAiEvalStats.total.ai.completeness.avg).toFixed(2)}점</div>
                  </div>
                </div>
              </div>

              {/* 품질 점수 비교 */}
              <div className="comparison-section">
                <h5>⭐ 품질 점수 비교</h5>
                <div className="team-stats-table">
                  <div className="stats-header">
                    <div className="stat-label">구분</div>
                    <div className="stat-value">사용자 평균</div>
                    <div className="stat-value">AI 평균</div>
                    <div className="stat-value">점수 차이</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">사이클 1</div>
                    <div className="stat-value">{userVsAiEvalStats.team1.user.quality.avg}점</div>
                    <div className="stat-value">{userVsAiEvalStats.team1.ai.quality.avg}점</div>
                    <div className="stat-value">{(userVsAiEvalStats.team1.user.quality.avg - userVsAiEvalStats.team1.ai.quality.avg).toFixed(2)}점</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">사이클 2</div>
                    <div className="stat-value">{userVsAiEvalStats.team2.user.quality.avg}점</div>
                    <div className="stat-value">{userVsAiEvalStats.team2.ai.quality.avg}점</div>
                    <div className="stat-value">{(userVsAiEvalStats.team2.user.quality.avg - userVsAiEvalStats.team2.ai.quality.avg).toFixed(2)}점</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">사이클 3</div>
                    <div className="stat-value">{userVsAiEvalStats.team3.user.quality.avg}점</div>
                    <div className="stat-value">{userVsAiEvalStats.team3.ai.quality.avg}점</div>
                    <div className="stat-value">{(userVsAiEvalStats.team3.user.quality.avg - userVsAiEvalStats.team3.ai.quality.avg).toFixed(2)}점</div>
                  </div>
                  <div className="stats-row total-row">
                    <div className="stat-label">전체</div>
                    <div className="stat-value">{userVsAiEvalStats.total.user.quality.avg}점</div>
                    <div className="stat-value">{userVsAiEvalStats.total.ai.quality.avg}점</div>
                    <div className="stat-value">{(userVsAiEvalStats.total.user.quality.avg - userVsAiEvalStats.total.ai.quality.avg).toFixed(2)}점</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 평가 코멘트 길이 분석 */}
            <div className="evaluation-analysis">
              <h4>📝 평가 코멘트 길이 분석</h4>
              <p className="section-description">
                평가 시 작성된 코멘트의 길이를 음절 단위로 분석하여 평가의 상세도를 측정합니다.
              </p>

              <div className="team-stats-table">
                <div className="stats-header">
                  <div className="stat-label">구분</div>
                  <div className="stat-value">평균 길이</div>
                  <div className="stat-value">표준편차</div>
                  <div className="stat-value">최소/최대</div>
                  <div className="stat-value">총 코멘트 수</div>
                </div>
                <div className="stats-row">
                  <div className="stat-label">사이클 1</div>
                  <div className="stat-value">{commentStats.team1.avg}음절</div>
                  <div className="stat-value">{commentStats.team1.stdev}</div>
                  <div className="stat-value">{commentStats.team1.min}/{commentStats.team1.max}음절</div>
                  <div className="stat-value">{team1EvalData.commentLengths.length}개</div>
                </div>
                <div className="stats-row">
                  <div className="stat-label">사이클 2</div>
                  <div className="stat-value">{commentStats.team2.avg}음절</div>
                  <div className="stat-value">{commentStats.team2.stdev}</div>
                  <div className="stat-value">{commentStats.team2.min}/{commentStats.team2.max}음절</div>
                  <div className="stat-value">{team2EvalData.commentLengths.length}개</div>
                </div>
                <div className="stats-row">
                  <div className="stat-label">사이클 3</div>
                  <div className="stat-value">{commentStats.team3.avg}음절</div>
                  <div className="stat-value">{commentStats.team3.stdev}</div>
                  <div className="stat-value">{commentStats.team3.min}/{commentStats.team3.max}음절</div>
                  <div className="stat-value">{team3EvalData.commentLengths.length}개</div>
                </div>
                <div className="stats-row total-row">
                  <div className="stat-label">전체</div>
                  <div className="stat-value">{commentStats.total.avg}음절</div>
                  <div className="stat-value">{commentStats.total.stdev}</div>
                  <div className="stat-value">{commentStats.total.min}/{commentStats.total.max}음절</div>
                  <div className="stat-value">{totalEvalData.commentLengths.length}개</div>
                </div>
              </div>

              {/* 사용자 vs AI 코멘트 길이 비교 */}
              <div className="comparison-section">
                <h5>👥 사용자 vs AI 코멘트 길이 비교</h5>
                <div className="team-stats-table">
                  <div className="stats-header">
                    <div className="stat-label">구분</div>
                    <div className="stat-value">사용자 평균</div>
                    <div className="stat-value">AI 평균</div>
                    <div className="stat-value">길이 차이</div>
                    <div className="stat-value">사용자 수</div>
                    <div className="stat-value">AI 수</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">사이클 1</div>
                    <div className="stat-value">{userVsAiEvalStats.team1.user.comments.avg} ± {userVsAiEvalStats.team1.user.comments.stdev}음절</div>
                    <div className="stat-value">{userVsAiEvalStats.team1.ai.comments.avg} ± {userVsAiEvalStats.team1.ai.comments.stdev}음절</div>
                    <div className="stat-value">{(userVsAiEvalStats.team1.user.comments.avg - userVsAiEvalStats.team1.ai.comments.avg).toFixed(1)}음절</div>
                    <div className="stat-value">{team1EvalData.userEvaluations.comments.length}개</div>
                    <div className="stat-value">{team1EvalData.aiEvaluations.comments.length}개</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">사이클 2</div>
                    <div className="stat-value">{userVsAiEvalStats.team2.user.comments.avg} ± {userVsAiEvalStats.team2.user.comments.stdev}음절</div>
                    <div className="stat-value">{userVsAiEvalStats.team2.ai.comments.avg} ± {userVsAiEvalStats.team2.ai.comments.stdev}음절</div>
                    <div className="stat-value">{(userVsAiEvalStats.team2.user.comments.avg - userVsAiEvalStats.team2.ai.comments.avg).toFixed(1)}음절</div>
                    <div className="stat-value">{team2EvalData.userEvaluations.comments.length}개</div>
                    <div className="stat-value">{team2EvalData.aiEvaluations.comments.length}개</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">사이클 3</div>
                    <div className="stat-value">{userVsAiEvalStats.team3.user.comments.avg} ± {userVsAiEvalStats.team3.user.comments.stdev}음절</div>
                    <div className="stat-value">{userVsAiEvalStats.team3.ai.comments.avg} ± {userVsAiEvalStats.team3.ai.comments.stdev}음절</div>
                    <div className="stat-value">{(userVsAiEvalStats.team3.user.comments.avg - userVsAiEvalStats.team3.ai.comments.avg).toFixed(1)}음절</div>
                    <div className="stat-value">{team3EvalData.userEvaluations.comments.length}개</div>
                    <div className="stat-value">{team3EvalData.aiEvaluations.comments.length}개</div>
                  </div>
                  <div className="stats-row total-row">
                    <div className="stat-label">전체</div>
                    <div className="stat-value">{userVsAiEvalStats.total.user.comments.avg} ± {userVsAiEvalStats.total.user.comments.stdev}음절</div>
                    <div className="stat-value">{userVsAiEvalStats.total.ai.comments.avg} ± {userVsAiEvalStats.total.ai.comments.stdev}음절</div>
                    <div className="stat-value">{(userVsAiEvalStats.total.user.comments.avg - userVsAiEvalStats.total.ai.comments.avg).toFixed(1)}음절</div>
                    <div className="stat-value">{totalEvalData.userEvaluations.comments.length}개</div>
                    <div className="stat-value">{totalEvalData.aiEvaluations.comments.length}개</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 피드백 탭 */}
      {activeResultTab === 'feedback' && (
        <div className="tab-content">
          <div className="analysis-section">
            <h3>💬 피드백 분석</h3>
            <p className="section-description">
              각 팀 사이클에서 수행된 피드백의 횟수, 길이, 유형별 분석 결과입니다.
            </p>
            
            {/* 사이클별 피드백 횟수 분석 */}
            <div className="feedback-count-analysis">
              <h4>📊 사이클별 피드백 횟수</h4>
              <div className="team-stats-table">
                <div className="stats-header">
                  <div className="stat-label">구분</div>
                  <div className="stat-value">총 피드백</div>
                  <div className="stat-value">👤 사용자</div>
                  <div className="stat-value">🤖 AI</div>
                  <div className="stat-value">팀당 평균</div>
                  <div className="stat-value">최소/최대</div>
                  <div className="stat-value">표준편차</div>
                </div>
                <div className="stats-row">
                  <div className="stat-label">사이클 1</div>
                  <div className="stat-value">{feedbackStats.team1.totalFeedbacks}회</div>
                  <div className="stat-value">{team1FeedbackData.userFeedbacks.length}회</div>
                  <div className="stat-value">{team1FeedbackData.aiFeedbacks.length}회</div>
                  <div className="stat-value">{feedbackStats.team1.avgPerTeam}회</div>
                  <div className="stat-value">{feedbackStats.team1.minPerTeam}/{feedbackStats.team1.maxPerTeam}회</div>
                  <div className="stat-value">{feedbackStats.team1.stdevPerTeam}</div>
                </div>
                <div className="stats-row">
                  <div className="stat-label">사이클 2</div>
                  <div className="stat-value">{feedbackStats.team2.totalFeedbacks}회</div>
                  <div className="stat-value">{team2FeedbackData.userFeedbacks.length}회</div>
                  <div className="stat-value">{team2FeedbackData.aiFeedbacks.length}회</div>
                  <div className="stat-value">{feedbackStats.team2.avgPerTeam}회</div>
                  <div className="stat-value">{feedbackStats.team2.minPerTeam}/{feedbackStats.team2.maxPerTeam}회</div>
                  <div className="stat-value">{feedbackStats.team2.stdevPerTeam}</div>
                </div>
                <div className="stats-row">
                  <div className="stat-label">사이클 3</div>
                  <div className="stat-value">{feedbackStats.team3.totalFeedbacks}회</div>
                  <div className="stat-value">{team3FeedbackData.userFeedbacks.length}회</div>
                  <div className="stat-value">{team3FeedbackData.aiFeedbacks.length}회</div>
                  <div className="stat-value">{feedbackStats.team3.avgPerTeam}회</div>
                  <div className="stat-value">{feedbackStats.team3.minPerTeam}/{feedbackStats.team3.maxPerTeam}회</div>
                  <div className="stat-value">{feedbackStats.team3.stdevPerTeam}</div>
                </div>
                <div className="stats-row total-row">
                  <div className="stat-label">전체</div>
                  <div className="stat-value">{feedbackStats.total.totalFeedbacks}회</div>
                  <div className="stat-value">{totalFeedbackData.userFeedbacks.length}회</div>
                  <div className="stat-value">{totalFeedbackData.aiFeedbacks.length}회</div>
                  <div className="stat-value">{feedbackStats.total.avgPerTeam}회</div>
                  <div className="stat-value">{feedbackStats.total.minPerTeam}/{feedbackStats.total.maxPerTeam}회</div>
                  <div className="stat-value">{feedbackStats.total.stdevPerTeam}</div>
                </div>
              </div>
            </div>

            {/* 피드백 세션 상세 분석 */}
            <div className="feedback-session-analysis">
              <h4>🔍 피드백 세션 참여자 분석</h4>
              <div className="team-stats-table">
                <div className="stats-header">
                  <div className="stat-label">구분</div>
                  <div className="stat-value">총 세션</div>
                  <div className="stat-value">👤 사용자 개시</div>
                  <div className="stat-value">🤖 AI 개시</div>
                  <div className="stat-value">AI 전용 세션</div>
                  <div className="stat-value">대화 매칭률</div>
                </div>
                <div className="stats-row">
                  <div className="stat-label">사이클 1</div>
                  <div className="stat-value">{team1FeedbackData.totalFeedbacks}회</div>
                  <div className="stat-value">{team1FeedbackData.userInitiatedCount}회</div>
                  <div className="stat-value">{team1FeedbackData.aiInitiatedCount}회</div>
                  <div className="stat-value">{team1FeedbackData.noUserMessageSessions}회</div>
                  <div className="stat-value">{team1FeedbackData.totalFeedbacks > 0 ? ((team1FeedbackData.hasRequestSessions / team1FeedbackData.totalFeedbacks) * 100).toFixed(1) : 0}%</div>
                </div>
                <div className="stats-row">
                  <div className="stat-label">사이클 2</div>
                  <div className="stat-value">{team2FeedbackData.totalFeedbacks}회</div>
                  <div className="stat-value">{team2FeedbackData.userInitiatedCount}회</div>
                  <div className="stat-value">{team2FeedbackData.aiInitiatedCount}회</div>
                  <div className="stat-value">{team2FeedbackData.noUserMessageSessions}회</div>
                  <div className="stat-value">{team2FeedbackData.totalFeedbacks > 0 ? ((team2FeedbackData.hasRequestSessions / team2FeedbackData.totalFeedbacks) * 100).toFixed(1) : 0}%</div>
                </div>
                <div className="stats-row">
                  <div className="stat-label">사이클 3</div>
                  <div className="stat-value">{team3FeedbackData.totalFeedbacks}회</div>
                  <div className="stat-value">{team3FeedbackData.userInitiatedCount}회</div>
                  <div className="stat-value">{team3FeedbackData.aiInitiatedCount}회</div>
                  <div className="stat-value">{team3FeedbackData.noUserMessageSessions}회</div>
                  <div className="stat-value">{team3FeedbackData.totalFeedbacks > 0 ? ((team3FeedbackData.hasRequestSessions / team3FeedbackData.totalFeedbacks) * 100).toFixed(1) : 0}%</div>
                </div>
                <div className="stats-row total-row">
                  <div className="stat-label">전체</div>
                  <div className="stat-value">{totalFeedbackData.totalFeedbacks}회</div>
                  <div className="stat-value">{totalFeedbackData.userInitiatedCount}회</div>
                  <div className="stat-value">{totalFeedbackData.aiInitiatedCount}회</div>
                  <div className="stat-value">{totalFeedbackData.noUserMessageSessions}회</div>
                  <div className="stat-value">{totalFeedbackData.totalFeedbacks > 0 ? ((totalFeedbackData.hasRequestSessions / totalFeedbackData.totalFeedbacks) * 100).toFixed(1) : 0}%</div>
                </div>
              </div>

              {/* 사용자별 세부 통계 */}
              <h5>👤 사용자 개시 세션 분석</h5>
              <div className="team-stats-table">
                <div className="stats-header">
                  <div className="stat-label">구분</div>
                  <div className="stat-value">총 사용자 개시</div>
                  <div className="stat-value">사용자당 평균</div>
                  <div className="stat-value">최소/최대</div>
                  <div className="stat-value">표준편차</div>
                </div>
                <div className="stats-row">
                  <div className="stat-label">사이클 1</div>
                  <div className="stat-value">{team1FeedbackData.userInitiatedCount}회</div>
                  <div className="stat-value">{team1SessionStats.avgUserPerTeam}회</div>
                  <div className="stat-value">{team1SessionStats.minUserPerTeam}/{team1SessionStats.maxUserPerTeam}회</div>
                  <div className="stat-value">{team1SessionStats.stdevUserPerTeam}</div>
                </div>
                <div className="stats-row">
                  <div className="stat-label">사이클 2</div>
                  <div className="stat-value">{team2FeedbackData.userInitiatedCount}회</div>
                  <div className="stat-value">{team2SessionStats.avgUserPerTeam}회</div>
                  <div className="stat-value">{team2SessionStats.minUserPerTeam}/{team2SessionStats.maxUserPerTeam}회</div>
                  <div className="stat-value">{team2SessionStats.stdevUserPerTeam}</div>
                </div>
                <div className="stats-row">
                  <div className="stat-label">사이클 3</div>
                  <div className="stat-value">{team3FeedbackData.userInitiatedCount}회</div>
                  <div className="stat-value">{team3SessionStats.avgUserPerTeam}회</div>
                  <div className="stat-value">{team3SessionStats.minUserPerTeam}/{team3SessionStats.maxUserPerTeam}회</div>
                  <div className="stat-value">{team3SessionStats.stdevUserPerTeam}</div>
                </div>
              </div>

              {/* 에이전트별 세부 통계 */}
              <h5>🤖 AI 개시 세션 분석</h5>
              <div className="team-stats-table">
                <div className="stats-header">
                  <div className="stat-label">구분</div>
                  <div className="stat-value">총 AI 개시</div>
                  <div className="stat-value">에이전트당 평균</div>
                  <div className="stat-value">최소/최대</div>
                  <div className="stat-value">표준편차</div>
                </div>
                <div className="stats-row">
                  <div className="stat-label">사이클 1</div>
                  <div className="stat-value">{team1FeedbackData.aiInitiatedCount}회</div>
                  <div className="stat-value">{team1SessionStats.avgAiPerAgent}회</div>
                  <div className="stat-value">{team1SessionStats.minAiPerAgent}/{team1SessionStats.maxAiPerAgent}회</div>
                  <div className="stat-value">{team1SessionStats.stdevAiPerAgent}</div>
                </div>
                <div className="stats-row">
                  <div className="stat-label">사이클 2</div>
                  <div className="stat-value">{team2FeedbackData.aiInitiatedCount}회</div>
                  <div className="stat-value">{team2SessionStats.avgAiPerAgent}회</div>
                  <div className="stat-value">{team2SessionStats.minAiPerAgent}/{team2SessionStats.maxAiPerAgent}회</div>
                  <div className="stat-value">{team2SessionStats.stdevAiPerAgent}</div>
                </div>
                <div className="stats-row">
                  <div className="stat-label">사이클 3</div>
                  <div className="stat-value">{team3FeedbackData.aiInitiatedCount}회</div>
                  <div className="stat-value">{team3SessionStats.avgAiPerAgent}회</div>
                  <div className="stat-value">{team3SessionStats.minAiPerAgent}/{team3SessionStats.maxAiPerAgent}회</div>
                  <div className="stat-value">{team3SessionStats.stdevAiPerAgent}</div>
                </div>
              </div>

              {/* 세션별 상세 참여자 정보 - 토글 */}
              <div className="session-details-toggle">
                <button 
                  className="toggle-button"
                  onClick={() => setExpandedSessionDetails(!expandedSessionDetails)}
                >
                  📋 전체 피드백 세션 참여자 상세 (총 {totalFeedbackData.totalFeedbacks}개 세션) {expandedSessionDetails ? '▲' : '▼'}
                </button>
              </div>
              
              {expandedSessionDetails && (
              <div className="session-details">
                <h5>📋 전체 피드백 세션 참여자 상세 (총 {totalFeedbackData.totalFeedbacks}개 세션)</h5>
                <div className="session-participant-list">
                  {/* 사이클 1 */}
                  {team1Data.map((team, teamIndex) => (
                    <div key={`cycle1-${teamIndex}`} className="team-sessions">
                      <h6>사이클 1 - 팀 {teamIndex + 1} (Owner: {(() => {
                        const ownerName = team.owner_info?.name || team.owner || 'Unknown';
                        // P? 형식으로 변환 (사용자인 경우)
                        if (ownerName && !ownerName.startsWith('agent_') && !ownerName.includes('agent')) {
                          const pNumber = ownerName.match(/P(\d+)/)?.[0] || `P${teamIndex + 1}`;
                          return pNumber;
                        }
                        return ownerName;
                      })()})</h6>
                      {team.chat && (() => {
                        const feedbackSessions = [];
                        team.chat.forEach(chatItem => {
                          try {
                            const messageData = typeof chatItem === 'string' ? JSON.parse(chatItem) : chatItem;
                            if (messageData.type === 'feedback_session_summary') {
                              feedbackSessions.push(messageData);
                            }
                          } catch (e) {}
                        });
                        return feedbackSessions.map((session, sessionIndex) => {
                          const participants = session.payload?.participants || [];
                          const sessionMessages = session.payload?.sessionMessages || [];
                          // 사용자가 정의한 이름 찾기
                          const userDefinedName = getUserDefinedName(team);
                          
                          const userMessages = sessionMessages.filter(msg => {
                            const sender = (msg.sender || '').trim();
                            // 사용자가 정의한 이름인 경우만 사용자 메시지로 카운팅
                            return sender === userDefinedName;
                          });
                          
                          // 참여자 목록을 P? 형식으로 변환
                          const formattedParticipants = participants.map(participant => {
                            if (participant && !participant.startsWith('agent_') && !participant.includes('agent')) {
                              return participant.match(/P\d+/)?.[0] || participant;
                            }
                            return participant;
                          });
                          
                          return (
                            <div key={sessionIndex} className="session-detail">
                              <div className="session-info">
                                <strong>세션 {sessionIndex + 1}:</strong>
                                <span className="participants">
                                  참여자: {formattedParticipants.length > 0 ? formattedParticipants.join(', ') : '정보 없음'}
                                </span>
                                <span className="user-participation">
                                  {userMessages.length > 0 || participants.includes(userDefinedName) || participants.includes('나') ? ' 👤' : ''}
                                </span>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  ))}
                  
                  {/* 사이클 2 */}
                  {team2Data.map((team, teamIndex) => (
                    <div key={`cycle2-${teamIndex}`} className="team-sessions">
                      <h6>사이클 2 - 팀 {teamIndex + 1} (Owner: {(() => {
                        const ownerName = team.owner_info?.name || team.owner || 'Unknown';
                        // P? 형식으로 변환 (사용자인 경우)
                        if (ownerName && !ownerName.startsWith('agent_') && !ownerName.includes('agent')) {
                          const pNumber = ownerName.match(/P(\d+)/)?.[0] || `P${teamIndex + 1}`;
                          return pNumber;
                        }
                        return ownerName;
                      })()})</h6>
                      {team.chat && (() => {
                        const feedbackSessions = [];
                        team.chat.forEach(chatItem => {
                          try {
                            const messageData = typeof chatItem === 'string' ? JSON.parse(chatItem) : chatItem;
                            if (messageData.type === 'feedback_session_summary') {
                              feedbackSessions.push(messageData);
                            }
                          } catch (e) {}
                        });
                        return feedbackSessions.map((session, sessionIndex) => {
                          const participants = session.payload?.participants || [];
                          const sessionMessages = session.payload?.sessionMessages || [];
                          // 사용자가 정의한 이름 찾기
                          const userDefinedName = getUserDefinedName(team);
                          
                          const userMessages = sessionMessages.filter(msg => {
                            const sender = (msg.sender || '').trim();
                            // 사용자가 정의한 이름인 경우만 사용자 메시지로 카운팅
                            return sender === userDefinedName;
                          });
                          
                          // 참여자 목록을 P? 형식으로 변환
                          const formattedParticipants = participants.map(participant => {
                            if (participant && !participant.startsWith('agent_') && !participant.includes('agent')) {
                              return participant.match(/P\d+/)?.[0] || participant;
                            }
                            return participant;
                          });
                          
                          return (
                            <div key={sessionIndex} className="session-detail">
                              <div className="session-info">
                                <strong>세션 {sessionIndex + 1}:</strong>
                                <span className="participants">
                                  참여자: {formattedParticipants.length > 0 ? formattedParticipants.join(', ') : '정보 없음'}
                                </span>
                                <span className="user-participation">
                                  {userMessages.length > 0 || participants.includes(userDefinedName) || participants.includes('나') ? ' 👤' : ''}
                                </span>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  ))}
                  
                  {/* 사이클 3 */}
                  {team3Data.map((team, teamIndex) => (
                    <div key={`cycle3-${teamIndex}`} className="team-sessions">
                      <h6>사이클 3 - 팀 {teamIndex + 1} (Owner: {(() => {
                        const ownerName = team.owner_info?.name || team.owner || 'Unknown';
                        // P? 형식으로 변환 (사용자인 경우)
                        if (ownerName && !ownerName.startsWith('agent_') && !ownerName.includes('agent')) {
                          const pNumber = ownerName.match(/P(\d+)/)?.[0] || `P${teamIndex + 1}`;
                          return pNumber;
                        }
                        return ownerName;
                      })()})</h6>
                      {team.chat && (() => {
                        const feedbackSessions = [];
                        team.chat.forEach(chatItem => {
                          try {
                            const messageData = typeof chatItem === 'string' ? JSON.parse(chatItem) : chatItem;
                            if (messageData.type === 'feedback_session_summary') {
                              feedbackSessions.push(messageData);
                            }
                          } catch (e) {}
                        });
                        return feedbackSessions.map((session, sessionIndex) => {
                          const participants = session.payload?.participants || [];
                          const sessionMessages = session.payload?.sessionMessages || [];
                          // 사용자가 정의한 이름 찾기
                          const userDefinedName = getUserDefinedName(team);
                          
                          const userMessages = sessionMessages.filter(msg => {
                            const sender = (msg.sender || '').trim();
                            // 사용자가 정의한 이름인 경우만 사용자 메시지로 카운팅
                            return sender === userDefinedName;
                          });
                          
                          // 참여자 목록을 P? 형식으로 변환
                          const formattedParticipants = participants.map(participant => {
                            if (participant && !participant.startsWith('agent_') && !participant.includes('agent')) {
                              return participant.match(/P\d+/)?.[0] || participant;
                            }
                            return participant;
                          });
                          
                          return (
                            <div key={sessionIndex} className="session-detail">
                              <div className="session-info">
                                <strong>세션 {sessionIndex + 1}:</strong>
                                <span className="participants">
                                  참여자: {formattedParticipants.length > 0 ? formattedParticipants.join(', ') : '정보 없음'}
                                </span>
                                <span className="user-participation">
                                  {userMessages.length > 0 || participants.includes(userDefinedName) || participants.includes('나') ? ' 👤' : ''}
                                </span>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  ))}
                </div>
              </div>
              )}
            </div>

            {/* 사용자 vs AI 피드백 비교 */}
            <div className="feedback-comparison">
              <h4>👤🤖 사용자 vs AI 피드백 비교</h4>
              <p className="section-description">
                각 팀 사이클별로 사용자('나')와 AI 에이전트가 제공한 피드백의 특성을 비교 분석합니다.
              </p>

              {/* 피드백 횟수 비교 */}
              <div className="cycle-comparison">
                <h5>📈 피드백 제공 횟수 비교</h5>
                <div className="team-stats-table">
                  <div className="stats-header">
                    <div className="stat-label">구분</div>
                    <div className="stat-value">👤 사용자 피드백</div>
                    <div className="stat-value">🤖 AI 피드백</div>
                    <div className="stat-value">총 피드백</div>
                    <div className="stat-value">사용자 비율</div>
                    <div className="stat-value">AI 비율</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">사이클 1</div>
                    <div className="stat-value">{team1FeedbackData.userFeedbacks.length}회</div>
                    <div className="stat-value">{team1FeedbackData.aiFeedbacks.length}회</div>
                    <div className="stat-value">{team1FeedbackData.totalFeedbackMessages}회</div>
                    <div className="stat-value">{team1FeedbackData.totalFeedbackMessages > 0 ? ((team1FeedbackData.userFeedbacks.length / team1FeedbackData.totalFeedbackMessages) * 100).toFixed(1) : 0}%</div>
                    <div className="stat-value">{team1FeedbackData.totalFeedbackMessages > 0 ? ((team1FeedbackData.aiFeedbacks.length / team1FeedbackData.totalFeedbackMessages) * 100).toFixed(1) : 0}%</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">사이클 2</div>
                    <div className="stat-value">{team2FeedbackData.userFeedbacks.length}회</div>
                    <div className="stat-value">{team2FeedbackData.aiFeedbacks.length}회</div>
                    <div className="stat-value">{team2FeedbackData.totalFeedbackMessages}회</div>
                    <div className="stat-value">{team2FeedbackData.totalFeedbackMessages > 0 ? ((team2FeedbackData.userFeedbacks.length / team2FeedbackData.totalFeedbackMessages) * 100).toFixed(1) : 0}%</div>
                    <div className="stat-value">{team2FeedbackData.totalFeedbackMessages > 0 ? ((team2FeedbackData.aiFeedbacks.length / team2FeedbackData.totalFeedbackMessages) * 100).toFixed(1) : 0}%</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">사이클 3</div>
                    <div className="stat-value">{team3FeedbackData.userFeedbacks.length}회</div>
                    <div className="stat-value">{team3FeedbackData.aiFeedbacks.length}회</div>
                    <div className="stat-value">{team3FeedbackData.totalFeedbackMessages}회</div>
                    <div className="stat-value">{team3FeedbackData.totalFeedbackMessages > 0 ? ((team3FeedbackData.userFeedbacks.length / team3FeedbackData.totalFeedbackMessages) * 100).toFixed(1) : 0}%</div>
                    <div className="stat-value">{team3FeedbackData.totalFeedbackMessages > 0 ? ((team3FeedbackData.aiFeedbacks.length / team3FeedbackData.totalFeedbackMessages) * 100).toFixed(1) : 0}%</div>
                  </div>
                  <div className="stats-row total-row">
                    <div className="stat-label">전체</div>
                    <div className="stat-value">{totalFeedbackData.userFeedbacks.length}회</div>
                    <div className="stat-value">{totalFeedbackData.aiFeedbacks.length}회</div>
                    <div className="stat-value">{totalFeedbackData.totalFeedbackMessages}회</div>
                    <div className="stat-value">{totalFeedbackData.totalFeedbackMessages > 0 ? ((totalFeedbackData.userFeedbacks.length / totalFeedbackData.totalFeedbackMessages) * 100).toFixed(1) : 0}%</div>
                    <div className="stat-value">{totalFeedbackData.totalFeedbackMessages > 0 ? ((totalFeedbackData.aiFeedbacks.length / totalFeedbackData.totalFeedbackMessages) * 100).toFixed(1) : 0}%</div>
                  </div>
                </div>
              </div>

              {/* 피드백 길이 비교 */}
              <div className="cycle-comparison">
                <h5>📝 피드백 길이 비교</h5>
                <div className="team-stats-table">
                  <div className="stats-header">
                    <div className="stat-label">구분</div>
                    <div className="stat-value">👤 사용자 평균</div>
                    <div className="stat-value">👤 SD</div>
                    <div className="stat-value">🤖 AI 평균</div>
                    <div className="stat-value">🤖 SD</div>
                    <div className="stat-value">사용자 피드백</div>
                    <div className="stat-value">AI 피드백</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">사이클 1</div>
                    <div className="stat-value">{userVsAiFeedbackStats.team1.user.avg}음절</div>
                    <div className="stat-value">{userVsAiFeedbackStats.team1.user.stdev}</div>
                    <div className="stat-value">{userVsAiFeedbackStats.team1.ai.avg}음절</div>
                    <div className="stat-value">{userVsAiFeedbackStats.team1.ai.stdev}</div>
                    <div className="stat-value">{team1FeedbackData.userFeedbacks.length}회</div>
                    <div className="stat-value">{team1FeedbackData.aiFeedbacks.length}회</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">사이클 2</div>
                    <div className="stat-value">{userVsAiFeedbackStats.team2.user.avg}음절</div>
                    <div className="stat-value">{userVsAiFeedbackStats.team2.user.stdev}</div>
                    <div className="stat-value">{userVsAiFeedbackStats.team2.ai.avg}음절</div>
                    <div className="stat-value">{userVsAiFeedbackStats.team2.ai.stdev}</div>
                    <div className="stat-value">{team2FeedbackData.userFeedbacks.length}회</div>
                    <div className="stat-value">{team2FeedbackData.aiFeedbacks.length}회</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">사이클 3</div>
                    <div className="stat-value">{userVsAiFeedbackStats.team3.user.avg}음절</div>
                    <div className="stat-value">{userVsAiFeedbackStats.team3.user.stdev}</div>
                    <div className="stat-value">{userVsAiFeedbackStats.team3.ai.avg}음절</div>
                    <div className="stat-value">{userVsAiFeedbackStats.team3.ai.stdev}</div>
                    <div className="stat-value">{team3FeedbackData.userFeedbacks.length}회</div>
                    <div className="stat-value">{team3FeedbackData.aiFeedbacks.length}회</div>
                  </div>
                  <div className="stats-row total-row">
                    <div className="stat-label">전체</div>
                    <div className="stat-value">{userVsAiFeedbackStats.total.user.avg}음절</div>
                    <div className="stat-value">{userVsAiFeedbackStats.total.user.stdev}</div>
                    <div className="stat-value">{userVsAiFeedbackStats.total.ai.avg}음절</div>
                    <div className="stat-value">{userVsAiFeedbackStats.total.ai.stdev}</div>
                    <div className="stat-value">{totalFeedbackData.userFeedbacks.length}회</div>
                    <div className="stat-value">{totalFeedbackData.aiFeedbacks.length}회</div>
                  </div>
                </div>

                {/* 피드백 세션별 턴 분석 */}
                <h4>🔄 피드백 세션별 평균 턴수 분석</h4>
                <div className="team-stats-table">
                  <div className="stats-header">
                    <div className="stat-label">구분</div>
                    <div className="stat-value">사용자 턴</div>
                    <div className="stat-value">🤖 SD</div>
                    <div className="stat-value">AI 턴</div>
                    <div className="stat-value">🤖 SD</div>
                    <div className="stat-value">전체 턴</div>
                    <div className="stat-value">🤖 SD</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">사이클 1</div>
                    <div className="stat-value">{turnAnalysisStats.team1.userTurns.avg.toFixed(2)}</div>
                    <div className="stat-value">{turnAnalysisStats.team1.userTurns.stdev.toFixed(2)}</div>
                    <div className="stat-value">{turnAnalysisStats.team1.aiTurns.avg.toFixed(2)}</div>
                    <div className="stat-value">{turnAnalysisStats.team1.aiTurns.stdev.toFixed(2)}</div>
                    <div className="stat-value">{turnAnalysisStats.team1.totalTurns.avg.toFixed(2)}</div>
                    <div className="stat-value">{turnAnalysisStats.team1.totalTurns.stdev.toFixed(2)}</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">사이클 2</div>
                    <div className="stat-value">{turnAnalysisStats.team2.userTurns.avg.toFixed(2)}</div>
                    <div className="stat-value">{turnAnalysisStats.team2.userTurns.stdev.toFixed(2)}</div>
                    <div className="stat-value">{turnAnalysisStats.team2.aiTurns.avg.toFixed(2)}</div>
                    <div className="stat-value">{turnAnalysisStats.team2.aiTurns.stdev.toFixed(2)}</div>
                    <div className="stat-value">{turnAnalysisStats.team2.totalTurns.avg.toFixed(2)}</div>
                    <div className="stat-value">{turnAnalysisStats.team2.totalTurns.stdev.toFixed(2)}</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">사이클 3</div>
                    <div className="stat-value">{turnAnalysisStats.team3.userTurns.avg.toFixed(2)}</div>
                    <div className="stat-value">{turnAnalysisStats.team3.userTurns.stdev.toFixed(2)}</div>
                    <div className="stat-value">{turnAnalysisStats.team3.aiTurns.avg.toFixed(2)}</div>
                    <div className="stat-value">{turnAnalysisStats.team3.aiTurns.stdev.toFixed(2)}</div>
                    <div className="stat-value">{turnAnalysisStats.team3.totalTurns.avg.toFixed(2)}</div>
                    <div className="stat-value">{turnAnalysisStats.team3.totalTurns.stdev.toFixed(2)}</div>
                  </div>
                  <div className="stats-row total-row">
                    <div className="stat-label">전체</div>
                    <div className="stat-value">{turnAnalysisStats.total.userTurns.avg.toFixed(2)}</div>
                    <div className="stat-value">{turnAnalysisStats.total.userTurns.stdev.toFixed(2)}</div>
                    <div className="stat-value">{turnAnalysisStats.total.aiTurns.avg.toFixed(2)}</div>
                    <div className="stat-value">{turnAnalysisStats.total.aiTurns.stdev.toFixed(2)}</div>
                    <div className="stat-value">{turnAnalysisStats.total.totalTurns.avg.toFixed(2)}</div>
                    <div className="stat-value">{turnAnalysisStats.total.totalTurns.stdev.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 요청 탭 */}
      {activeResultTab === 'request' && (
        <div className="tab-content">
          <div className="analysis-section">
            <h3>📢 요청(Request) 분석</h3>
            <p className="section-description">
              각 팀 사이클에서 수행된 요청(make_request)의 횟수, 길이, 개시자 분석 결과입니다.
            </p>

            {/* 사이클별 요청 횟수 분석 */}
            <div className="request-count-analysis">
              <h4>📊 사이클별 요청 횟수</h4>
              <div className="team-stats-table">
                <div className="stats-header">
                  <div className="stat-label">구분</div>
                  <div className="stat-value">총 요청</div>
                  <div className="stat-value">팀당 평균</div>
                  <div className="stat-value">최소</div>
                  <div className="stat-value">최대</div>
                  <div className="stat-value">표준편차</div>
                </div>
                <div className="stats-row">
                  <div className="stat-label">사이클 1</div>
                  <div className="stat-value">{requestStats.team1.totalRequests}회</div>
                  <div className="stat-value">{requestStats.team1.avgPerTeam}회</div>
                  <div className="stat-value">{requestStats.team1.minPerTeam}회 {team1RequestData.minMaxTeamInfo?.minTeam ? `(${team1RequestData.minMaxTeamInfo.minTeam.label})` : ''}</div>
                  <div className="stat-value">{requestStats.team1.maxPerTeam}회 {team1RequestData.minMaxTeamInfo?.maxTeam ? `(${team1RequestData.minMaxTeamInfo.maxTeam.label})` : ''}</div>
                  <div className="stat-value">{requestStats.team1.stdevPerTeam}</div>
                </div>
                <div className="stats-row">
                  <div className="stat-label">사이클 2</div>
                  <div className="stat-value">{requestStats.team2.totalRequests}회</div>
                  <div className="stat-value">{requestStats.team2.avgPerTeam}회</div>
                  <div className="stat-value">{requestStats.team2.minPerTeam}회 {team2RequestData.minMaxTeamInfo?.minTeam ? `(${team2RequestData.minMaxTeamInfo.minTeam.label})` : ''}</div>
                  <div className="stat-value">{requestStats.team2.maxPerTeam}회 {team2RequestData.minMaxTeamInfo?.maxTeam ? `(${team2RequestData.minMaxTeamInfo.maxTeam.label})` : ''}</div>
                  <div className="stat-value">{requestStats.team2.stdevPerTeam}</div>
                </div>
                <div className="stats-row">
                  <div className="stat-label">사이클 3</div>
                  <div className="stat-value">{requestStats.team3.totalRequests}회</div>
                  <div className="stat-value">{requestStats.team3.avgPerTeam}회</div>
                  <div className="stat-value">{requestStats.team3.minPerTeam}회 {team3RequestData.minMaxTeamInfo?.minTeam ? `(${team3RequestData.minMaxTeamInfo.minTeam.label})` : ''}</div>
                  <div className="stat-value">{requestStats.team3.maxPerTeam}회 {team3RequestData.minMaxTeamInfo?.maxTeam ? `(${team3RequestData.minMaxTeamInfo.maxTeam.label})` : ''}</div>
                  <div className="stat-value">{requestStats.team3.stdevPerTeam}</div>
                </div>
                <div className="stats-row total-row">
                  <div className="stat-label">전체</div>
                  <div className="stat-value">{requestStats.total.totalRequests}회</div>
                  <div className="stat-value">{requestStats.total.avgPerTeam}회</div>
                  <div className="stat-value">{requestStats.total.minPerTeam}회</div>
                  <div className="stat-value">{requestStats.total.maxPerTeam}회</div>
                  <div className="stat-value">{requestStats.total.stdevPerTeam}</div>
                </div>
              </div>
            </div>

            {/* 사용자 vs AI 요청 비교 */}
            <div className="feedback-comparison-analysis">
              <h5>👤🤖 사용자 vs AI 요청 비교 (사이클별)</h5>
              <p className="section-description">
                각 사이클별로 사용자와 AI가 작성한 요청의 평균 길이와 표준편차를 비교 분석합니다.
              </p>

              <div className="cycle-comparison">
                <h6>📊 요청 길이 통계</h6>
                <div className="team-stats-table">
                  <div className="stats-header">
                    <div className="stat-label">구분</div>
                    <div className="stat-value">👤 사용자 평균</div>
                    <div className="stat-value">👤 사용자 SD</div>
                    <div className="stat-value">🤖 AI 평균</div>
                    <div className="stat-value">🤖 AI SD</div>
                    <div className="stat-value">👥 전체 평균</div>
                    <div className="stat-value">👥 전체 SD</div>
                    <div className="stat-value">사용자 요청수</div>
                    <div className="stat-value">AI 요청수</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">사이클 1</div>
                    <div className="stat-value">{userVsAiRequestStats.cycle1.user.avg}음절</div>
                    <div className="stat-value">{userVsAiRequestStats.cycle1.user.stdev}</div>
                    <div className="stat-value">{userVsAiRequestStats.cycle1.ai.avg}음절</div>
                    <div className="stat-value">{userVsAiRequestStats.cycle1.ai.stdev}</div>
                    <div className="stat-value">{userVsAiRequestStats.cycle1.combined.avg}음절</div>
                    <div className="stat-value">{userVsAiRequestStats.cycle1.combined.stdev}</div>
                    <div className="stat-value">{team1RequestData.userRequests.length}회</div>
                    <div className="stat-value">{team1RequestData.aiRequests.length}회</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">사이클 2</div>
                    <div className="stat-value">{userVsAiRequestStats.cycle2.user.avg}음절</div>
                    <div className="stat-value">{userVsAiRequestStats.cycle2.user.stdev}</div>
                    <div className="stat-value">{userVsAiRequestStats.cycle2.ai.avg}음절</div>
                    <div className="stat-value">{userVsAiRequestStats.cycle2.ai.stdev}</div>
                    <div className="stat-value">{userVsAiRequestStats.cycle2.combined.avg}음절</div>
                    <div className="stat-value">{userVsAiRequestStats.cycle2.combined.stdev}</div>
                    <div className="stat-value">{team2RequestData.userRequests.length}회</div>
                    <div className="stat-value">{team2RequestData.aiRequests.length}회</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">사이클 3</div>
                    <div className="stat-value">{userVsAiRequestStats.cycle3.user.avg}음절</div>
                    <div className="stat-value">{userVsAiRequestStats.cycle3.user.stdev}</div>
                    <div className="stat-value">{userVsAiRequestStats.cycle3.ai.avg}음절</div>
                    <div className="stat-value">{userVsAiRequestStats.cycle3.ai.stdev}</div>
                    <div className="stat-value">{userVsAiRequestStats.cycle3.combined.avg}음절</div>
                    <div className="stat-value">{userVsAiRequestStats.cycle3.combined.stdev}</div>
                    <div className="stat-value">{team3RequestData.userRequests.length}회</div>
                    <div className="stat-value">{team3RequestData.aiRequests.length}회</div>
                  </div>
                  <div className="stats-row total-row">
                    <div className="stat-label">전체</div>
                    <div className="stat-value">{userVsAiRequestStats.total.user.avg}음절</div>
                    <div className="stat-value">{userVsAiRequestStats.total.user.stdev}</div>
                    <div className="stat-value">{userVsAiRequestStats.total.ai.avg}음절</div>
                    <div className="stat-value">{userVsAiRequestStats.total.ai.stdev}</div>
                    <div className="stat-value">{userVsAiRequestStats.total.combined.avg}음절</div>
                    <div className="stat-value">{userVsAiRequestStats.total.combined.stdev}</div>
                    <div className="stat-value">{totalRequestData.userRequests.length}회</div>
                    <div className="stat-value">{totalRequestData.aiRequests.length}회</div>
                  </div>
                </div>
              </div>
          
              {/* 요청자별 평균 요청 개시 횟수 */}
              <div className="cycle-comparison">
                <h6>👤🤖 개시자별 평균 요청 개시 횟수</h6>
                <p className="section-description">
                  요청 역할을 맡은 사용자와 AI가 평균적으로 몇 개의 요청을 개시했는지 분석합니다.
                </p>
                <div className="team-stats-table">
                  <div className="stats-header">
                    <div className="stat-label">구분</div>
                    <div className="stat-value">👤 사용자 평균</div>
                    <div className="stat-value">👤 사용자 SD</div>
                    <div className="stat-value">🤖 AI 평균</div>
                    <div className="stat-value">🤖 AI SD</div>
                    <div className="stat-value">사용자 수</div>
                    <div className="stat-value">AI 수</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">사이클 1</div>
                    <div className="stat-value">{team1RequestData.userRequestStats.avg}회</div>
                    <div className="stat-value">{team1RequestData.userRequestStats.stdev}</div>
                    <div className="stat-value">{team1RequestData.aiRequestStats.avg}회</div>
                    <div className="stat-value">{team1RequestData.aiRequestStats.stdev}</div>
                    <div className="stat-value">{team1RequestData.totalUserRequesters}명</div>
                    <div className="stat-value">{team1RequestData.totalAiRequesters}명</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">사이클 2</div>
                    <div className="stat-value">{team2RequestData.userRequestStats.avg}회</div>
                    <div className="stat-value">{team2RequestData.userRequestStats.stdev}</div>
                    <div className="stat-value">{team2RequestData.aiRequestStats.avg}회</div>
                    <div className="stat-value">{team2RequestData.aiRequestStats.stdev}</div>
                    <div className="stat-value">{team2RequestData.totalUserRequesters}명</div>
                    <div className="stat-value">{team2RequestData.totalAiRequesters}명</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">사이클 3</div>
                    <div className="stat-value">{team3RequestData.userRequestStats.avg}회</div>
                    <div className="stat-value">{team3RequestData.userRequestStats.stdev}</div>
                    <div className="stat-value">{team3RequestData.aiRequestStats.avg}회</div>
                    <div className="stat-value">{team3RequestData.aiRequestStats.stdev}</div>
                    <div className="stat-value">{team3RequestData.totalUserRequesters}명</div>
                    <div className="stat-value">{team3RequestData.totalAiRequesters}명</div>
                  </div>
                  <div className="stats-row total-row">
                    <div className="stat-label">전체</div>
                    <div className="stat-value">{totalRequestData.userRequestStats?.avg || 0}회</div>
                    <div className="stat-value">{totalRequestData.userRequestStats?.stdev || 0}</div>
                    <div className="stat-value">{totalRequestData.aiRequestStats?.avg || 0}회</div>
                    <div className="stat-value">{totalRequestData.aiRequestStats?.stdev || 0}</div>
                    <div className="stat-value">{totalRequestData.totalUserRequesters}명</div>
                    <div className="stat-value">{totalRequestData.totalAiRequesters}명</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 요청 유형별 분석 */}
            <div className="cycle-comparison">
              <h6>📋 요청 유형별 분포 분석</h6>
              <p className="section-description">
                요청 내용을 분석하여 유형별(아이디어 생성, 평가, 피드백 요청) 분포를 파악합니다.
              </p>
              <div className="team-stats-table">
                <div className="stats-header">
                  <div className="stat-label">구분</div>
                  <div className="stat-value">💡 아이디어 생성<br/>(👤/🤖)</div>
                  <div className="stat-value">⭐ 평가<br/>(👤/🤖)</div>
                  <div className="stat-value">💬 피드백 요청<br/>(👤/🤖)</div>
                  <div className="stat-value">총 요청수</div>
                </div>
                <div className="stats-row">
                  <div className="stat-label">사이클 1</div>
                  <div className="stat-value">{team1RequestData.typeAnalysis.generate.total}회 ({team1RequestData.typeAnalysis.generatePercent}%)<br/><small>👤{team1RequestData.typeAnalysis.generate.user}회 🤖{team1RequestData.typeAnalysis.generate.ai}회</small></div>
                  <div className="stat-value">{team1RequestData.typeAnalysis.evaluate.total}회 ({team1RequestData.typeAnalysis.evaluatePercent}%)<br/><small>👤{team1RequestData.typeAnalysis.evaluate.user}회 🤖{team1RequestData.typeAnalysis.evaluate.ai}회</small></div>
                  <div className="stat-value">{team1RequestData.typeAnalysis.feedback.total}회 ({team1RequestData.typeAnalysis.feedbackPercent}%)<br/><small>👤{team1RequestData.typeAnalysis.feedback.user}회 🤖{team1RequestData.typeAnalysis.feedback.ai}회</small></div>
                  <div className="stat-value">{team1RequestData.totalRequests}회</div>
                </div>
                <div className="stats-row">
                  <div className="stat-label">사이클 2</div>
                  <div className="stat-value">{team2RequestData.typeAnalysis.generate.total}회 ({team2RequestData.typeAnalysis.generatePercent}%)<br/><small>👤{team2RequestData.typeAnalysis.generate.user}회 🤖{team2RequestData.typeAnalysis.generate.ai}회</small></div>
                  <div className="stat-value">{team2RequestData.typeAnalysis.evaluate.total}회 ({team2RequestData.typeAnalysis.evaluatePercent}%)<br/><small>👤{team2RequestData.typeAnalysis.evaluate.user}회 🤖{team2RequestData.typeAnalysis.evaluate.ai}회</small></div>
                  <div className="stat-value">{team2RequestData.typeAnalysis.feedback.total}회 ({team2RequestData.typeAnalysis.feedbackPercent}%)<br/><small>👤{team2RequestData.typeAnalysis.feedback.user}회 🤖{team2RequestData.typeAnalysis.feedback.ai}회</small></div>
                  <div className="stat-value">{team2RequestData.totalRequests}회</div>
                </div>
                <div className="stats-row">
                  <div className="stat-label">사이클 3</div>
                  <div className="stat-value">{team3RequestData.typeAnalysis.generate.total}회 ({team3RequestData.typeAnalysis.generatePercent}%)<br/><small>👤{team3RequestData.typeAnalysis.generate.user}회 🤖{team3RequestData.typeAnalysis.generate.ai}회</small></div>
                  <div className="stat-value">{team3RequestData.typeAnalysis.evaluate.total}회 ({team3RequestData.typeAnalysis.evaluatePercent}%)<br/><small>👤{team3RequestData.typeAnalysis.evaluate.user}회 🤖{team3RequestData.typeAnalysis.evaluate.ai}회</small></div>
                  <div className="stat-value">{team3RequestData.typeAnalysis.feedback.total}회 ({team3RequestData.typeAnalysis.feedbackPercent}%)<br/><small>👤{team3RequestData.typeAnalysis.feedback.user}회 🤖{team3RequestData.typeAnalysis.feedback.ai}회</small></div>
                  <div className="stat-value">{team3RequestData.totalRequests}회</div>
                </div>
                <div className="stats-row total-row">
                  <div className="stat-label">전체</div>
                  <div className="stat-value">{totalRequestData.typeAnalysis?.generate?.total || 0}회 ({totalRequestData.typeAnalysis?.generatePercent || 0}%)<br/><small>👤{totalRequestData.typeAnalysis?.generate?.user || 0}회 🤖{totalRequestData.typeAnalysis?.generate?.ai || 0}회</small></div>
                  <div className="stat-value">{totalRequestData.typeAnalysis?.evaluate?.total || 0}회 ({totalRequestData.typeAnalysis?.evaluatePercent || 0}%)<br/><small>👤{totalRequestData.typeAnalysis?.evaluate?.user || 0}회 🤖{totalRequestData.typeAnalysis?.evaluate?.ai || 0}회</small></div>
                  <div className="stat-value">{totalRequestData.typeAnalysis?.feedback?.total || 0}회 ({totalRequestData.typeAnalysis?.feedbackPercent || 0}%)<br/><small>👤{totalRequestData.typeAnalysis?.feedback?.user || 0}회 🤖{totalRequestData.typeAnalysis?.feedback?.ai || 0}회</small></div>
                  <div className="stat-value">{totalRequestData.totalRequests}회</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default ResultAnalysis;