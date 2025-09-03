// 팀 데이터 계산을 위한 중앙집권화된 유틸리티 함수들

/**
 * 팀별로 실제 활동 결과 통계를 계산합니다.
 * @param {Array} teams - 팀 데이터 배열
 * @returns {Object} 계산된 통계 데이터
 */
export const calculateTeamActivityStats = (teams) => {
  if (!teams || teams.length === 0) {
    return {
      total: { ideaGeneration: 0, evaluation: 0, feedback: 0, request: 0 },
      team1: { ideaGeneration: 0, evaluation: 0, feedback: 0, request: 0 },
      team2: { ideaGeneration: 0, evaluation: 0, feedback: 0, request: 0 },
      team3: { ideaGeneration: 0, evaluation: 0, feedback: 0, request: 0 }
    };
  }

  const stats = {
    total: { ideaGeneration: 0, evaluation: 0, feedback: 0, request: 0 },
    team1: { ideaGeneration: 0, evaluation: 0, feedback: 0, request: 0 },
    team2: { ideaGeneration: 0, evaluation: 0, feedback: 0, request: 0 },
    team3: { ideaGeneration: 0, evaluation: 0, feedback: 0, request: 0 }
  };

  teams.forEach((team, teamIndex) => {
    // 팀 번호 결정
    let teamKey = 'total';
    const teamName = team.team_info?.teamName || team.team_info?.name || '';
    
    if (teamIndex % 3 === 0) teamKey = 'team1';
    else if (teamIndex % 3 === 1) teamKey = 'team2';
    else if (teamIndex % 3 === 2) teamKey = 'team3';
    
    if (teamName.includes('1')) teamKey = 'team1';
    else if (teamName.includes('2')) teamKey = 'team2';  
    else if (teamName.includes('3')) teamKey = 'team3';

    // 1. 실제 생성된 아이디어 개수
    const ideaCount = team.ideas?.length || 0;
    stats.total.ideaGeneration += ideaCount;
    if (teamKey !== 'total') stats[teamKey].ideaGeneration += ideaCount;

    // 2. 실제 평가 개수 (각 아이디어의 evaluations 개수)
    let evaluationCount = 0;
    if (team.ideas) {
      team.ideas.forEach(ideaString => {
        try {
          let idea;
          if (typeof ideaString === 'string') {
            idea = JSON.parse(ideaString);
          } else {
            idea = ideaString;
          }

          let evaluations = idea.evaluations;
          if (typeof evaluations === 'string') {
            try {
              evaluations = JSON.parse(evaluations);
            } catch (e) {
              evaluations = [];
            }
          }
          if (Array.isArray(evaluations)) {
            evaluationCount += evaluations.length;
          }
        } catch (e) {
          console.warn('Failed to parse idea for evaluation count:', e);
        }
      });
    }
    stats.total.evaluation += evaluationCount;
    if (teamKey !== 'total') stats[teamKey].evaluation += evaluationCount;

    // 3. 실제 피드백 개수 (chat에서 feedback_session_summary 메시지)
    let feedbackCount = 0;
    if (team.chat) {
      team.chat.forEach(chatItem => {
        try {
          let messageData;
          if (typeof chatItem === 'string') {
            messageData = JSON.parse(chatItem);
          } else {
            messageData = chatItem;
          }
          
          if (messageData.type === 'feedback_session_summary') {
            feedbackCount++;
          }
        } catch (e) {
          // JSON 파싱 실패 시 무시
        }
      });
    }
    stats.total.feedback += feedbackCount;
    if (teamKey !== 'total') stats[teamKey].feedback += feedbackCount;

    // 4. 실제 요청 개수 (chat에서 type이 make_request인 메시지)
    let requestCount = 0;
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
            requestCount++;
          }
        } catch (e) {
          // JSON 파싱 실패 시 무시
        }
      });
    }
    stats.total.request += requestCount;
    if (teamKey !== 'total') stats[teamKey].request += requestCount;
  });

  return stats;
};

/**
 * 팀 번호를 결정합니다.
 * @param {Object} team - 팀 객체
 * @param {number} teamIndex - 팀 인덱스
 * @returns {string} 팀 키 ('team1', 'team2', 'team3')
 */
export const getTeamKey = (team, teamIndex) => {
  const teamName = team.team_info?.teamName || team.team_info?.name || '';
  
  let teamKey = 'total';
  if (teamIndex % 3 === 0) teamKey = 'team1';
  else if (teamIndex % 3 === 1) teamKey = 'team2';
  else if (teamIndex % 3 === 2) teamKey = 'team3';
  
  if (teamName.includes('1')) teamKey = 'team1';
  else if (teamName.includes('2')) teamKey = 'team2';  
  else if (teamName.includes('3')) teamKey = 'team3';

  return teamKey;
};

/**
 * 아이디어 문자열에서 평가 개수를 추출합니다.
 * @param {string|Object} ideaString - 아이디어 데이터
 * @returns {number} 평가 개수
 */
export const extractEvaluationCount = (ideaString) => {
  try {
    let idea;
    if (typeof ideaString === 'string') {
      idea = JSON.parse(ideaString);
    } else {
      idea = ideaString;
    }

    let evaluations = idea.evaluations;
    if (typeof evaluations === 'string') {
      try {
        evaluations = JSON.parse(evaluations);
      } catch (e) {
        evaluations = [];
      }
    }
    return Array.isArray(evaluations) ? evaluations.length : 0;
  } catch (e) {
    console.warn('Failed to extract evaluation count:', e);
    return 0;
  }
};

/**
 * 채팅 메시지에서 특정 타입의 메시지 개수를 추출합니다.
 * @param {Array} chat - 채팅 배열
 * @param {string} messageType - 찾을 메시지 타입
 * @returns {number} 메시지 개수
 */
export const extractChatMessageCount = (chat, messageType) => {
  if (!chat || !Array.isArray(chat)) return 0;

  let count = 0;
  chat.forEach(chatItem => {
    try {
      let messageData;
      if (typeof chatItem === 'string') {
        messageData = JSON.parse(chatItem);
      } else {
        messageData = chatItem;
      }
      
      if (messageData.type === messageType) {
        count++;
      }
    } catch (e) {
      // JSON 파싱 실패 시 무시
    }
  });

  return count;
};

/**
 * 멤버들의 역할을 분석해서 역할별 개수를 반환합니다.
 * @param {Object} team - 팀 객체
 * @returns {Object} 역할별 개수
 */
export const extractRoleCounts = (team) => {
  const roleCounts = {
    ideaGeneration: 0,
    evaluation: 0,
    feedback: 0,
    request: 0
  };

  let members = [];
  try {
    members = JSON.parse(team.team_info?.members || '[]');
  } catch (e) {
    console.warn('Failed to parse members for team:', team.team_id);
    return roleCounts;
  }

  members.forEach(member => {
    const roles = member.roles || [];
    
    roles.forEach(role => {
      if (role === '아이디어 생성하기') {
        roleCounts.ideaGeneration++;
      }
      if (role === '아이디어 평가하기') {
        roleCounts.evaluation++;
      }
      if (role === '피드백하기') {
        roleCounts.feedback++;
      }
      if (role === '요청하기') {
        roleCounts.request++;
      }
    });
  });

  return roleCounts;
};

/**
 * 사용자별 활동 통계를 계산합니다 (역할 분담 분석용)
 * @param {Array} teams - 팀 데이터 배열
 * @returns {Object} 사용자별 활동 통계
 */
export const calculateUserActivityStats = (teams) => {
  if (!teams || teams.length === 0) return {};

  const userStats = {
    userFeedbacks: { team1: [], team2: [], team3: [], total: [] },
    userEvaluations: { team1: [], team2: [], team3: [], total: [] },
    userIdeas: { team1: [], team2: [], team3: [], total: [] },
    userRequests: { team1: [], team2: [], team3: [], total: [] }
  };

  teams.forEach((team, teamIndex) => {
    // 팀 키 결정
    const teamKey = getTeamKey(team, teamIndex);
    

    // 사용자가 수행한 아이디어 생성 수 (user_id 또는 creator가 "나"인 아이디어)
    let userIdeaCount = 0;
    if (team.ideas) {
      team.ideas.forEach(ideaString => {
        try {
          let idea;
          if (typeof ideaString === 'string') {
            idea = JSON.parse(ideaString);
          } else {
            idea = ideaString;
          }
          
          if (idea.author === '나' || idea.user_id === '나' || idea.creator === '나') {
            userIdeaCount++;
          }
        } catch (e) {
          console.warn('Failed to parse idea for user count:', e);
        }
      });
    }

    // 사용자가 수행한 평가 수 (evaluator가 "나"인 평가)
    let userEvaluationCount = 0;
    if (team.ideas) {
      team.ideas.forEach(ideaString => {
        try {
          let idea;
          if (typeof ideaString === 'string') {
            idea = JSON.parse(ideaString);
          } else {
            idea = ideaString;
          }

          let evaluations = idea.evaluations;
          if (typeof evaluations === 'string') {
            try {
              evaluations = JSON.parse(evaluations);
            } catch (e) {
              evaluations = [];
            }
          }
          
          if (evaluations && Array.isArray(evaluations)) {
            for (const evaluation of evaluations) {
              if (evaluation.evaluator === '나') {
                userEvaluationCount++;
              }
            }
          }
        } catch (e) {
          console.warn('Failed to parse idea for user evaluation count:', e);
        }
      });
    }

    // 사용자가 수행한 피드백 수 (sender가 "나"이고 피드백 관련 메시지)
    let userFeedbackCount = 0;
    if (team.chat) {
      team.chat.forEach(chatItem => {
        try {
          let messageData;
          if (typeof chatItem === 'string') {
            messageData = JSON.parse(chatItem);
          } else {
            messageData = chatItem;
          }
          
          // 메인 채팅에서 사용자 메시지 확인
          if (messageData.sender === '나' && messageData.type === 'message') {
            userFeedbackCount++;
          }
          
          // 피드백 세션 서머리 안의 메시지들도 확인
          if (messageData.type === 'feedback_session_summary' && 
              messageData.payload?.sessionMessages) {
            messageData.payload.sessionMessages.forEach(sessionMessage => {
              if (sessionMessage.sender === '나' && sessionMessage.type === 'message') {
                userFeedbackCount++;
              }
            });
          }
        } catch (e) {
          // 파싱 오류 무시
        }
      });
    }

    // 사용자가 수행한 요청 수 (sender가 "나"이고 요청 관련 메시지)
    let userRequestCount = 0;
    if (team.chat) {
      team.chat.forEach(chatItem => {
        try {
          let messageData;
          if (typeof chatItem === 'string') {
            messageData = JSON.parse(chatItem);
          } else {
            messageData = chatItem;
          }
          
          // 사용자가 보낸 요청 관련 메시지 카운트
          if (messageData.sender === '나' && 
              (messageData.type === 'make_request' || 
               messageData.type === 'request' ||
               (messageData.payload?.content && messageData.payload.content.includes('요청')))) {
            userRequestCount++;
          }
        } catch (e) {
          // 파싱 오류 무시
        }
      });
    }

    // 전체 통계에 추가
    userStats.userIdeas.total.push(userIdeaCount);
    userStats.userEvaluations.total.push(userEvaluationCount);
    userStats.userFeedbacks.total.push(userFeedbackCount);
    userStats.userRequests.total.push(userRequestCount);


    // 팀별 통계에 추가
    if (teamKey !== 'total' && userStats.userIdeas[teamKey]) {
      userStats.userIdeas[teamKey].push(userIdeaCount);
      userStats.userEvaluations[teamKey].push(userEvaluationCount);
      userStats.userFeedbacks[teamKey].push(userFeedbackCount);
      userStats.userRequests[teamKey].push(userRequestCount);
    }
  });

  return userStats;
};

/**
 * 모든 사용자를 카운팅합니다 (통일된 로직).
 * @param {Array} teams - 팀 데이터 배열
 * @returns {Object} 사용자 카운팅 정보
 */
export const countAllUsers = (teams) => {
  if (!teams || teams.length === 0) {
    return { totalUsers: 0, usersWithProfile: 0, usersWithoutProfile: 0 };
  }

  let totalUsers = 0;
  let usersWithProfile = 0;
  let usersWithoutProfile = 0;

  teams.forEach(team => {
    try {
      const members = JSON.parse(team.team_info?.members || '[]');
      
      members.forEach(member => {
        if (member.isUser === true) {
          totalUsers++;
          
          if (member.userProfile) {
            usersWithProfile++;
          } else {
            usersWithoutProfile++;
          }
        }
      });
    } catch (e) {
      console.warn('Failed to parse members for user counting:', e);
    }
  });

  return {
    totalUsers,
    usersWithProfile,
    usersWithoutProfile
  };
};

/**
 * 사용자 프로필 완성도를 계산합니다.
 * @param {Array} teams - 팀 데이터 배열
 * @returns {Object} 사용자 프로필 완성도 통계
 */
export const calculateUserProfileCompleteness = (teams) => {
  if (!teams || teams.length === 0) {
    return { completedUsers: 0, totalUsers: 0, percentage: 0, fields: {} };
  }

  // 통일된 사용자 카운팅 사용
  const userCounts = countAllUsers(teams);
  const totalUsers = userCounts.totalUsers;
  
  let completedUsers = 0;

  const requiredFields = [
    'name', 'age', 'gender', 'nationality', 'major', 'education', 
    'professional', 'skills', 'personality', 'workStyle', 'preferences', 'dislikes'
  ];

  // 필드별 카운트 초기화
  const fieldCounts = {};
  requiredFields.forEach(field => {
    fieldCounts[field] = 0;
  });

  teams.forEach(team => {
    try {
      const members = JSON.parse(team.team_info?.members || '[]');
      
      members.forEach(member => {
        if (member.isUser === true) {
          // 프로필이 있는 사용자만 필드 분석
          if (member.userProfile) {
            // 각 필드별로 입력 여부 확인
            let completedFieldCount = 0;
            requiredFields.forEach(field => {
              const value = member.userProfile[field];
              const isFieldComplete = value !== undefined && value !== null && 
                                      (typeof value === 'string' ? value.trim() !== '' : true);
              if (isFieldComplete) {
                fieldCounts[field]++;
                completedFieldCount++;
              }
            });
            
            // 모든 필드가 완성되었는지 확인
            if (completedFieldCount === requiredFields.length) {
              completedUsers++;
            }
          }
          // 프로필이 없는 사용자는 필드 카운트에만 기여하지 않음 (0개 필드 완성으로 간주)
        }
      });
    } catch (e) {
      console.warn('Failed to parse members for user profile analysis:', e);
    }
  });

  const percentage = totalUsers > 0 ? Math.round((completedUsers / totalUsers) * 100) : 0;

  return {
    completedUsers,
    totalUsers,
    percentage,
    fields: fieldCounts
  };
};

/**
 * 통계 데이터의 요약 정보를 생성합니다.
 * @param {Object} stats - 통계 데이터
 * @returns {Object} 요약 정보
 */
export const generateStatsSummary = (stats) => {
  const totalActivities = stats.total.ideaGeneration + stats.total.evaluation + 
                          stats.total.feedback + stats.total.request;
  
  const mostActiveActivity = Object.entries(stats.total)
    .reduce((max, [key, value]) => value > max.value ? { key, value } : max, 
            { key: 'ideaGeneration', value: 0 });

  const activityNames = {
    ideaGeneration: '아이디어 생성',
    evaluation: '평가',
    feedback: '피드백',
    request: '요청'
  };

  return {
    totalActivities,
    mostActiveActivity: {
      name: activityNames[mostActiveActivity.key],
      count: mostActiveActivity.value
    },
    averagePerTeam: Math.round(totalActivities / 3),
    teamComparison: {
      team1: stats.team1.ideaGeneration + stats.team1.evaluation + stats.team1.feedback + stats.team1.request,
      team2: stats.team2.ideaGeneration + stats.team2.evaluation + stats.team2.feedback + stats.team2.request,
      team3: stats.team3.ideaGeneration + stats.team3.evaluation + stats.team3.feedback + stats.team3.request
    }
  };
};