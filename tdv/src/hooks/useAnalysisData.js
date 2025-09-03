import { useMemo } from 'react';
import { calculateTeamActivityStats, calculateUserActivityStats, calculateUserProfileCompleteness, countAllUsers } from '../utils/teamDataCalculator';

export const useAnalysisData = (teams) => {
  const analysisData = useMemo(() => {
    if (!teams || teams.length === 0) return null;

    // 참가자별로 팀을 그룹화
    const participantTeams = {};
    teams.forEach(team => {
      const participantName = team.owner_info?.name;
      if (participantName) {
        if (!participantTeams[participantName]) {
          participantTeams[participantName] = [];
        }
        participantTeams[participantName].push(team);
      }
    });

    // 각 참가자의 팀을 생성 시간순으로 정렬
    Object.keys(participantTeams).forEach(participant => {
      participantTeams[participant].sort((a, b) => 
        new Date(a.team_info?.createdAt || 0) - new Date(b.team_info?.createdAt || 0)
      );
    });

    // 팀별 데이터 수집 (첫번째, 두번째, 세번째, 전체)
    const teamSizeStats = { team1: [], team2: [], team3: [], total: [] };
    const ideaStats = { team1: [], team2: [], team3: [], total: [] };
    const newIdeaStats = { team1: [], team2: [], team3: [], total: [] };
    const updatedIdeaStats = { team1: [], team2: [], team3: [], total: [] };
    const ideaPerAgentStats = { team1: [], team2: [], team3: [], total: [] };
    // 중앙집권화된 함수를 사용해서 사용자 활동 통계 계산
    const centralizedUserStats = calculateUserActivityStats(teams);
    const userIdeaStats = centralizedUserStats.userIdeas || { team1: [], team2: [], team3: [], total: [] };
    const userEvaluationStats = centralizedUserStats.userEvaluations || { team1: [], team2: [], team3: [], total: [] };
    const userFeedbackStats = centralizedUserStats.userFeedbacks || { team1: [], team2: [], team3: [], total: [] };
    const userRequestStats = centralizedUserStats.userRequests || { team1: [], team2: [], team3: [], total: [] };
    
    // 역할을 맡은 사용자들만의 수행량 통계 (0이 아닌 값들만)
    const userPerAgentIdeaStats = { team1: [], team2: [], team3: [], total: [] };
    const userPerAgentEvaluationStats = { team1: [], team2: [], team3: [], total: [] };
    const userPerAgentFeedbackStats = { team1: [], team2: [], team3: [], total: [] };
    const userPerAgentRequestStats = { team1: [], team2: [], team3: [], total: [] };
    // 실제 수행량 통계 배열 추가
    const evaluationPerformanceStats = { team1: [], team2: [], team3: [], total: [] };
    const feedbackPerformanceStats = { team1: [], team2: [], team3: [], total: [] };
    const requestPerformanceStats = { team1: [], team2: [], team3: [], total: [] };
    const chatStats = { team1: [], team2: [], team3: [], total: [] };
    const sharedMentalModelStats = { team1: [], team2: [], team3: [], total: [] };
    const sharedMentalModelDetails = { team1: [], team2: [], team3: [], total: [] };

    // 공유 멘탈 모델 길이 계산 함수 (syllable 기준)
    const countSyllables = (text) => {
      if (!text || typeof text !== 'string') return 0;
      
      // 한글 음절 패턴: 초성(19) + 중성(21) + 종성(28, 선택적)
      const koreanSyllablePattern = /[가-힣]/g;
      const englishSyllablePattern = /[aeiouyAEIOUY]+/g;
      
      // 한글 음절 개수
      const koreanSyllables = (text.match(koreanSyllablePattern) || []).length;
      
      // 영어 음절 개수 (모음 그룹 기준 근사치)
      const englishWords = text.replace(koreanSyllablePattern, '').split(/\s+/).filter(word => word.length > 0);
      let englishSyllables = 0;
      englishWords.forEach(word => {
        const syllableMatches = word.match(englishSyllablePattern);
        englishSyllables += syllableMatches ? syllableMatches.length : (word.length > 0 ? 1 : 0);
      });
      
      return koreanSyllables + englishSyllables;
    };

    // Levenshtein Distance 계산 함수
    const levenshteinDistance = (str1, str2) => {
      const matrix = [];
      
      for (let i = 0; i <= str2.length; i++) {
        matrix[i] = [i];
      }
      
      for (let j = 0; j <= str1.length; j++) {
        matrix[0][j] = j;
      }
      
      for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
          if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1
            );
          }
        }
      }
      
      return matrix[str2.length][str1.length];
    };

    // 문자열 유사도 계산 함수 (미세한 변경 감지용)
    const calculateSimilarity = (str1, str2) => {
      if (!str1 || !str2) return str1 === str2 ? 1 : 0;
      if (str1 === str2) return 1;
      
      // 간단한 Levenshtein distance 기반 유사도
      const maxLength = Math.max(str1.length, str2.length);
      const distance = levenshteinDistance(str1, str2);
      return (maxLength - distance) / maxLength;
    };

    // 참가자별 멘탈 모델 변화 분석 함수
    const analyzeParticipantMentalModelChanges = () => {
      const participantChanges = {};
      
      Object.keys(participantTeams).forEach(participantName => {
        const teams = participantTeams[participantName];
        if (teams.length < 2) return; // 2개 이상 팀이 있어야 비교 가능
        
        const mentalModels = teams.map((team, index) => ({
          teamNumber: index + 1,
          model: team.team_info?.sharedMentalModel || '',
          length: countSyllables(team.team_info?.sharedMentalModel || '')
        }));
        
        const changes = [];
        for (let i = 1; i < mentalModels.length; i++) {
          const prev = mentalModels[i - 1];
          const curr = mentalModels[i];
          const similarity = calculateSimilarity(prev.model, curr.model);
          
          changes.push({
            fromTeam: prev.teamNumber,
            toTeam: curr.teamNumber,
            similarity: similarity,
            isIdentical: similarity === 1,
            isSignificant: similarity < 0.7,
            lengthChange: curr.length - prev.length,
            prevLength: prev.length,
            currLength: curr.length,
            prevModel: prev.model,
            currModel: curr.model
          });
        }
        
        participantChanges[participantName] = {
          totalTeams: teams.length,
          mentalModels: mentalModels,
          changes: changes,
          hasAnyChanges: changes.some(change => !change.isIdentical),
          significantChanges: changes.filter(change => change.isSignificant).length
        };
      });
      
      return participantChanges;
    };
    
    // 피드백/요청 역할 상세 분석 통계
    const feedbackRoleAnalysis = {
      hasRoleCount: 0,  // 피드백 역할을 가진 사용자 수
      hasRoleAndDid: 0,  // 역할도 있고 실제로 피드백한 사용자 수
      hasRoleButDidnt: 0,  // 역할은 있지만 피드백하지 않은 사용자 수
      noRoleButDid: 0  // 역할은 없지만 피드백한 사용자 수
    };
    
    const requestRoleAnalysis = {
      hasRoleCount: 0,  // 요청 역할을 가진 사용자 수
      hasRoleAndDid: 0,  // 역할도 있고 실제로 요청한 사용자 수
      hasRoleButDidnt: 0,  // 역할은 있지만 요청하지 않은 사용자 수
      noRoleButDid: 0  // 역할은 없지만 요청한 사용자 수
    };

    const roleDistribution = { 
      team1: { 
        total: { generation: 0, evaluation: 0, feedback: 0, request: 0, total: 0 },
        agents: { generation: 0, evaluation: 0, feedback: 0, request: 0, total: 0 },
        users: { generation: 0, evaluation: 0, feedback: 0, request: 0, total: 0 }
      },
      team2: { 
        total: { generation: 0, evaluation: 0, feedback: 0, request: 0, total: 0 },
        agents: { generation: 0, evaluation: 0, feedback: 0, request: 0, total: 0 },
        users: { generation: 0, evaluation: 0, feedback: 0, request: 0, total: 0 }
      },
      team3: { 
        total: { generation: 0, evaluation: 0, feedback: 0, request: 0, total: 0 },
        agents: { generation: 0, evaluation: 0, feedback: 0, request: 0, total: 0 },
        users: { generation: 0, evaluation: 0, feedback: 0, request: 0, total: 0 }
      },
      total: { 
        total: { generation: 0, evaluation: 0, feedback: 0, request: 0, total: 0 },
        agents: { generation: 0, evaluation: 0, feedback: 0, request: 0, total: 0 },
        users: { generation: 0, evaluation: 0, feedback: 0, request: 0, total: 0 }
      }
    };
    
    const roleAnalysis = { 
      team1: { generation: [], evaluation: [], feedback: [], request: [] },
      team2: { generation: [], evaluation: [], feedback: [], request: [] },
      team3: { generation: [], evaluation: [], feedback: [], request: [] },
      total: { generation: [], evaluation: [], feedback: [], request: [] }
    };

    // 각 참가자의 팀별로 데이터 수집
    Object.values(participantTeams).forEach(teams => {
      teams.forEach((team, index) => {
        const teamKey = index === 0 ? 'team1' : index === 1 ? 'team2' : index === 2 ? 'team3' : null;
        
        // 팀 크기 (사용자 + 에이전트)
        const teamSize = 1 + (team.agents?.length || 0);
        
        // 아이디어 생성 역할을 가진 AI 에이전트 수 계산
        let ideaGeneratorAgentCount = 0;
        team.agents?.forEach(agent => {
          const roles = agent.roles || [];
          if (roles.includes('아이디어 생성하기')) {
            ideaGeneratorAgentCount++;
          }
        });
        
        // 아이디어 수 및 새 생성 vs 업데이트 분석
        const ideaCount = team.ideas?.length || 0;
        const ideaPerAgent = ideaGeneratorAgentCount > 0 ? ideaCount / ideaGeneratorAgentCount : 0;
        
        // 아이디어 ID별 첫 등장 시간 추적하여 새 생성 vs 업데이트 구분
        const ideaIdFirstSeen = new Map();
        let newIdeaCount = 0;
        let updatedIdeaCount = 0;
        
        const ideas = team.ideas || [];
        // 시간순으로 정렬
        const sortedIdeas = [];
        for (const ideaData of ideas) {
          try {
            let idea;
            if (typeof ideaData === 'string') {
              idea = JSON.parse(ideaData);
            } else {
              idea = ideaData;
            }
            sortedIdeas.push(idea);
          } catch (e) {
            // 파싱 오류 시 무시
          }
        }
        
        sortedIdeas.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
        
        for (const idea of sortedIdeas) {
          const ideaId = idea.id;
          if (!ideaIdFirstSeen.has(ideaId)) {
            ideaIdFirstSeen.set(ideaId, true);
            newIdeaCount++;
          } else {
            updatedIdeaCount++;
          }
        }
        
        // 팀 멤버 정보 파싱 (사용자 역할 확인용)
        const members = JSON.parse(team.team_info?.members || '[]');
        const userMember = members.find(member => member.isUser === true);
        const userRoles = userMember?.roles || [];
        
        // 사용자가 각 역할을 맡았는지 확인
        const hasIdeaGenerationRole = userRoles.includes('아이디어 생성하기');
        const hasEvaluationRole = userRoles.includes('아이디어 평가하기');
        const hasFeedbackRole = userRoles.includes('피드백하기');
        const hasRequestRole = userRoles.includes('요청하기');
        
        // 중앙집권화된 함수에서 이미 계산된 사용자 활동 데이터 가져오기
        const userIdeaCount = userIdeaStats.total[index] || 0;
        const userEvaluationCount = userEvaluationStats.total[index] || 0;
        const userFeedbackCount = userFeedbackStats.total[index] || 0;
        const userRequestCount = userRequestStats.total[index] || 0;
        
        // 채팅 수
        const chatCount = team.chat?.length || 0;
        
        // 공유 멘탈 모델 길이 (syllable)
        const sharedMentalModelLength = countSyllables(team.team_info?.sharedMentalModel || '');

        // 전체 통계에 추가
        teamSizeStats.total.push(teamSize);
        ideaStats.total.push(ideaCount);
        newIdeaStats.total.push(newIdeaCount);
        updatedIdeaStats.total.push(updatedIdeaCount);
        ideaPerAgentStats.total.push(ideaPerAgent);
        // 사용자 활동 통계는 이미 중앙집권화된 함수에서 계산됨
        
        // 역할을 맡은 사용자만의 통계 (0이 아닌 값들만)
        if (hasIdeaGenerationRole && userIdeaCount > 0) {
          userPerAgentIdeaStats.total.push(userIdeaCount);
        }
        if (hasEvaluationRole && userEvaluationCount > 0) {
          userPerAgentEvaluationStats.total.push(userEvaluationCount);
        }
        if (hasFeedbackRole && userFeedbackCount > 0) {
          userPerAgentFeedbackStats.total.push(userFeedbackCount);
        }
        if (hasRequestRole && userRequestCount > 0) {
          userPerAgentRequestStats.total.push(userRequestCount);
        }
        
        // 피드백 역할 상세 분석
        if (hasFeedbackRole) {
          feedbackRoleAnalysis.hasRoleCount++;
          if (userFeedbackCount > 0) {
            feedbackRoleAnalysis.hasRoleAndDid++;
          } else {
            feedbackRoleAnalysis.hasRoleButDidnt++;
          }
        } else if (userFeedbackCount > 0) {
          feedbackRoleAnalysis.noRoleButDid++;
        }
        
        // 요청 역할 상세 분석
        if (hasRequestRole) {
          requestRoleAnalysis.hasRoleCount++;
          if (userRequestCount > 0) {
            requestRoleAnalysis.hasRoleAndDid++;
          } else {
            requestRoleAnalysis.hasRoleButDidnt++;
          }
        } else if (userRequestCount > 0) {
          requestRoleAnalysis.noRoleButDid++;
        }
        
        chatStats.total.push(chatCount);
        sharedMentalModelStats.total.push(sharedMentalModelLength);
        sharedMentalModelDetails.total.push({
          length: sharedMentalModelLength,
          participant: team.owner_info?.name,
          teamNumber: index + 1,
          participantId: `P${Object.keys(participantTeams).indexOf(team.owner_info?.name) + 1}`,
          teamId: `P${Object.keys(participantTeams).indexOf(team.owner_info?.name) + 1}T${index + 1}`
        });

        // 팀별 통계에 추가 (첫 3개 팀만)
        if (teamKey) {
          teamSizeStats[teamKey].push(teamSize);
          ideaStats[teamKey].push(ideaCount);
          newIdeaStats[teamKey].push(newIdeaCount);
          updatedIdeaStats[teamKey].push(updatedIdeaCount);
          ideaPerAgentStats[teamKey].push(ideaPerAgent);
          // 사용자 활동 통계는 이미 중앙집권화된 함수에서 계산됨
          chatStats[teamKey].push(chatCount);
          sharedMentalModelStats[teamKey].push(sharedMentalModelLength);
          sharedMentalModelDetails[teamKey].push({
            length: sharedMentalModelLength,
            participant: team.owner_info?.name,
            teamNumber: index + 1,
            participantId: `P${Object.keys(participantTeams).indexOf(team.owner_info?.name) + 1}`,
            teamId: `P${Object.keys(participantTeams).indexOf(team.owner_info?.name) + 1}T${index + 1}`
          });
          
          // 역할을 맡은 사용자만의 통계 (팀별)
          if (hasIdeaGenerationRole && userIdeaCount > 0) {
            userPerAgentIdeaStats[teamKey].push(userIdeaCount);
          }
          if (hasEvaluationRole && userEvaluationCount > 0) {
            userPerAgentEvaluationStats[teamKey].push(userEvaluationCount);
          }
          if (hasFeedbackRole && userFeedbackCount > 0) {
            userPerAgentFeedbackStats[teamKey].push(userFeedbackCount);
          }
          if (hasRequestRole && userRequestCount > 0) {
            userPerAgentRequestStats[teamKey].push(userRequestCount);
          }
        }

        // 에이전트 역할 분석 (팀별로 각 역할 개수 수집)
        const teamRoles = { generation: 0, evaluation: 0, feedback: 0, request: 0 };
        
        // 실제 수행량 계산을 위한 변수들 추가
        const actualPerformances = {
          evaluation: { total: 0, byAgent: {} },
          feedback: { total: 0, byAgent: {} },
          request: { total: 0, byAgent: {} }
        };
        
        // chat 데이터에서 실제 평가/피드백/요청 횟수 계산
        if (team.chat && Array.isArray(team.chat)) {
          team.chat.forEach(chatMessage => {
            try {
              let messageData;
              if (typeof chatMessage === 'string') {
                messageData = JSON.parse(chatMessage);
              } else {
                messageData = chatMessage;
              }
              
              const sender = messageData.sender;
              const messageType = messageData.type;
              const content = messageData.payload?.content || '';
              
              // 평가 행동 카운트 - system 타입이고 "평가했습니다" 포함
              if (messageType === 'system' && content.includes('평가했습니다')) {
                actualPerformances.evaluation.total++;
                if (!actualPerformances.evaluation.byAgent[sender]) {
                  actualPerformances.evaluation.byAgent[sender] = 0;
                }
                actualPerformances.evaluation.byAgent[sender]++;
              }
              
              // 피드백 행동 카운트 - feedback_session_summary 타입
              if (messageType === 'feedback_session_summary') {
                actualPerformances.feedback.total++;
                if (!actualPerformances.feedback.byAgent[sender]) {
                  actualPerformances.feedback.byAgent[sender] = 0;
                }
                actualPerformances.feedback.byAgent[sender]++;
              }
              
              // 요청 행동 카운트 - make_request 타입
              if (messageType === 'make_request') {
                actualPerformances.request.total++;
                if (!actualPerformances.request.byAgent[sender]) {
                  actualPerformances.request.byAgent[sender] = 0;
                }
                actualPerformances.request.byAgent[sender]++;
              }
            } catch (e) {
              // 파싱 오류 시 무시
            }
          });
        }
        
        team.agents?.forEach(agent => {
          const roles = agent.roles || [];
          if (roles.includes('아이디어 생성하기')) teamRoles.generation++;
          if (roles.includes('아이디어 평가하기')) teamRoles.evaluation++;
          if (roles.includes('피드백하기')) teamRoles.feedback++;
          if (roles.includes('요청하기')) teamRoles.request++;
        });

        // 전체 통계에 추가
        roleAnalysis.total.generation.push(teamRoles.generation);
        roleAnalysis.total.evaluation.push(teamRoles.evaluation);
        roleAnalysis.total.feedback.push(teamRoles.feedback);
        roleAnalysis.total.request.push(teamRoles.request);
        
        // 실제 수행량 통계 추가 - 에이전트별 평균 계산
        const evaluationAgents = team.agents?.filter(agent => 
          (agent.roles || []).includes('아이디어 평가하기')
        ) || [];
        const feedbackAgents = team.agents?.filter(agent => 
          (agent.roles || []).includes('피드백하기')
        ) || [];
        const requestAgents = team.agents?.filter(agent => 
          (agent.roles || []).includes('요청하기')
        ) || [];
        
        // 각 에이전트가 수행한 평균 횟수 계산
        if (evaluationAgents.length > 0) {
          const avgEvaluationPerAgent = actualPerformances.evaluation.total / evaluationAgents.length;
          evaluationPerformanceStats.total.push(avgEvaluationPerAgent);
          if (teamKey) {
            evaluationPerformanceStats[teamKey].push(avgEvaluationPerAgent);
          }
        }
        
        if (feedbackAgents.length > 0) {
          const avgFeedbackPerAgent = actualPerformances.feedback.total / feedbackAgents.length;
          feedbackPerformanceStats.total.push(avgFeedbackPerAgent);
          if (teamKey) {
            feedbackPerformanceStats[teamKey].push(avgFeedbackPerAgent);
          }
        }
        
        if (requestAgents.length > 0) {
          const avgRequestPerAgent = actualPerformances.request.total / requestAgents.length;
          requestPerformanceStats.total.push(avgRequestPerAgent);
          if (teamKey) {
            requestPerformanceStats[teamKey].push(avgRequestPerAgent);
          }
        }

        // 팀별 통계에 추가 (첫 3개 팀만)
        if (teamKey) {
          roleAnalysis[teamKey].generation.push(teamRoles.generation);
          roleAnalysis[teamKey].evaluation.push(teamRoles.evaluation);
          roleAnalysis[teamKey].feedback.push(teamRoles.feedback);
          roleAnalysis[teamKey].request.push(teamRoles.request);
        }
      });
    });

    // 통계 계산 함수
    const calculateStats = (arr) => {
      if (arr.length === 0) return { avg: 0, min: 0, max: 0, stdev: 0 };
      const sorted = [...arr].sort((a, b) => a - b);
      const avg = arr.reduce((sum, val) => sum + val, 0) / arr.length;
      const variance = arr.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / arr.length;
      const stdev = Math.sqrt(variance);
      
      return {
        avg: avg.toFixed(2),
        min: sorted[0].toFixed(2),
        max: sorted[sorted.length - 1].toFixed(2),
        stdev: stdev.toFixed(2)
      };
    };

    // 각 카테고리별로 팀별 통계 계산
    const calculateStatsForAllTeams = (statsObj) => ({
      team1: calculateStats(statsObj.team1),
      team2: calculateStats(statsObj.team2),
      team3: calculateStats(statsObj.team3),
      total: calculateStats(statsObj.total)
    });

    // 역할 분석 통계 계산
    const calculateRoleStatsForAllTeams = (roleObj) => ({
      team1: {
        generation: calculateStats(roleObj.team1.generation),
        evaluation: calculateStats(roleObj.team1.evaluation),
        feedback: calculateStats(roleObj.team1.feedback),
        request: calculateStats(roleObj.team1.request)
      },
      team2: {
        generation: calculateStats(roleObj.team2.generation),
        evaluation: calculateStats(roleObj.team2.evaluation),
        feedback: calculateStats(roleObj.team2.feedback),
        request: calculateStats(roleObj.team2.request)
      },
      team3: {
        generation: calculateStats(roleObj.team3.generation),
        evaluation: calculateStats(roleObj.team3.evaluation),
        feedback: calculateStats(roleObj.team3.feedback),
        request: calculateStats(roleObj.team3.request)
      },
      total: {
        generation: calculateStats(roleObj.total.generation),
        evaluation: calculateStats(roleObj.total.evaluation),
        feedback: calculateStats(roleObj.total.feedback),
        request: calculateStats(roleObj.total.request)
      }
    });

    return {
      // 메타데이터
      participantTeams,
      totalTeams: teams.length,
      totalParticipants: Object.keys(participantTeams).length,
      
      // 팀 크기 및 구조 관련
      teamSizes: calculateStatsForAllTeams(teamSizeStats),
      ideas: calculateStatsForAllTeams(ideaStats),
      newIdeas: calculateStatsForAllTeams(newIdeaStats),
      updatedIdeas: calculateStatsForAllTeams(updatedIdeaStats),
      ideaPerAgent: calculateStatsForAllTeams(ideaPerAgentStats),
      chats: calculateStatsForAllTeams(chatStats),
      
      // 역할 분담 관련
      roles: calculateRoleStatsForAllTeams(roleAnalysis),
      userIdeas: calculateStatsForAllTeams(centralizedUserStats.userIdeas || { team1: [], team2: [], team3: [], total: [] }),
      userEvaluations: calculateStatsForAllTeams(centralizedUserStats.userEvaluations || { team1: [], team2: [], team3: [], total: [] }),  
      userFeedbacks: calculateStatsForAllTeams(centralizedUserStats.userFeedbacks || { team1: [], team2: [], team3: [], total: [] }),
      userRequests: calculateStatsForAllTeams(centralizedUserStats.userRequests || { team1: [], team2: [], team3: [], total: [] }),
      
      // 실제 수행량이 있는 사용자들만의 통계
      userPerAgentIdeas: calculateStatsForAllTeams(userPerAgentIdeaStats),
      userPerAgentEvaluations: calculateStatsForAllTeams(userPerAgentEvaluationStats),
      userPerAgentFeedbacks: calculateStatsForAllTeams(userPerAgentFeedbackStats),
      userPerAgentRequests: calculateStatsForAllTeams(userPerAgentRequestStats),
      
      // 실제 수행량 통계
      evaluationPerAgent: calculateStatsForAllTeams(evaluationPerformanceStats),
      feedbackPerAgent: calculateStatsForAllTeams(feedbackPerformanceStats),
      requestPerAgent: calculateStatsForAllTeams(requestPerformanceStats),
      
      // 역할 분포 상세 분석
      roleDistribution,
      
      // 역할 분석
      feedbackRoleAnalysis,
      requestRoleAnalysis,
      
      // 공유 멘탈 모델
      sharedMentalModel: calculateStatsForAllTeams(sharedMentalModelStats),
      mentalModelDetails: sharedMentalModelDetails,
      
      // 참가자별 멘탈 모델 변화 분석
      participantMentalModelChanges: analyzeParticipantMentalModelChanges(),
      
      // 개인 성격 및 배경 분석을 위한 데이터
      personalityData: (() => {
        // 통일된 사용자 카운팅 사용
        const userCounts = countAllUsers(teams);
        
        const personalityStats = {
          totalAgents: 0,
          totalUsers: userCounts.totalUsers,
          profileCompleteness: { completed: 0, total: 0 },
          fieldStats: {
            name: 0, age: 0, gender: 0, personality: 0,
            education: 0, skills: 0, professional: 0,
            preferences: 0, dislikes: 0, workStyle: 0
          },
          ageData: [],
          genderStats: { male: 0, female: 0 },
          personalityTypes: {},
          educationLevels: {},
          majorFields: {},
          professions: {},
          skills: {}
        };
        
        // 모든 팀의 에이전트 데이터 수집
        Object.values(participantTeams).forEach(teams => {
          teams.forEach(team => {
            // 에이전트 분석
            const agents = team.agents || [];
            agents.forEach(agent => {
              personalityStats.totalAgents++;
              personalityStats.profileCompleteness.total++;
              
              // 에이전트 정보는 agent.agent_info 내부에 있음
              const agentInfo = agent.agent_info || {};
              
              const profileFields = ['name', 'age', 'gender', 'personality', 'education', 'skills', 'professional', 'preferences', 'dislikes', 'workStyle'];
              let completedFields = 0;
              
              profileFields.forEach(field => {
                if (agentInfo[field] && agentInfo[field].toString().trim()) {
                  personalityStats.fieldStats[field]++;
                  completedFields++;
                }
              });
              
              // 80% 이상 완성된 프로필
              if (completedFields >= profileFields.length * 0.8) {
                personalityStats.profileCompleteness.completed++;
              }
              
              // 나이 분석
              if (agentInfo.age) {
                const ageNum = parseInt(agentInfo.age);
                if (!isNaN(ageNum) && ageNum > 0) {
                  personalityStats.ageData.push(ageNum);
                }
              }
              
              // 성별 분석
              if (agentInfo.gender) {
                const gender = agentInfo.gender.includes('남') || agentInfo.gender.includes('male') ? 'male' : 'female';
                personalityStats.genderStats[gender]++;
              }
              
              // 성격 유형 분석
              if (agentInfo.personality && agentInfo.personality.trim()) {
                const personality = agentInfo.personality.trim();
                personalityStats.personalityTypes[personality] = (personalityStats.personalityTypes[personality] || 0) + 1;
              }
              
              // 교육 수준 분석
              if (agentInfo.education && agentInfo.education.trim()) {
                const education = agentInfo.education.trim();
                personalityStats.educationLevels[education] = (personalityStats.educationLevels[education] || 0) + 1;
              }
              
              // 전공 분석
              if (agentInfo.major && agentInfo.major.trim()) {
                const major = agentInfo.major.trim();
                personalityStats.majorFields[major] = (personalityStats.majorFields[major] || 0) + 1;
              }
              
              // 직업 분석
              if (agentInfo.professional && agentInfo.professional.trim()) {
                const profession = agentInfo.professional.trim();
                personalityStats.professions[profession] = (personalityStats.professions[profession] || 0) + 1;
              }
              
              // 스킬 분석
              if (agentInfo.skills) {
                let skillList = [];
                if (Array.isArray(agentInfo.skills)) {
                  skillList = agentInfo.skills;
                } else if (typeof agentInfo.skills === 'string') {
                  skillList = agentInfo.skills.split(',').map(skill => skill.trim()).filter(skill => skill);
                }
                
                skillList.forEach(skill => {
                  if (skill) {
                    personalityStats.skills[skill] = (personalityStats.skills[skill] || 0) + 1;
                  }
                });
              }
            });
          });
        });
        
        return personalityStats;
      })(),
      
      // 중앙집권화된 활동 통계 (모든 탭에서 일관된 계산)
      centralizedActivityStats: calculateTeamActivityStats(teams),
      
      // 사용자 프로필 완성도 통계
      userProfileCompleteness: calculateUserProfileCompleteness(teams)
    };
  }, [teams]);

  return analysisData;
};