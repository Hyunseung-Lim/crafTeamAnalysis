import React, { useMemo, useState } from 'react';
import './AnalysisReport.css';

const AnalysisReportClean = ({ teams }) => {
  const [activeTab, setActiveTab] = useState('structure');

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
    const userIdeaStats = { team1: [], team2: [], team3: [], total: [] };
    const userEvaluationStats = { team1: [], team2: [], team3: [], total: [] };
    const userFeedbackStats = { team1: [], team2: [], team3: [], total: [] };
    const userRequestStats = { team1: [], team2: [], team3: [], total: [] };
    
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
    const agentRoleStats = { team1: [], team2: [], team3: [], total: [] };
    const userRoleStats = { team1: [], team2: [], team3: [], total: [] };
    const totalRoleStats = { team1: [], team2: [], team3: [], total: [] };
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

    // 문자열 유사도 계산 함수 (미세한 변경 감지용)
    const calculateSimilarity = (str1, str2) => {
      if (!str1 || !str2) return str1 === str2 ? 1 : 0;
      if (str1 === str2) return 1;
      
      // 간단한 Levenshtein distance 기반 유사도
      const maxLength = Math.max(str1.length, str2.length);
      const distance = levenshteinDistance(str1, str2);
      return (maxLength - distance) / maxLength;
    };

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

    // 참가자별 멘탈 모델 변경 분석
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
            isSignificantChange: similarity < 0.7,
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
          significantChanges: changes.filter(change => change.isSignificantChange).length
        };
      });
      
      return participantChanges;
    };

    const participantMentalModelChanges = analyzeParticipantMentalModelChanges();

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
    
    // 역할 담당자 수 및 전체 인원 수 추적
    const roleAssignmentStats = {
      total: {
        total: { 
          generation: { assigned: 0, totalMembers: 0 },
          evaluation: { assigned: 0, totalMembers: 0 },
          feedback: { assigned: 0, totalMembers: 0 },
          request: { assigned: 0, totalMembers: 0 }
        },
        agents: { 
          generation: { assigned: 0, totalMembers: 0 },
          evaluation: { assigned: 0, totalMembers: 0 },
          feedback: { assigned: 0, totalMembers: 0 },
          request: { assigned: 0, totalMembers: 0 }
        },
        users: { 
          generation: { assigned: 0, totalMembers: 0 },
          evaluation: { assigned: 0, totalMembers: 0 },
          feedback: { assigned: 0, totalMembers: 0 },
          request: { assigned: 0, totalMembers: 0 }
        }
      }
    };

    // 리더십 분석 데이터
    const leadershipAnalysis = {
      team1: { userLeader: 0, aiLeader: 0, noLeader: 0, total: 0 },
      team2: { userLeader: 0, aiLeader: 0, noLeader: 0, total: 0 },
      team3: { userLeader: 0, aiLeader: 0, noLeader: 0, total: 0 },
      total: { userLeader: 0, aiLeader: 0, noLeader: 0, total: 0 }
    };

    // 팀 구조 유형 정의
    const teamStructureTypes = {
      flat: [
        { owner: '한수지', team: 1 }, { owner: '한수지', team: 2 },
        { owner: '임현정', team: 1 }, { owner: '임현정', team: 2 }, { owner: '임현정', team: 3 }
      ],
      complex: [
        { owner: '홍가영', team: 2 }, { owner: '박유빈', team: 1 }, { owner: '정영철', team: 2 },
        { owner: '서익준', team: 2 }, { owner: '홍가영', team: 3 }, { owner: '서익준', team: 3 },
        { owner: '정영철', team: 3 }, { owner: '김태완', team: 1 }, { owner: '남호연', team: 2 },
        { owner: '최대호', team: 1 }, { owner: '송유택', team: 1 }
      ]
    };
    
    // 팀 구조 유형별 통계
    const structureStats = {
      flat: { teams: [], evaluations: [], ideas: [], chat: [], satisfaction: [] },
      simple: { teams: [], evaluations: [], ideas: [], chat: [], satisfaction: [] },
      complex: { teams: [], evaluations: [], ideas: [], chat: [], satisfaction: [] }
    };
    
    // 팀별(team1, team2, team3) 구조 유형 빈도수 추적
    const teamStructureFrequency = {
      team1: { flat: 0, simple: 0, complex: 0, total: 0 },
      team2: { flat: 0, simple: 0, complex: 0, total: 0 },
      team3: { flat: 0, simple: 0, complex: 0, total: 0 }
    };

    // 각 참가자의 팀별로 데이터 수집
    Object.values(participantTeams).forEach(teams => {
      teams.forEach((team, index) => {
        const teamKey = index === 0 ? 'team1' : index === 1 ? 'team2' : index === 2 ? 'team3' : null;
        
        // 팀 구조 유형 분류 함수
        const getTeamStructureType = (ownerName, teamNumber) => {
          const flatTeam = teamStructureTypes.flat.find(t => t.owner === ownerName && t.team === teamNumber);
          const complexTeam = teamStructureTypes.complex.find(t => t.owner === ownerName && t.team === teamNumber);
          
          if (flatTeam) return 'flat';
          if (complexTeam) return 'complex';
          return 'simple';
        };
        
        // 현재 팀의 구조 유형 결정
        const ownerName = team.owner_info?.name;
        const teamNumber = index + 1;
        const structureType = getTeamStructureType(ownerName, teamNumber);
        
        // 팀별 구조 유형 빈도수 카운트
        if (teamKey && structureType && ownerName) {
          teamStructureFrequency[teamKey][structureType]++;
          teamStructureFrequency[teamKey].total++;
        }
        
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
        
        // 사용자가 생성한 아이디어 수
        let userIdeaCount = 0;
        for (const idea of sortedIdeas) {
          if (idea.author === '나') {
            userIdeaCount++;
          }
        }
        
        // 사용자가 수행한 평가 수 (아이디어 내부의 평가들을 확인)
        let userEvaluationCount = 0;
        if (sortedIdeas) {
          for (const idea of sortedIdeas) {
            // evaluations가 문자열인 경우 파싱 시도
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
          }
        }
        
        // 사용자가 수행한 피드백 수
        let userFeedbackCount = 0;
        if (team.chat) {
          for (const chatItem of team.chat) {
            if (chatItem.author === '나' && chatItem.content && chatItem.content.includes('피드백')) {
              userFeedbackCount++;
            }
          }
        }
        
        // 사용자가 수행한 요청 수  
        let userRequestCount = 0;
        if (team.chat) {
          for (const chatItem of team.chat) {
            if (chatItem.author === '나' && chatItem.content && 
                (chatItem.content.includes('요청') || chatItem.content.includes('부탁') || chatItem.content.includes('해주세요'))) {
              userRequestCount++;
            }
          }
        }
        
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
        userIdeaStats.total.push(userIdeaCount);
        userEvaluationStats.total.push(userEvaluationCount);
        userFeedbackStats.total.push(userFeedbackCount);
        userRequestStats.total.push(userRequestCount);
        
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
        
        chatStats.total.push(chatCount);
        sharedMentalModelStats.total.push(sharedMentalModelLength);
        sharedMentalModelDetails.total.push({
          length: sharedMentalModelLength,
          participant: ownerName,
          teamNumber: teamNumber,
          participantId: `P${Object.keys(participantTeams).indexOf(ownerName) + 1}`,
          teamId: `P${Object.keys(participantTeams).indexOf(ownerName) + 1}T${teamNumber}`
        });

        // 팀별 통계에 추가 (첫 3개 팀만)
        if (teamKey) {
          teamSizeStats[teamKey].push(teamSize);
          ideaStats[teamKey].push(ideaCount);
          newIdeaStats[teamKey].push(newIdeaCount);
          updatedIdeaStats[teamKey].push(updatedIdeaCount);
          ideaPerAgentStats[teamKey].push(ideaPerAgent);
          userIdeaStats[teamKey].push(userIdeaCount);
          userEvaluationStats[teamKey].push(userEvaluationCount);
          userFeedbackStats[teamKey].push(userFeedbackCount);
          userRequestStats[teamKey].push(userRequestCount);
          chatStats[teamKey].push(chatCount);
          sharedMentalModelStats[teamKey].push(sharedMentalModelLength);
          sharedMentalModelDetails[teamKey].push({
            length: sharedMentalModelLength,
            participant: ownerName,
            teamNumber: teamNumber,
            participantId: `P${Object.keys(participantTeams).indexOf(ownerName) + 1}`,
            teamId: `P${Object.keys(participantTeams).indexOf(ownerName) + 1}T${teamNumber}`
          });
        }

        // 사용자 역할 분석
        const teamMembers = JSON.parse(team.team_info?.members || '[]');
        const allMemberRoleCounts = [];
        const agentRoleCounts = [];
        const userRoleCounts = [];
        
        // 역할 담당자 수 계산을 위한 변수들
        const roleAssignments = {
          total: { generation: 0, evaluation: 0, feedback: 0, request: 0 },
          agents: { generation: 0, evaluation: 0, feedback: 0, request: 0 },
          users: { generation: 0, evaluation: 0, feedback: 0, request: 0 }
        };
        let totalMemberCount = teamMembers.length;
        let agentMemberCountForAssignment = 0;
        let userMemberCount = 0;

        // 리더십 분석
        let hasLeader = false;
        let leaderType = ''; // 'user' or 'ai'
        
        teamMembers.forEach(member => {
          const roles = member.roles || [];
          allMemberRoleCounts.push(roles.length);
          
          // 각 역할을 가지고 있는지 확인 (중복 제거)
          const hasGeneration = roles.includes('아이디어 생성하기');
          const hasEvaluation = roles.includes('아이디어 평가하기');
          const hasFeedback = roles.includes('피드백하기');
          const hasRequest = roles.includes('요청하기');
          
          // 리더십 체크
          if (member.isLeader) {
            hasLeader = true;
            leaderType = member.isUser ? 'user' : 'ai';
          }

          // 전체 담당자 수 증가
          if (hasGeneration) roleAssignments.total.generation++;
          if (hasEvaluation) roleAssignments.total.evaluation++;
          if (hasFeedback) roleAssignments.total.feedback++;
          if (hasRequest) roleAssignments.total.request++;
          
          if (member.isUser) {
            userRoleCounts.push(roles.length);
            userMemberCount++;
            
            // 사용자 담당자 수 증가
            if (hasGeneration) roleAssignments.users.generation++;
            if (hasEvaluation) roleAssignments.users.evaluation++;
            if (hasFeedback) roleAssignments.users.feedback++;
            if (hasRequest) roleAssignments.users.request++;
            
          } else if (member.agentId) {
            agentMemberCountForAssignment++;
            agentRoleCounts.push(roles.length);
            
            // AI 에이전트 담당자 수 증가
            if (hasGeneration) roleAssignments.agents.generation++;
            if (hasEvaluation) roleAssignments.agents.evaluation++;
            if (hasFeedback) roleAssignments.agents.feedback++;
            if (hasRequest) roleAssignments.agents.request++;
          }
        });

        // 리더십 통계 업데이트
        leadershipAnalysis.total.total++;
        if (teamKey) {
          leadershipAnalysis[teamKey].total++;
        }
        
        if (hasLeader) {
          if (leaderType === 'user') {
            leadershipAnalysis.total.userLeader++;
            if (teamKey) {
              leadershipAnalysis[teamKey].userLeader++;
            }
          } else if (leaderType === 'ai') {
            leadershipAnalysis.total.aiLeader++;
            if (teamKey) {
              leadershipAnalysis[teamKey].aiLeader++;
            }
          }
        } else {
          leadershipAnalysis.total.noLeader++;
          if (teamKey) {
            leadershipAnalysis[teamKey].noLeader++;
          }
        }
        
        // 역할 분포 계산 (전체, 에이전트만, 사용자만)
        const allRoles = teamMembers.flatMap(member => member.roles || []);
        const agentRoles = teamMembers.filter(member => !member.isUser).flatMap(member => member.roles || []);
        const userRolesList = teamMembers.filter(member => member.isUser).flatMap(member => member.roles || []);
        
        const currentRoleDistribution = {
          total: { generation: 0, evaluation: 0, feedback: 0, request: 0, total: allRoles.length },
          agents: { generation: 0, evaluation: 0, feedback: 0, request: 0, total: agentRoles.length },
          users: { generation: 0, evaluation: 0, feedback: 0, request: 0, total: userRolesList.length }
        };
        
        // 전체 역할 분포 계산
        allRoles.forEach(role => {
          if (role === '아이디어 생성하기') currentRoleDistribution.total.generation++;
          if (role === '아이디어 평가하기') currentRoleDistribution.total.evaluation++;
          if (role === '피드백하기') currentRoleDistribution.total.feedback++;
          if (role === '요청하기') currentRoleDistribution.total.request++;
        });
        
        // 에이전트 역할 분포 계산
        agentRoles.forEach(role => {
          if (role === '아이디어 생성하기') currentRoleDistribution.agents.generation++;
          if (role === '아이디어 평가하기') currentRoleDistribution.agents.evaluation++;
          if (role === '피드백하기') currentRoleDistribution.agents.feedback++;
          if (role === '요청하기') currentRoleDistribution.agents.request++;
        });
        
        // 사용자 역할 분포 계산
        userRolesList.forEach(role => {
          if (role === '아이디어 생성하기') currentRoleDistribution.users.generation++;
          if (role === '아이디어 평가하기') currentRoleDistribution.users.evaluation++;
          if (role === '피드백하기') currentRoleDistribution.users.feedback++;
          if (role === '요청하기') currentRoleDistribution.users.request++;
        });

        // 전체 통계에 추가 - 개별 멤버 데이터로 통일
        agentRoleStats.total.push(...agentRoleCounts);
        userRoleStats.total.push(...userRoleCounts);
        totalRoleStats.total.push(...allMemberRoleCounts);
        
        // 역할 담당자 수 통계에 추가
        roleAssignmentStats.total.total.generation.assigned += roleAssignments.total.generation;
        roleAssignmentStats.total.total.generation.totalMembers += totalMemberCount;
        roleAssignmentStats.total.total.evaluation.assigned += roleAssignments.total.evaluation;
        roleAssignmentStats.total.total.evaluation.totalMembers += totalMemberCount;
        roleAssignmentStats.total.total.feedback.assigned += roleAssignments.total.feedback;
        roleAssignmentStats.total.total.feedback.totalMembers += totalMemberCount;
        roleAssignmentStats.total.total.request.assigned += roleAssignments.total.request;
        roleAssignmentStats.total.total.request.totalMembers += totalMemberCount;
        
        roleAssignmentStats.total.agents.generation.assigned += roleAssignments.agents.generation;
        roleAssignmentStats.total.agents.generation.totalMembers += agentMemberCountForAssignment;
        roleAssignmentStats.total.agents.evaluation.assigned += roleAssignments.agents.evaluation;
        roleAssignmentStats.total.agents.evaluation.totalMembers += agentMemberCountForAssignment;
        roleAssignmentStats.total.agents.feedback.assigned += roleAssignments.agents.feedback;
        roleAssignmentStats.total.agents.feedback.totalMembers += agentMemberCountForAssignment;
        roleAssignmentStats.total.agents.request.assigned += roleAssignments.agents.request;
        roleAssignmentStats.total.agents.request.totalMembers += agentMemberCountForAssignment;
        
        roleAssignmentStats.total.users.generation.assigned += roleAssignments.users.generation;
        roleAssignmentStats.total.users.generation.totalMembers += userMemberCount;
        roleAssignmentStats.total.users.evaluation.assigned += roleAssignments.users.evaluation;
        roleAssignmentStats.total.users.evaluation.totalMembers += userMemberCount;
        roleAssignmentStats.total.users.feedback.assigned += roleAssignments.users.feedback;
        roleAssignmentStats.total.users.feedback.totalMembers += userMemberCount;
        roleAssignmentStats.total.users.request.assigned += roleAssignments.users.request;
        roleAssignmentStats.total.users.request.totalMembers += userMemberCount;
        
        // 전체 역할 분포 통계 업데이트
        ['total', 'agents', 'users'].forEach(type => {
          roleDistribution.total[type].generation += currentRoleDistribution[type].generation;
          roleDistribution.total[type].evaluation += currentRoleDistribution[type].evaluation;
          roleDistribution.total[type].feedback += currentRoleDistribution[type].feedback;
          roleDistribution.total[type].request += currentRoleDistribution[type].request;
          roleDistribution.total[type].total += currentRoleDistribution[type].total;
        });

        // 팀별 통계에 추가 (첫 3개 팀만)
        if (teamKey) {
          agentRoleStats[teamKey].push(...agentRoleCounts);
          userRoleStats[teamKey].push(...userRoleCounts);
          totalRoleStats[teamKey].push(...allMemberRoleCounts);
          
          // 팀별 역할 분포 통계 업데이트
          ['total', 'agents', 'users'].forEach(type => {
            roleDistribution[teamKey][type].generation += currentRoleDistribution[type].generation;
            roleDistribution[teamKey][type].evaluation += currentRoleDistribution[type].evaluation;
            roleDistribution[teamKey][type].feedback += currentRoleDistribution[type].feedback;
            roleDistribution[teamKey][type].request += currentRoleDistribution[type].request;
            roleDistribution[teamKey][type].total += currentRoleDistribution[type].total;
          });
        }

        // 에이전트 역할 분석 (팀별로 각 역할 개수 수집) - 기존 로직 유지
        const teamRoles = { generation: 0, evaluation: 0, feedback: 0, request: 0 };
        
        // 실제 수행량 계산을 위한 변수들 추가
        const actualPerformances = {
          evaluation: { total: 0, byAgent: {} },
          feedback: { total: 0, byAgent: {} },
          request: { total: 0, byAgent: {} }
        };
        
        // evaluations 데이터에서 실제 평가/피드백/요청 횟수 계산
        if (team.evaluations && Array.isArray(team.evaluations)) {
          team.evaluations.forEach(evaluation => {
            try {
              let evalData;
              if (typeof evaluation === 'string') {
                evalData = JSON.parse(evaluation);
              } else {
                evalData = evaluation;
              }
              
              const authorId = evalData.author;
              const actionType = evalData.action || evalData.type;
              
              // 평가 행동 카운트
              if (actionType === 'evaluate' || actionType === '평가') {
                actualPerformances.evaluation.total++;
                if (!actualPerformances.evaluation.byAgent[authorId]) {
                  actualPerformances.evaluation.byAgent[authorId] = 0;
                }
                actualPerformances.evaluation.byAgent[authorId]++;
              }
              
              // 피드백 행동 카운트
              if (actionType === 'feedback' || actionType === '피드백') {
                actualPerformances.feedback.total++;
                if (!actualPerformances.feedback.byAgent[authorId]) {
                  actualPerformances.feedback.byAgent[authorId] = 0;
                }
                actualPerformances.feedback.byAgent[authorId]++;
              }
              
              // 요청 행동 카운트
              if (actionType === 'request' || actionType === '요청') {
                actualPerformances.request.total++;
                if (!actualPerformances.request.byAgent[authorId]) {
                  actualPerformances.request.byAgent[authorId] = 0;
                }
                actualPerformances.request.byAgent[authorId]++;
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
        
        // 구조 유형별 통계 수집
        if (structureType && ownerName) {
          structureStats[structureType].teams.push({
            owner: ownerName,
            teamNumber,
            teamSize,
            ideaCount,
            chatCount,
            userIdeaCount
          });
          
          structureStats[structureType].ideas.push(ideaCount);
          structureStats[structureType].chat.push(chatCount);
          
          // 평가 데이터 수집
          const evaluations = team.evaluations || [];
          evaluations.forEach(evaluation => {
            structureStats[structureType].evaluations.push(evaluation);
            
            // 만족도 관련 필드들 수집 (평가 데이터에서 만족도 관련 항목 추출)
            const satisfactionFields = [
              '팀워크는 어떠했나요?',
              '팀 내 협업은 어떠했나요?',
              '전반적으로 이번 팀 경험에 대한 만족도는?',
              '다시 이런 팀으로 일할 의향이 있나요?',
              '1.3 해당 팀의 구조 (조직도)는 적절히 설계되었나요? ',
              '1.5 각 팀원들이 해당 조직도에 부합하여 업무를 수행했다고 생각하나요?'
            ];
            
            satisfactionFields.forEach(field => {
              if (evaluation[field]) {
                structureStats[structureType].satisfaction.push({
                  field,
                  value: evaluation[field],
                  owner: ownerName,
                  teamNumber
                });
              }
            });
          });
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

    // 공유 멘탈 모델용 통계 계산 함수 (최소/최대 팀 정보 포함)
    const calculateMentalModelStats = (arr, details) => {
      if (arr.length === 0) return { avg: 0, min: 0, max: 0, stdev: 0, minTeam: '', maxTeam: '' };
      
      const sorted = [...arr].sort((a, b) => a - b);
      const avg = arr.reduce((sum, val) => sum + val, 0) / arr.length;
      const variance = arr.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / arr.length;
      const stdev = Math.sqrt(variance);
      
      const minValue = sorted[0];
      const maxValue = sorted[sorted.length - 1];
      
      // 최소값과 최대값에 해당하는 팀 찾기
      const minTeam = details.find(d => d.length === minValue)?.teamId || '';
      const maxTeam = details.find(d => d.length === maxValue)?.teamId || '';
      
      return {
        avg: avg.toFixed(2),
        min: minValue.toFixed(2),
        max: maxValue.toFixed(2),
        stdev: stdev.toFixed(2),
        minTeam: minTeam,
        maxTeam: maxTeam
      };
    };

    // 각 카테고리별로 팀별 통계 계산
    const calculateStatsForAllTeams = (statsObj) => ({
      team1: calculateStats(statsObj.team1),
      team2: calculateStats(statsObj.team2),
      team3: calculateStats(statsObj.team3),
      total: calculateStats(statsObj.total)
    });

    // 공유 멘탈 모델용 팀별 통계 계산
    const calculateMentalModelStatsForAllTeams = (statsObj, detailsObj) => ({
      team1: calculateMentalModelStats(statsObj.team1, detailsObj.team1),
      team2: calculateMentalModelStats(statsObj.team2, detailsObj.team2),
      team3: calculateMentalModelStats(statsObj.team3, detailsObj.team3),
      total: calculateMentalModelStats(statsObj.total, detailsObj.total)
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

    // 역할 비율 계산
    const calculateRolePercentages = (roleData) => {
      const total = roleData.total;
      return {
        generation: total > 0 ? ((roleData.generation / total) * 100).toFixed(2) : '0.00',
        evaluation: total > 0 ? ((roleData.evaluation / total) * 100).toFixed(2) : '0.00',
        feedback: total > 0 ? ((roleData.feedback / total) * 100).toFixed(2) : '0.00',
        request: total > 0 ? ((roleData.request / total) * 100).toFixed(2) : '0.00'
      };
    };
    
    // 역할 담당률 계산 (몇 명 중 몇 명이 그 역할을 맡았는지)
    const calculateRoleAssignmentRates = (assignmentData) => {
      return {
        generation: assignmentData.generation.totalMembers > 0 
          ? (assignmentData.generation.assigned / assignmentData.generation.totalMembers).toFixed(2)
          : '0.00',
        evaluation: assignmentData.evaluation.totalMembers > 0 
          ? (assignmentData.evaluation.assigned / assignmentData.evaluation.totalMembers).toFixed(2)
          : '0.00',
        feedback: assignmentData.feedback.totalMembers > 0 
          ? (assignmentData.feedback.assigned / assignmentData.feedback.totalMembers).toFixed(2)
          : '0.00',
        request: assignmentData.request.totalMembers > 0 
          ? (assignmentData.request.assigned / assignmentData.request.totalMembers).toFixed(2)
          : '0.00'
      };
    };
    
    const roleAssignmentRates = {
      total: calculateRoleAssignmentRates(roleAssignmentStats.total.total),
      agents: calculateRoleAssignmentRates(roleAssignmentStats.total.agents),
      users: calculateRoleAssignmentRates(roleAssignmentStats.total.users)
    };

    const rolePercentages = {
      team1: {
        total: calculateRolePercentages(roleDistribution.team1.total),
        agents: calculateRolePercentages(roleDistribution.team1.agents),
        users: calculateRolePercentages(roleDistribution.team1.users)
      },
      team2: {
        total: calculateRolePercentages(roleDistribution.team2.total),
        agents: calculateRolePercentages(roleDistribution.team2.agents),
        users: calculateRolePercentages(roleDistribution.team2.users)
      },
      team3: {
        total: calculateRolePercentages(roleDistribution.team3.total),
        agents: calculateRolePercentages(roleDistribution.team3.agents),
        users: calculateRolePercentages(roleDistribution.team3.users)
      },
      total: {
        total: calculateRolePercentages(roleDistribution.total.total),
        agents: calculateRolePercentages(roleDistribution.total.agents),
        users: calculateRolePercentages(roleDistribution.total.users)
      }
    };
    
    // 구조 유형별 분석 결과 계산
    // 만족도 분석 함수
    function analyzeSatisfaction(satisfactionData) {
      if (satisfactionData.length === 0) return { summary: '데이터 없음', details: [] };
      
      const fieldAnalysis = {};
      satisfactionData.forEach(item => {
        if (!fieldAnalysis[item.field]) {
          fieldAnalysis[item.field] = [];
        }
        fieldAnalysis[item.field].push(item.value);
      });
      
      const results = {};
      Object.keys(fieldAnalysis).forEach(field => {
        const values = fieldAnalysis[field];
        const positiveCount = values.filter(v => {
          // 수치형 데이터 처리 (1-5점에서 3점 이상을 긍정으로 처리)
          const numValue = parseInt(v);
          if (!isNaN(numValue) && numValue >= 1 && numValue <= 5) {
            return numValue >= 3;
          }
          // 텍스트 데이터 처리 (기존 로직)
          return v.includes('좋') || v.includes('만족') || v.includes('높') || 
                 v.includes('원활') || v.includes('그렇다') || v.includes('예');
        }).length;
        
        results[field] = {
          total: values.length,
          positive: positiveCount,
          rate: values.length > 0 ? (positiveCount / values.length * 100).toFixed(1) : 0
        };
      });
      
      return results;
    }

    const structureAnalysis = {
      flat: {
        teamCount: structureStats.flat.teams.length,
        avgIdeas: structureStats.flat.ideas.length > 0 ? (structureStats.flat.ideas.reduce((sum, val) => sum + val, 0) / structureStats.flat.ideas.length).toFixed(2) : 0,
        avgChat: structureStats.flat.chat.length > 0 ? (structureStats.flat.chat.reduce((sum, val) => sum + val, 0) / structureStats.flat.chat.length).toFixed(2) : 0,
        satisfactionAnalysis: analyzeSatisfaction(structureStats.flat.satisfaction),
        teamDetails: structureStats.flat.teams
      },
      simple: {
        teamCount: structureStats.simple.teams.length,
        avgIdeas: structureStats.simple.ideas.length > 0 ? (structureStats.simple.ideas.reduce((sum, val) => sum + val, 0) / structureStats.simple.ideas.length).toFixed(2) : 0,
        avgChat: structureStats.simple.chat.length > 0 ? (structureStats.simple.chat.reduce((sum, val) => sum + val, 0) / structureStats.simple.chat.length).toFixed(2) : 0,
        satisfactionAnalysis: analyzeSatisfaction(structureStats.simple.satisfaction),
        teamDetails: structureStats.simple.teams
      },
      complex: {
        teamCount: structureStats.complex.teams.length,
        avgIdeas: structureStats.complex.ideas.length > 0 ? (structureStats.complex.ideas.reduce((sum, val) => sum + val, 0) / structureStats.complex.ideas.length).toFixed(2) : 0,
        avgChat: structureStats.complex.chat.length > 0 ? (structureStats.complex.chat.reduce((sum, val) => sum + val, 0) / structureStats.complex.chat.length).toFixed(2) : 0,
        satisfactionAnalysis: analyzeSatisfaction(structureStats.complex.satisfaction),
        teamDetails: structureStats.complex.teams
      }
    };

    return {
      teamSize: calculateStatsForAllTeams(teamSizeStats),
      ideas: calculateStatsForAllTeams(ideaStats),
      newIdeas: calculateStatsForAllTeams(newIdeaStats),
      updatedIdeas: calculateStatsForAllTeams(updatedIdeaStats),
      ideaPerAgent: calculateStatsForAllTeams(ideaPerAgentStats),
      // 에이전트별 평가/피드백/요청 통계 (실제 계산된 데이터)
      evaluationPerAgent: calculateStatsForAllTeams(evaluationPerformanceStats),
      feedbackPerAgent: calculateStatsForAllTeams(feedbackPerformanceStats),
      requestPerAgent: calculateStatsForAllTeams(requestPerformanceStats),
      userIdeas: calculateStatsForAllTeams(userIdeaStats),
      userEvaluations: calculateStatsForAllTeams(userEvaluationStats),
      userFeedback: calculateStatsForAllTeams(userFeedbackStats),
      userRequests: calculateStatsForAllTeams(userRequestStats),
      chat: calculateStatsForAllTeams(chatStats),
      agentRoles: calculateStatsForAllTeams(agentRoleStats),
      userRoles: calculateStatsForAllTeams(userRoleStats),
      totalRoles: calculateStatsForAllTeams(totalRoleStats),
      sharedMentalModel: calculateMentalModelStatsForAllTeams(sharedMentalModelStats, sharedMentalModelDetails),
      rolePercentages,
      roleDistribution,
      roleAssignmentRates: {
        ...roleAssignmentRates,
        team1: {
          total: roleAssignmentStats.team1?.total ? calculateRoleAssignmentRates(roleAssignmentStats.team1.total) : { generation: '0.00', evaluation: '0.00', feedback: '0.00', request: '0.00' },
          agents: roleAssignmentStats.team1?.agents ? calculateRoleAssignmentRates(roleAssignmentStats.team1.agents) : { generation: '0.00', evaluation: '0.00', feedback: '0.00', request: '0.00' },
          users: roleAssignmentStats.team1?.users ? calculateRoleAssignmentRates(roleAssignmentStats.team1.users) : { generation: '0.00', evaluation: '0.00', feedback: '0.00', request: '0.00' }
        },
        team2: {
          total: roleAssignmentStats.team2?.total ? calculateRoleAssignmentRates(roleAssignmentStats.team2.total) : { generation: '0.00', evaluation: '0.00', feedback: '0.00', request: '0.00' },
          agents: roleAssignmentStats.team2?.agents ? calculateRoleAssignmentRates(roleAssignmentStats.team2.agents) : { generation: '0.00', evaluation: '0.00', feedback: '0.00', request: '0.00' },
          users: roleAssignmentStats.team2?.users ? calculateRoleAssignmentRates(roleAssignmentStats.team2.users) : { generation: '0.00', evaluation: '0.00', feedback: '0.00', request: '0.00' }
        },
        team3: {
          total: roleAssignmentStats.team3?.total ? calculateRoleAssignmentRates(roleAssignmentStats.team3.total) : { generation: '0.00', evaluation: '0.00', feedback: '0.00', request: '0.00' },
          agents: roleAssignmentStats.team3?.agents ? calculateRoleAssignmentRates(roleAssignmentStats.team3.agents) : { generation: '0.00', evaluation: '0.00', feedback: '0.00', request: '0.00' },
          users: roleAssignmentStats.team3?.users ? calculateRoleAssignmentRates(roleAssignmentStats.team3.users) : { generation: '0.00', evaluation: '0.00', feedback: '0.00', request: '0.00' }
        },
        total: roleAssignmentRates
      },
      structureAnalysis,
      teamStructureFrequency,
      participantMentalModelChanges,
      leadershipAnalysis,
      roles: calculateRoleStatsForAllTeams(roleAnalysis)
    };
  }, [teams]);

  if (!analysisData) {
    return (
      <div className="analysis-report">
        <div className="no-data">분석할 데이터가 없습니다.</div>
      </div>
    );
  }

  return (
    <div className="analysis-report">
      <div className="report-header">
        <h2>📊 팀 데이터 분석 리포트</h2>
        <p className="report-subtitle">structured_teams.json 데이터 기반 종합 분석</p>
        
        <div className="analysis-tabs">
          <button 
            className={`tab-button ${activeTab === 'structure' ? 'active' : ''}`}
            onClick={() => setActiveTab('structure')}
          >
            🏗️ 팀 크기 및 구조 분석
          </button>
          <button 
            className={`tab-button ${activeTab === 'roles' ? 'active' : ''}`}
            onClick={() => setActiveTab('roles')}
          >
            👥 역할 분담 분석
          </button>
          <button 
            className={`tab-button ${activeTab === 'mental-model' ? 'active' : ''}`}
            onClick={() => setActiveTab('mental-model')}
          >
            🧠 공유 멘탈 모델 분석
          </button>
        </div>
      </div>

      <div className="analysis-content">
        <>
        {activeTab === 'structure' && (
          <div className="analysis-grid structure-tab">
            {/* 팀 구조 유형별 분석 */}
            <div className="analysis-section">
              <h3>🏗️ 팀 구조 유형별 분석</h3>
              <div className="structure-analysis">
                <div className="structure-overview">
                  <div className="structure-type flat">
                    <h4>📋 Flat Team ({analysisData.structureAnalysis.flat.teamCount}개)</h4>
                    <div className="structure-stats">
                      <p><strong>평균 아이디어:</strong> {analysisData.structureAnalysis.flat.avgIdeas}개</p>
                      <p><strong>평균 채팅:</strong> {analysisData.structureAnalysis.flat.avgChat}개</p>
                      <div className="satisfaction-summary">
                        <strong>만족도 분석:</strong>
                        {Object.keys(analysisData.structureAnalysis.flat.satisfactionAnalysis).map(field => (
                          <div key={field} className="satisfaction-item">
                            <span className="field-name">{field}:</span>
                            <span className="satisfaction-rate">{analysisData.structureAnalysis.flat.satisfactionAnalysis[field].rate}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="team-list">
                      <strong>팀 목록:</strong>
                      {analysisData.structureAnalysis.flat.teamDetails.map((team, idx) => (
                        <span key={idx} className="team-tag">
                          {team.owner} team{team.teamNumber}
                        </span>
                      ))}
                    </div>
                  </div>
              
                  <div className="structure-type simple">
                    <h4>📊 Simple Hierarchy ({analysisData.structureAnalysis.simple.teamCount}개)</h4>
                    <div className="structure-stats">
                      <p><strong>평균 아이디어:</strong> {analysisData.structureAnalysis.simple.avgIdeas}개</p>
                      <p><strong>평균 채팅:</strong> {analysisData.structureAnalysis.simple.avgChat}개</p>
                      <div className="satisfaction-summary">
                        <strong>만족도 분석:</strong>
                        {Object.keys(analysisData.structureAnalysis.simple.satisfactionAnalysis).map(field => (
                          <div key={field} className="satisfaction-item">
                            <span className="field-name">{field}:</span>
                            <span className="satisfaction-rate">{analysisData.structureAnalysis.simple.satisfactionAnalysis[field].rate}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="team-list">
                      <strong>팀 목록:</strong>
                      {analysisData.structureAnalysis.simple.teamDetails.map((team, idx) => (
                        <span key={idx} className="team-tag">
                          {team.owner} team{team.teamNumber}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="structure-type complex">
                    <h4>🔗 Complex Hierarchy ({analysisData.structureAnalysis.complex.teamCount}개)</h4>
                    <div className="structure-stats">
                      <p><strong>평균 아이디어:</strong> {analysisData.structureAnalysis.complex.avgIdeas}개</p>
                      <p><strong>평균 채팅:</strong> {analysisData.structureAnalysis.complex.avgChat}개</p>
                      <div className="satisfaction-summary">
                        <strong>만족도 분석:</strong>
                        {Object.keys(analysisData.structureAnalysis.complex.satisfactionAnalysis).map(field => (
                          <div key={field} className="satisfaction-item">
                            <span className="field-name">{field}:</span>
                            <span className="satisfaction-rate">{analysisData.structureAnalysis.complex.satisfactionAnalysis[field].rate}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="team-list">
                      <strong>팀 목록:</strong>
                      {analysisData.structureAnalysis.complex.teamDetails.map((team, idx) => (
                        <span key={idx} className="team-tag">
                          {team.owner} team{team.teamNumber}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* 팀별 구조 유형 빈도수 */}
                <div className="team-structure-frequency">
                  <h4>📊 팀별(1차, 2차, 3차) 구조 유형 빈도수</h4>
                  <div className="frequency-table">
                    <div className="frequency-header">
                      <div className="freq-label">팀</div>
                      <div className="freq-value">Flat</div>
                      <div className="freq-value">Simple</div>
                      <div className="freq-value">Complex</div>
                      <div className="freq-value">총계</div>
                    </div>
                    <div className="frequency-row">
                      <div className="freq-label">첫번째 팀</div>
                      <div className="freq-value">{analysisData.teamStructureFrequency.team1.flat}개</div>
                      <div className="freq-value">{analysisData.teamStructureFrequency.team1.simple}개</div>
                      <div className="freq-value">{analysisData.teamStructureFrequency.team1.complex}개</div>
                      <div className="freq-value">{analysisData.teamStructureFrequency.team1.total}개</div>
                    </div>
                    <div className="frequency-row">
                      <div className="freq-label">두번째 팀</div>
                      <div className="freq-value">{analysisData.teamStructureFrequency.team2.flat}개</div>
                      <div className="freq-value">{analysisData.teamStructureFrequency.team2.simple}개</div>
                      <div className="freq-value">{analysisData.teamStructureFrequency.team2.complex}개</div>
                      <div className="freq-value">{analysisData.teamStructureFrequency.team2.total}개</div>
                    </div>
                    <div className="frequency-row">
                      <div className="freq-label">세번째 팀</div>
                      <div className="freq-value">{analysisData.teamStructureFrequency.team3.flat}개</div>
                      <div className="freq-value">{analysisData.teamStructureFrequency.team3.simple}개</div>
                      <div className="freq-value">{analysisData.teamStructureFrequency.team3.complex}개</div>
                      <div className="freq-value">{analysisData.teamStructureFrequency.team3.total}개</div>
                    </div>
                  </div>
                </div>

                {/* 인사이트 요약 */}
                <div className="structure-insights">
                  <h4>🔍 주요 인사이트</h4>
                  <div className="insights-content">
                    <div className="insight-item">
                      <strong>생산성 비교:</strong>
                      <span>
                        Complex Hierarchy: {analysisData.structureAnalysis.complex.avgIdeas}개 | 
                        Simple Hierarchy: {analysisData.structureAnalysis.simple.avgIdeas}개 | 
                        Flat Team: {analysisData.structureAnalysis.flat.avgIdeas}개
                      </span>
                    </div>
                    <div className="insight-item">
                      <strong>소통량 비교:</strong>
                      <span>
                        Complex: {analysisData.structureAnalysis.complex.avgChat}개 | 
                        Simple: {analysisData.structureAnalysis.simple.avgChat}개 | 
                        Flat: {analysisData.structureAnalysis.flat.avgChat}개
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

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
                  <div className="stat-value">{analysisData.teamSize.team1.avg}명</div>
                  <div className="stat-value">{analysisData.teamSize.team1.min}명</div>
                  <div className="stat-value">{analysisData.teamSize.team1.max}명</div>
                  <div className="stat-value">{analysisData.teamSize.team1.stdev}</div>
                </div>
                <div className="stats-row">
                  <div className="stat-label">두번째 팀</div>
                  <div className="stat-value">{analysisData.teamSize.team2.avg}명</div>
                  <div className="stat-value">{analysisData.teamSize.team2.min}명</div>
                  <div className="stat-value">{analysisData.teamSize.team2.max}명</div>
                  <div className="stat-value">{analysisData.teamSize.team2.stdev}</div>
                </div>
                <div className="stats-row">
                  <div className="stat-label">세번째 팀</div>
                  <div className="stat-value">{analysisData.teamSize.team3.avg}명</div>
                  <div className="stat-value">{analysisData.teamSize.team3.min}명</div>
                  <div className="stat-value">{analysisData.teamSize.team3.max}명</div>
                  <div className="stat-value">{analysisData.teamSize.team3.stdev}</div>
                </div>
                <div className="stats-row total-row">
                  <div className="stat-label">전체</div>
                  <div className="stat-value">{analysisData.teamSize.total.avg}명</div>
                  <div className="stat-value">{analysisData.teamSize.total.min}명</div>
                  <div className="stat-value">{analysisData.teamSize.total.max}명</div>
                  <div className="stat-value">{analysisData.teamSize.total.stdev}</div>
                </div>
              </div>
            </div>

            {/* 아이디어 생성 분석 - 총 개수 */}
            <div className="analysis-section">
              <h3>💡 아이디어 생성 분석 (총 개수)</h3>
              <div className="idea-generation-summary">
                <p><strong>새로 생성된 아이디어:</strong> 평균 {analysisData.newIdeas.total.avg}개 (최소 {analysisData.newIdeas.total.min}개, 최대 {analysisData.newIdeas.total.max}개)</p>
                <p><strong>업데이트된 아이디어:</strong> 평균 {analysisData.updatedIdeas.total.avg}개 (최소 {analysisData.updatedIdeas.total.min}개, 최대 {analysisData.updatedIdeas.total.max}개)</p>
              </div>
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
            </div>




          </div>
        )}

        {activeTab === 'roles' && (
          <div className="analysis-grid roles-tab">

            {/* 리더십 분석 */}
            <div className="analysis-section">
              <h3>👑 리더십 분석</h3>
              <p className="analysis-description">
                36개 팀의 리더십 구조를 분석한 결과입니다. 사용자가 리더인 경우, AI가 리더인 경우, 그리고 리더가 없는 경우로 분류됩니다.
              </p>
              
              <div className="leadership-stats">
                <div className="team-stats-table">
                  <div className="stats-header">
                    <div className="stat-label">구분</div>
                    <div className="stat-value">사용자 리더</div>
                    <div className="stat-value">AI 리더</div>
                    <div className="stat-value">리더 없음</div>
                    <div className="stat-value">전체</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">첫번째 팀 (Team 1)</div>
                    <div className="stat-value">{analysisData.leadershipAnalysis.team1.userLeader}개</div>
                    <div className="stat-value">{analysisData.leadershipAnalysis.team1.aiLeader}개</div>
                    <div className="stat-value">{analysisData.leadershipAnalysis.team1.noLeader}개</div>
                    <div className="stat-value">{analysisData.leadershipAnalysis.team1.total}개</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">두번째 팀 (Team 2)</div>
                    <div className="stat-value">{analysisData.leadershipAnalysis.team2.userLeader}개</div>
                    <div className="stat-value">{analysisData.leadershipAnalysis.team2.aiLeader}개</div>
                    <div className="stat-value">{analysisData.leadershipAnalysis.team2.noLeader}개</div>
                    <div className="stat-value">{analysisData.leadershipAnalysis.team2.total}개</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">세번째 팀 (Team 3)</div>
                    <div className="stat-value">{analysisData.leadershipAnalysis.team3.userLeader}개</div>
                    <div className="stat-value">{analysisData.leadershipAnalysis.team3.aiLeader}개</div>
                    <div className="stat-value">{analysisData.leadershipAnalysis.team3.noLeader}개</div>
                    <div className="stat-value">{analysisData.leadershipAnalysis.team3.total}개</div>
                  </div>
                  <div className="stats-row total-row">
                    <div className="stat-label">전체 (Total)</div>
                    <div className="stat-value">{analysisData.leadershipAnalysis.total.userLeader}개</div>
                    <div className="stat-value">{analysisData.leadershipAnalysis.total.aiLeader}개</div>
                    <div className="stat-value">{analysisData.leadershipAnalysis.total.noLeader}개</div>
                    <div className="stat-value">{analysisData.leadershipAnalysis.total.total}개</div>
                  </div>
                </div>
              </div>

              <div className="leadership-insights">
                <h4>📊 주요 인사이트</h4>
                <div className="insights-grid">
                  <div className="insight-card">
                    <h5>리더십 분포</h5>
                    <p>
                      사용자 리더: {analysisData.leadershipAnalysis.total.userLeader}개 ({((analysisData.leadershipAnalysis.total.userLeader / analysisData.leadershipAnalysis.total.total) * 100).toFixed(1)}%)<br/>
                      AI 리더: {analysisData.leadershipAnalysis.total.aiLeader}개 ({((analysisData.leadershipAnalysis.total.aiLeader / analysisData.leadershipAnalysis.total.total) * 100).toFixed(1)}%)<br/>
                      리더 없음: {analysisData.leadershipAnalysis.total.noLeader}개 ({((analysisData.leadershipAnalysis.total.noLeader / analysisData.leadershipAnalysis.total.total) * 100).toFixed(1)}%)
                    </p>
                  </div>
                  <div className="insight-card">
                    <h5>팀별 트렌드</h5>
                    <p>
                      Team 1: {analysisData.leadershipAnalysis.team1.userLeader}명 사용자, {analysisData.leadershipAnalysis.team1.aiLeader}명 AI 리더<br/>
                      Team 2: {analysisData.leadershipAnalysis.team2.userLeader}명 사용자, {analysisData.leadershipAnalysis.team2.aiLeader}명 AI 리더<br/>
                      Team 3: {analysisData.leadershipAnalysis.team3.userLeader}명 사용자, {analysisData.leadershipAnalysis.team3.aiLeader}명 AI 리더
                    </p>
                  </div>
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
                  <div className="stat-value">{analysisData.chat.team1.avg}개</div>
                  <div className="stat-value">{analysisData.chat.team1.min}개</div>
                  <div className="stat-value">{analysisData.chat.team1.max}개</div>
                  <div className="stat-value">{analysisData.chat.team1.stdev}</div>
                </div>
                <div className="stats-row">
                  <div className="stat-label">두번째 팀</div>
                  <div className="stat-value">{analysisData.chat.team2.avg}개</div>
                  <div className="stat-value">{analysisData.chat.team2.min}개</div>
                  <div className="stat-value">{analysisData.chat.team2.max}개</div>
                  <div className="stat-value">{analysisData.chat.team2.stdev}</div>
                </div>
                <div className="stats-row">
                  <div className="stat-label">세번째 팀</div>
                  <div className="stat-value">{analysisData.chat.team3.avg}개</div>
                  <div className="stat-value">{analysisData.chat.team3.min}개</div>
                  <div className="stat-value">{analysisData.chat.team3.max}개</div>
                  <div className="stat-value">{analysisData.chat.team3.stdev}</div>
                </div>
                <div className="stats-row total-row">
                  <div className="stat-label">전체</div>
                  <div className="stat-value">{analysisData.chat.total.avg}개</div>
                  <div className="stat-value">{analysisData.chat.total.min}개</div>
                  <div className="stat-value">{analysisData.chat.total.max}개</div>
                  <div className="stat-value">{analysisData.chat.total.stdev}</div>
                </div>
              </div>
            </div>

            <div className="analysis-section">
              <h3>🤖 에이전트 역할 분석 - 아이디어 생성</h3>
              
              <div className="role-analysis-layout">
                <div className="role-stats-section">
                  <h4>담당 에이전트 통계</h4>
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
                      <div className="stat-value">{analysisData.roles.team1.generation.avg}개</div>
                      <div className="stat-value">{analysisData.roles.team1.generation.min}개</div>
                      <div className="stat-value">{analysisData.roles.team1.generation.max}개</div>
                      <div className="stat-value">{analysisData.roles.team1.generation.stdev}</div>
                    </div>
                    <div className="stats-row">
                      <div className="stat-label">두번째 팀</div>
                      <div className="stat-value">{analysisData.roles.team2.generation.avg}개</div>
                      <div className="stat-value">{analysisData.roles.team2.generation.min}개</div>
                      <div className="stat-value">{analysisData.roles.team2.generation.max}개</div>
                      <div className="stat-value">{analysisData.roles.team2.generation.stdev}</div>
                    </div>
                    <div className="stats-row">
                      <div className="stat-label">세번째 팀</div>
                      <div className="stat-value">{analysisData.roles.team3.generation.avg}개</div>
                      <div className="stat-value">{analysisData.roles.team3.generation.min}개</div>
                      <div className="stat-value">{analysisData.roles.team3.generation.max}개</div>
                      <div className="stat-value">{analysisData.roles.team3.generation.stdev}</div>
                    </div>
                    <div className="stats-row total-row">
                      <div className="stat-label">전체</div>
                      <div className="stat-value">{analysisData.roles.total.generation.avg}개</div>
                      <div className="stat-value">{analysisData.roles.total.generation.min}개</div>
                      <div className="stat-value">{analysisData.roles.total.generation.max}개</div>
                      <div className="stat-value">{analysisData.roles.total.generation.stdev}</div>
                    </div>
                  </div>
                </div>
                <div className="role-performance-section">
                  <h4>해당 역할을 맡은 에이전트가 생성한 아이디어량</h4>
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
                      <div className="stat-value">{analysisData.ideaPerAgent?.team1?.avg || '0.00'}개</div>
                      <div className="stat-value">{analysisData.ideaPerAgent?.team1?.min || '0.00'}개</div>
                      <div className="stat-value">{analysisData.ideaPerAgent?.team1?.max || '0.00'}개</div>
                      <div className="stat-value">{analysisData.ideaPerAgent?.team1?.stdev || '0.00'}</div>
                    </div>
                    <div className="stats-row">
                      <div className="stat-label">두번째 팀</div>
                      <div className="stat-value">{analysisData.ideaPerAgent?.team2?.avg || '0.00'}개</div>
                      <div className="stat-value">{analysisData.ideaPerAgent?.team2?.min || '0.00'}개</div>
                      <div className="stat-value">{analysisData.ideaPerAgent?.team2?.max || '0.00'}개</div>
                      <div className="stat-value">{analysisData.ideaPerAgent?.team2?.stdev || '0.00'}</div>
                    </div>
                    <div className="stats-row">
                      <div className="stat-label">세번째 팀</div>
                      <div className="stat-value">{analysisData.ideaPerAgent?.team3?.avg || '0.00'}개</div>
                      <div className="stat-value">{analysisData.ideaPerAgent?.team3?.min || '0.00'}개</div>
                      <div className="stat-value">{analysisData.ideaPerAgent?.team3?.max || '0.00'}개</div>
                      <div className="stat-value">{analysisData.ideaPerAgent?.team3?.stdev || '0.00'}</div>
                    </div>
                    <div className="stats-row total-row">
                      <div className="stat-label">전체</div>
                      <div className="stat-value">{analysisData.ideaPerAgent?.total?.avg || '0.00'}개</div>
                      <div className="stat-value">{analysisData.ideaPerAgent?.total?.min || '0.00'}개</div>
                      <div className="stat-value">{analysisData.ideaPerAgent?.total?.max || '0.00'}개</div>
                      <div className="stat-value">{analysisData.ideaPerAgent?.total?.stdev || '0.00'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 사용자 아이디어 생성 분석 */}
            <div className="analysis-section">
              <h3>👤 사용자 아이디어 생성 분석</h3>
              <div className="user-idea-summary">
                <div className="summary-stats">
                  <p><strong>전체 현황:</strong> 36개 팀 중 6개 팀(16.7%)에서만 사용자가 직접 아이디어 생성</p>
                  <p><strong>총 아이디어:</strong> 451개 중 사용자 생성 7개(1.6%), AI 생성 444개(98.4%)</p>
                </div>
              </div>
              
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
                  <div className="stat-value">{analysisData.userIdeas.team1.avg}개</div>
                  <div className="stat-value">{analysisData.userIdeas.team1.min}개</div>
                  <div className="stat-value">{analysisData.userIdeas.team1.max}개</div>
                  <div className="stat-value">{analysisData.userIdeas.team1.stdev}</div>
                </div>
                <div className="stats-row">
                  <div className="stat-label">두번째 팀</div>
                  <div className="stat-value">{analysisData.userIdeas.team2.avg}개</div>
                  <div className="stat-value">{analysisData.userIdeas.team2.min}개</div>
                  <div className="stat-value">{analysisData.userIdeas.team2.max}개</div>
                  <div className="stat-value">{analysisData.userIdeas.team2.stdev}</div>
                </div>
                <div className="stats-row">
                  <div className="stat-label">세번째 팀</div>
                  <div className="stat-value">{analysisData.userIdeas.team3.avg}개</div>
                  <div className="stat-value">{analysisData.userIdeas.team3.min}개</div>
                  <div className="stat-value">{analysisData.userIdeas.team3.max}개</div>
                  <div className="stat-value">{analysisData.userIdeas.team3.stdev}</div>
                </div>
                <div className="stats-row total-row">
                  <div className="stat-label">전체</div>
                  <div className="stat-value">{analysisData.userIdeas.total.avg}개</div>
                  <div className="stat-value">{analysisData.userIdeas.total.min}개</div>
                  <div className="stat-value">{analysisData.userIdeas.total.max}개</div>
                  <div className="stat-value">{analysisData.userIdeas.total.stdev}</div>
                </div>
              </div>
              
              <details className="user-role-details">
                <summary>🔍 상세 역할 분석 보기</summary>
                <div className="user-role-analysis">
                  <div className="role-summary">
                    <p><strong>아이디어 생성 역할을 맡은 팀:</strong> 13개 팀 (36.1%)</p>
                    <div className="role-breakdown">
                      <div className="role-stat">✅ 역할도 있고 실제로도 생성: 6개 팀</div>
                      <div className="role-stat">❌ 역할은 있지만 생성하지 않음: 7개 팀</div>
                      <div className="role-stat">📊 역할은 없지만 생성함: 0개 팀</div>
                    </div>
                  </div>
                  
                  <div className="role-details">
                    <h5>사용자가 아이디어 생성 역할을 맡은 팀 목록</h5>
                    <div className="role-teams-list">
                      <div className="role-team-item success">
                        <div className="team-header">✅ 역할 있고 실제 생성한 팀 (6개)</div>
                        <ul className="team-list">
                          <li>팀 4: 백선우님 - 디자인 혁신 팀 (1개 생성)</li>
                          <li>팀 5: 백선우님 - 디자인 혁신 팀 (복사본) (1개 생성)</li>
                          <li>팀 6: 백선우님 - 디자인 혁신 팀 (최종) (1개 생성)</li>
                          <li>팀 8: 송유택님 - Supernova~ (2개 생성)</li>
                          <li>팀 10: 임현정님 - 디자인팀1 (1개 생성)</li>
                          <li>팀 15: 서익준님 - VR/AR 서비스 아이디어 구상 3번 (1개 생성)</li>
                        </ul>
                      </div>
                      <div className="role-team-item warning">
                        <div className="team-header">❌ 역할 있지만 생성하지 않은 팀 (7개)</div>
                        <ul className="team-list">
                          <li>팀 11: 임현정님 - 디자인팀2</li>
                          <li>팀 12: 임현정님 - 디자인팀3</li>
                          <li>팀 16: 박유빈님 - 티비팀</li>
                          <li>팀 17: 박유빈님 - 티비팀 (복사본) (복사본)</li>
                          <li>팀 18: 박유빈님 - 티비팀 (복사본) (복사본) (복사본)</li>
                          <li>팀 20: 최대호님 - 혁신 디자인센터 2팀</li>
                          <li>팀 21: 최대호님 - 혁신 디자인센터 3팀</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="user-ideas-detail">
                    <h4>🔍 사용자가 직접 생성한 아이디어 목록</h4>
                    <div className="ideas-list">
                      <div className="idea-item">
                        <div className="idea-owner">백선우님 (3개)</div>
                        <ul className="idea-content">
                          <li><strong>인터랙티브 생성형 TV 2차 창작 콘텐츠:</strong> 사용자가 콘텐츠 시청 중 선호하던 부분을 편집하여 2차창작물로 제공</li>
                          <li><strong>사용자 맞춤형 생성형 home ui:</strong> 사용자의 기존 선호도와 취향을 반영한 generative home ui</li>
                          <li><strong>Mass Customization Contents:</strong> 각각의 사용자들에게 맞춤화된 AI 생성형 콘텐츠를 실제 콘텐츠를 보기 전 몰입도를 높이는 initiator로 제공</li>
                        </ul>
                      </div>
                      <div className="idea-item">
                        <div className="idea-owner">송유택님 (2개)</div>
                        <ul className="idea-content">
                          <li><strong>물방울 모양 피어싱:</strong> 여름에 귀에 맺힌 싱그러운 물방울 형태의 쥬얼리 (2개 생성)</li>
                        </ul>
                      </div>
                      <div className="idea-item">
                        <div className="idea-owner">임현정님 (1개)</div>
                        <ul className="idea-content">
                          <li><strong>전체 캠페인 목록 구체화:</strong> 광고가 여러 개 쌓여 있을 때(nested), 캠페인에 쉽게 접근/확인할 수 있다</li>
                        </ul>
                      </div>
                      <div className="idea-item">
                        <div className="idea-owner">서익준님 (1개)</div>
                        <ul className="idea-content">
                          <li><strong>역사 탐방 VR:</strong> 역사에서 중요한 이야기들을 VR로 체험함</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </details>
            </div>

            {/* 에이전트 역할 분석 - 아이디어 평가 */}
            <div className="analysis-section">
              <h3>🔍 에이전트 역할 분석 - 아이디어 평가</h3>
              
              <div className="role-analysis-layout">
                <div className="role-stats-section">
                  <h4>담당 에이전트 통계</h4>
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
                      <div className="stat-value">{analysisData.roles.team1.evaluation.avg}개</div>
                      <div className="stat-value">{analysisData.roles.team1.evaluation.min}개</div>
                      <div className="stat-value">{analysisData.roles.team1.evaluation.max}개</div>
                      <div className="stat-value">{analysisData.roles.team1.evaluation.stdev}</div>
                    </div>
                    <div className="stats-row">
                      <div className="stat-label">두번째 팀</div>
                      <div className="stat-value">{analysisData.roles.team2.evaluation.avg}개</div>
                      <div className="stat-value">{analysisData.roles.team2.evaluation.min}개</div>
                      <div className="stat-value">{analysisData.roles.team2.evaluation.max}개</div>
                      <div className="stat-value">{analysisData.roles.team2.evaluation.stdev}</div>
                    </div>
                    <div className="stats-row">
                      <div className="stat-label">세번째 팀</div>
                      <div className="stat-value">{analysisData.roles.team3.evaluation.avg}개</div>
                      <div className="stat-value">{analysisData.roles.team3.evaluation.min}개</div>
                      <div className="stat-value">{analysisData.roles.team3.evaluation.max}개</div>
                      <div className="stat-value">{analysisData.roles.team3.evaluation.stdev}</div>
                    </div>
                    <div className="stats-row total-row">
                      <div className="stat-label">전체</div>
                      <div className="stat-value">{analysisData.roles.total.evaluation.avg}개</div>
                      <div className="stat-value">{analysisData.roles.total.evaluation.min}개</div>
                      <div className="stat-value">{analysisData.roles.total.evaluation.max}개</div>
                      <div className="stat-value">{analysisData.roles.total.evaluation.stdev}</div>
                    </div>
                  </div>
                </div>
                <div className="role-performance-section">
                  <h4>해당 역할을 맡은 에이전트가 수행한 평가량</h4>
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
                      <div className="stat-value">{analysisData.evaluationPerAgent?.team1?.avg || '0.00'}개</div>
                      <div className="stat-value">{analysisData.evaluationPerAgent?.team1?.min || '0.00'}개</div>
                      <div className="stat-value">{analysisData.evaluationPerAgent?.team1?.max || '0.00'}개</div>
                      <div className="stat-value">{analysisData.evaluationPerAgent?.team1?.stdev || '0.00'}</div>
                    </div>
                    <div className="stats-row">
                      <div className="stat-label">두번째 팀</div>
                      <div className="stat-value">{analysisData.evaluationPerAgent?.team2?.avg || '0.00'}개</div>
                      <div className="stat-value">{analysisData.evaluationPerAgent?.team2?.min || '0.00'}개</div>
                      <div className="stat-value">{analysisData.evaluationPerAgent?.team2?.max || '0.00'}개</div>
                      <div className="stat-value">{analysisData.evaluationPerAgent?.team2?.stdev || '0.00'}</div>
                    </div>
                    <div className="stats-row">
                      <div className="stat-label">세번째 팀</div>
                      <div className="stat-value">{analysisData.evaluationPerAgent?.team3?.avg || '0.00'}개</div>
                      <div className="stat-value">{analysisData.evaluationPerAgent?.team3?.min || '0.00'}개</div>
                      <div className="stat-value">{analysisData.evaluationPerAgent?.team3?.max || '0.00'}개</div>
                      <div className="stat-value">{analysisData.evaluationPerAgent?.team3?.stdev || '0.00'}</div>
                    </div>
                    <div className="stats-row total-row">
                      <div className="stat-label">전체</div>
                      <div className="stat-value">{analysisData.evaluationPerAgent?.total?.avg || '0.00'}개</div>
                      <div className="stat-value">{analysisData.evaluationPerAgent?.total?.min || '0.00'}개</div>
                      <div className="stat-value">{analysisData.evaluationPerAgent?.total?.max || '0.00'}개</div>
                      <div className="stat-value">{analysisData.evaluationPerAgent?.total?.stdev || '0.00'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 사용자 평가 분석 */}
            <div className="analysis-section">
              <h3>👤 사용자 평가 분석</h3>
              
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
                  <div className="stat-value">{analysisData.userEvaluations.team1.avg}개</div>
                  <div className="stat-value">{analysisData.userEvaluations.team1.min}개</div>
                  <div className="stat-value">{analysisData.userEvaluations.team1.max}개</div>
                  <div className="stat-value">{analysisData.userEvaluations.team1.stdev}</div>
                </div>
                <div className="stats-row">
                  <div className="stat-label">두번째 팀</div>
                  <div className="stat-value">{analysisData.userEvaluations.team2.avg}개</div>
                  <div className="stat-value">{analysisData.userEvaluations.team2.min}개</div>
                  <div className="stat-value">{analysisData.userEvaluations.team2.max}개</div>
                  <div className="stat-value">{analysisData.userEvaluations.team2.stdev}</div>
                </div>
                <div className="stats-row">
                  <div className="stat-label">세번째 팀</div>
                  <div className="stat-value">{analysisData.userEvaluations.team3.avg}개</div>
                  <div className="stat-value">{analysisData.userEvaluations.team3.min}개</div>
                  <div className="stat-value">{analysisData.userEvaluations.team3.max}개</div>
                  <div className="stat-value">{analysisData.userEvaluations.team3.stdev}</div>
                </div>
                <div className="stats-row total-row">
                  <div className="stat-label">전체</div>
                  <div className="stat-value">{analysisData.userEvaluations.total.avg}개</div>
                  <div className="stat-value">{analysisData.userEvaluations.total.min}개</div>
                  <div className="stat-value">{analysisData.userEvaluations.total.max}개</div>
                  <div className="stat-value">{analysisData.userEvaluations.total.stdev}</div>
                </div>
              </div>
              
              <details className="user-role-details">
                <summary>🔍 상세 평가 역할 분석 보기</summary>
                <div className="user-role-analysis">
                  <div className="role-summary">
                    <p><strong>평가 역할을 맡은 팀:</strong> 분석 중...</p>
                    <div className="role-breakdown">
                      <div className="role-stat">✅ 역할도 있고 실제로도 평가: 분석 중</div>
                      <div className="role-stat">❌ 역할은 있지만 평가하지 않음: 분석 중</div>
                      <div className="role-stat">📊 역할은 없지만 평가함: 분석 중</div>
                    </div>
                  </div>
                  
                  <div className="role-details">
                    <h5>사용자 평가 활동 상세 분석</h5>
                    <p>현재 평가 데이터를 분석하여 상세한 역할별 통계를 준비 중입니다.</p>
                  </div>
                </div>
              </details>
            </div>

            {/* 에이전트 역할 분석 - 피드백 */}
            <div className="analysis-section">
              <h3>💭 에이전트 역할 분석 - 피드백</h3>
              
              <div className="role-analysis-layout">
                <div className="role-stats-section">
                  <h4>담당 에이전트 통계</h4>
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
                      <div className="stat-value">{analysisData.roles.team1.feedback.avg}개</div>
                      <div className="stat-value">{analysisData.roles.team1.feedback.min}개</div>
                      <div className="stat-value">{analysisData.roles.team1.feedback.max}개</div>
                      <div className="stat-value">{analysisData.roles.team1.feedback.stdev}</div>
                    </div>
                    <div className="stats-row">
                      <div className="stat-label">두번째 팀</div>
                      <div className="stat-value">{analysisData.roles.team2.feedback.avg}개</div>
                      <div className="stat-value">{analysisData.roles.team2.feedback.min}개</div>
                      <div className="stat-value">{analysisData.roles.team2.feedback.max}개</div>
                      <div className="stat-value">{analysisData.roles.team2.feedback.stdev}</div>
                    </div>
                    <div className="stats-row">
                      <div className="stat-label">세번째 팀</div>
                      <div className="stat-value">{analysisData.roles.team3.feedback.avg}개</div>
                      <div className="stat-value">{analysisData.roles.team3.feedback.min}개</div>
                      <div className="stat-value">{analysisData.roles.team3.feedback.max}개</div>
                      <div className="stat-value">{analysisData.roles.team3.feedback.stdev}</div>
                    </div>
                    <div className="stats-row total-row">
                      <div className="stat-label">전체</div>
                      <div className="stat-value">{analysisData.roles.total.feedback.avg}개</div>
                      <div className="stat-value">{analysisData.roles.total.feedback.min}개</div>
                      <div className="stat-value">{analysisData.roles.total.feedback.max}개</div>
                      <div className="stat-value">{analysisData.roles.total.feedback.stdev}</div>
                    </div>
                  </div>
                </div>
                <div className="role-performance-section">
                  <h4>해당 역할을 맡은 에이전트가 수행한 피드백량</h4>
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
                      <div className="stat-value">{analysisData.feedbackPerAgent?.team1?.avg || '0.00'}개</div>
                      <div className="stat-value">{analysisData.feedbackPerAgent?.team1?.min || '0.00'}개</div>
                      <div className="stat-value">{analysisData.feedbackPerAgent?.team1?.max || '0.00'}개</div>
                      <div className="stat-value">{analysisData.feedbackPerAgent?.team1?.stdev || '0.00'}</div>
                    </div>
                    <div className="stats-row">
                      <div className="stat-label">두번째 팀</div>
                      <div className="stat-value">{analysisData.feedbackPerAgent?.team2?.avg || '0.00'}개</div>
                      <div className="stat-value">{analysisData.feedbackPerAgent?.team2?.min || '0.00'}개</div>
                      <div className="stat-value">{analysisData.feedbackPerAgent?.team2?.max || '0.00'}개</div>
                      <div className="stat-value">{analysisData.feedbackPerAgent?.team2?.stdev || '0.00'}</div>
                    </div>
                    <div className="stats-row">
                      <div className="stat-label">세번째 팀</div>
                      <div className="stat-value">{analysisData.feedbackPerAgent?.team3?.avg || '0.00'}개</div>
                      <div className="stat-value">{analysisData.feedbackPerAgent?.team3?.min || '0.00'}개</div>
                      <div className="stat-value">{analysisData.feedbackPerAgent?.team3?.max || '0.00'}개</div>
                      <div className="stat-value">{analysisData.feedbackPerAgent?.team3?.stdev || '0.00'}</div>
                    </div>
                    <div className="stats-row total-row">
                      <div className="stat-label">전체</div>
                      <div className="stat-value">{analysisData.feedbackPerAgent?.total?.avg || '0.00'}개</div>
                      <div className="stat-value">{analysisData.feedbackPerAgent?.total?.min || '0.00'}개</div>
                      <div className="stat-value">{analysisData.feedbackPerAgent?.total?.max || '0.00'}개</div>
                      <div className="stat-value">{analysisData.feedbackPerAgent?.total?.stdev || '0.00'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 사용자 피드백 분석 */}
            <div className="analysis-section">
              <h3>👤 사용자 피드백 분석</h3>
              
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
                  <div className="stat-value">{analysisData.userFeedback.team1.avg}개</div>
                  <div className="stat-value">{analysisData.userFeedback.team1.min}개</div>
                  <div className="stat-value">{analysisData.userFeedback.team1.max}개</div>
                  <div className="stat-value">{analysisData.userFeedback.team1.stdev}</div>
                </div>
                <div className="stats-row">
                  <div className="stat-label">두번째 팀</div>
                  <div className="stat-value">{analysisData.userFeedback.team2.avg}개</div>
                  <div className="stat-value">{analysisData.userFeedback.team2.min}개</div>
                  <div className="stat-value">{analysisData.userFeedback.team2.max}개</div>
                  <div className="stat-value">{analysisData.userFeedback.team2.stdev}</div>
                </div>
                <div className="stats-row">
                  <div className="stat-label">세번째 팀</div>
                  <div className="stat-value">{analysisData.userFeedback.team3.avg}개</div>
                  <div className="stat-value">{analysisData.userFeedback.team3.min}개</div>
                  <div className="stat-value">{analysisData.userFeedback.team3.max}개</div>
                  <div className="stat-value">{analysisData.userFeedback.team3.stdev}</div>
                </div>
                <div className="stats-row total-row">
                  <div className="stat-label">전체</div>
                  <div className="stat-value">{analysisData.userFeedback.total.avg}개</div>
                  <div className="stat-value">{analysisData.userFeedback.total.min}개</div>
                  <div className="stat-value">{analysisData.userFeedback.total.max}개</div>
                  <div className="stat-value">{analysisData.userFeedback.total.stdev}</div>
                </div>
              </div>
              
              <details className="user-role-details">
                <summary>🔍 상세 피드백 역할 분석 보기</summary>
                <div className="user-role-analysis">
                  <div className="role-summary">
                    <p><strong>피드백 역할을 맡은 팀:</strong> 분석 중...</p>
                    <div className="role-breakdown">
                      <div className="role-stat">✅ 역할도 있고 실제로도 피드백: 분석 중</div>
                      <div className="role-stat">❌ 역할은 있지만 피드백하지 않음: 분석 중</div>
                      <div className="role-stat">📊 역할은 없지만 피드백함: 분석 중</div>
                    </div>
                  </div>
                  
                  <div className="role-details">
                    <h5>사용자 피드백 활동 상세 분석</h5>
                    <p>현재 피드백 데이터를 분석하여 상세한 역할별 통계를 준비 중입니다.</p>
                  </div>
                </div>
              </details>
            </div>

            {/* 에이전트 역할 분석 - 요청 */}
            <div className="analysis-section">
              <h3>📋 에이전트 역할 분석 - 요청</h3>
              
              <div className="role-analysis-layout">
                <div className="role-stats-section">
                  <h4>담당 에이전트 통계</h4>
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
                      <div className="stat-value">{analysisData.roles.team1.request.avg}개</div>
                      <div className="stat-value">{analysisData.roles.team1.request.min}개</div>
                      <div className="stat-value">{analysisData.roles.team1.request.max}개</div>
                      <div className="stat-value">{analysisData.roles.team1.request.stdev}</div>
                    </div>
                    <div className="stats-row">
                      <div className="stat-label">두번째 팀</div>
                      <div className="stat-value">{analysisData.roles.team2.request.avg}개</div>
                      <div className="stat-value">{analysisData.roles.team2.request.min}개</div>
                      <div className="stat-value">{analysisData.roles.team2.request.max}개</div>
                      <div className="stat-value">{analysisData.roles.team2.request.stdev}</div>
                    </div>
                    <div className="stats-row">
                      <div className="stat-label">세번째 팀</div>
                      <div className="stat-value">{analysisData.roles.team3.request.avg}개</div>
                      <div className="stat-value">{analysisData.roles.team3.request.min}개</div>
                      <div className="stat-value">{analysisData.roles.team3.request.max}개</div>
                      <div className="stat-value">{analysisData.roles.team3.request.stdev}</div>
                    </div>
                    <div className="stats-row total-row">
                      <div className="stat-label">전체</div>
                      <div className="stat-value">{analysisData.roles.total.request.avg}개</div>
                      <div className="stat-value">{analysisData.roles.total.request.min}개</div>
                      <div className="stat-value">{analysisData.roles.total.request.max}개</div>
                      <div className="stat-value">{analysisData.roles.total.request.stdev}</div>
                    </div>
                  </div>
                </div>
                <div className="role-performance-section">
                  <h4>해당 역할을 맡은 에이전트가 수행한 요청량</h4>
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
                      <div className="stat-value">{analysisData.requestPerAgent?.team1?.avg || '0.00'}개</div>
                      <div className="stat-value">{analysisData.requestPerAgent?.team1?.min || '0.00'}개</div>
                      <div className="stat-value">{analysisData.requestPerAgent?.team1?.max || '0.00'}개</div>
                      <div className="stat-value">{analysisData.requestPerAgent?.team1?.stdev || '0.00'}</div>
                    </div>
                    <div className="stats-row">
                      <div className="stat-label">두번째 팀</div>
                      <div className="stat-value">{analysisData.requestPerAgent?.team2?.avg || '0.00'}개</div>
                      <div className="stat-value">{analysisData.requestPerAgent?.team2?.min || '0.00'}개</div>
                      <div className="stat-value">{analysisData.requestPerAgent?.team2?.max || '0.00'}개</div>
                      <div className="stat-value">{analysisData.requestPerAgent?.team2?.stdev || '0.00'}</div>
                    </div>
                    <div className="stats-row">
                      <div className="stat-label">세번째 팀</div>
                      <div className="stat-value">{analysisData.requestPerAgent?.team3?.avg || '0.00'}개</div>
                      <div className="stat-value">{analysisData.requestPerAgent?.team3?.min || '0.00'}개</div>
                      <div className="stat-value">{analysisData.requestPerAgent?.team3?.max || '0.00'}개</div>
                      <div className="stat-value">{analysisData.requestPerAgent?.team3?.stdev || '0.00'}</div>
                    </div>
                    <div className="stats-row total-row">
                      <div className="stat-label">전체</div>
                      <div className="stat-value">{analysisData.requestPerAgent?.total?.avg || '0.00'}개</div>
                      <div className="stat-value">{analysisData.requestPerAgent?.total?.min || '0.00'}개</div>
                      <div className="stat-value">{analysisData.requestPerAgent?.total?.max || '0.00'}개</div>
                      <div className="stat-value">{analysisData.requestPerAgent?.total?.stdev || '0.00'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 사용자 요청 분석 */}
            <div className="analysis-section">
              <h3>👤 사용자 요청 분석</h3>
              
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
                  <div className="stat-value">{analysisData.userRequests.team1.avg}개</div>
                  <div className="stat-value">{analysisData.userRequests.team1.min}개</div>
                  <div className="stat-value">{analysisData.userRequests.team1.max}개</div>
                  <div className="stat-value">{analysisData.userRequests.team1.stdev}</div>
                </div>
                <div className="stats-row">
                  <div className="stat-label">두번째 팀</div>
                  <div className="stat-value">{analysisData.userRequests.team2.avg}개</div>
                  <div className="stat-value">{analysisData.userRequests.team2.min}개</div>
                  <div className="stat-value">{analysisData.userRequests.team2.max}개</div>
                  <div className="stat-value">{analysisData.userRequests.team2.stdev}</div>
                </div>
                <div className="stats-row">
                  <div className="stat-label">세번째 팀</div>
                  <div className="stat-value">{analysisData.userRequests.team3.avg}개</div>
                  <div className="stat-value">{analysisData.userRequests.team3.min}개</div>
                  <div className="stat-value">{analysisData.userRequests.team3.max}개</div>
                  <div className="stat-value">{analysisData.userRequests.team3.stdev}</div>
                </div>
                <div className="stats-row total-row">
                  <div className="stat-label">전체</div>
                  <div className="stat-value">{analysisData.userRequests.total.avg}개</div>
                  <div className="stat-value">{analysisData.userRequests.total.min}개</div>
                  <div className="stat-value">{analysisData.userRequests.total.max}개</div>
                  <div className="stat-value">{analysisData.userRequests.total.stdev}</div>
                </div>
              </div>
              
              <details className="user-role-details">
                <summary>🔍 상세 요청 역할 분석 보기</summary>
                <div className="user-role-analysis">
                  <div className="role-summary">
                    <p><strong>요청 역할을 맡은 팀:</strong> 분석 중...</p>
                    <div className="role-breakdown">
                      <div className="role-stat">✅ 역할도 있고 실제로도 요청: 분석 중</div>
                      <div className="role-stat">❌ 역할은 있지만 요청하지 않음: 분석 중</div>
                      <div className="role-stat">📊 역할은 없지만 요청함: 분석 중</div>
                    </div>
                  </div>
                  
                  <div className="role-details">
                    <h5>사용자 요청 활동 상세 분석</h5>
                    <p>현재 요청 데이터를 분석하여 상세한 역할별 통계를 준비 중입니다.</p>
                  </div>
                </div>
              </details>
            </div>

            {/* AI agent 및 사용자별 평균 역할 수 분석 */}
            <div className="analysis-section">
              <h3>👥 전체, AI Agent 및 사용자별 평균 역할 수 분석</h3>
              <div className="role-assignment-analysis">
                <div className="role-stats-grid">
                  <div className="role-stats-section">
                    <h4>👥 전체 평균 역할 수 (AI + 사용자)</h4>
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
                        <div className="stat-value">{analysisData.totalRoles.team1.avg}개</div>
                        <div className="stat-value">{analysisData.totalRoles.team1.min}개</div>
                        <div className="stat-value">{analysisData.totalRoles.team1.max}개</div>
                        <div className="stat-value">{analysisData.totalRoles.team1.stdev}</div>
                      </div>
                      <div className="stats-row">
                        <div className="stat-label">두번째 팀</div>
                        <div className="stat-value">{analysisData.totalRoles.team2.avg}개</div>
                        <div className="stat-value">{analysisData.totalRoles.team2.min}개</div>
                        <div className="stat-value">{analysisData.totalRoles.team2.max}개</div>
                        <div className="stat-value">{analysisData.totalRoles.team2.stdev}</div>
                      </div>
                      <div className="stats-row">
                        <div className="stat-label">세번째 팀</div>
                        <div className="stat-value">{analysisData.totalRoles.team3.avg}개</div>
                        <div className="stat-value">{analysisData.totalRoles.team3.min}개</div>
                        <div className="stat-value">{analysisData.totalRoles.team3.max}개</div>
                        <div className="stat-value">{analysisData.totalRoles.team3.stdev}</div>
                      </div>
                      <div className="stats-row total-row">
                        <div className="stat-label">전체</div>
                        <div className="stat-value">{analysisData.totalRoles.total.avg}개</div>
                        <div className="stat-value">{analysisData.totalRoles.total.min}개</div>
                        <div className="stat-value">{analysisData.totalRoles.total.max}개</div>
                        <div className="stat-value">{analysisData.totalRoles.total.stdev}</div>
                      </div>
                    </div>
                  </div>

                  <div className="role-stats-section">
                    <h4>🤖 AI Agent 평균 역할 수</h4>
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
                        <div className="stat-value">{analysisData.agentRoles.team1.avg}개</div>
                        <div className="stat-value">{analysisData.agentRoles.team1.min}개</div>
                        <div className="stat-value">{analysisData.agentRoles.team1.max}개</div>
                        <div className="stat-value">{analysisData.agentRoles.team1.stdev}</div>
                      </div>
                      <div className="stats-row">
                        <div className="stat-label">두번째 팀</div>
                        <div className="stat-value">{analysisData.agentRoles.team2.avg}개</div>
                        <div className="stat-value">{analysisData.agentRoles.team2.min}개</div>
                        <div className="stat-value">{analysisData.agentRoles.team2.max}개</div>
                        <div className="stat-value">{analysisData.agentRoles.team2.stdev}</div>
                      </div>
                      <div className="stats-row">
                        <div className="stat-label">세번째 팀</div>
                        <div className="stat-value">{analysisData.agentRoles.team3.avg}개</div>
                        <div className="stat-value">{analysisData.agentRoles.team3.min}개</div>
                        <div className="stat-value">{analysisData.agentRoles.team3.max}개</div>
                        <div className="stat-value">{analysisData.agentRoles.team3.stdev}</div>
                      </div>
                      <div className="stats-row total-row">
                        <div className="stat-label">전체</div>
                        <div className="stat-value">{analysisData.agentRoles.total.avg}개</div>
                        <div className="stat-value">{analysisData.agentRoles.total.min}개</div>
                        <div className="stat-value">{analysisData.agentRoles.total.max}개</div>
                        <div className="stat-value">{analysisData.agentRoles.total.stdev}</div>
                      </div>
                    </div>
                  </div>

                  <div className="role-stats-section">
                    <h4>👤 사용자 평균 역할 수</h4>
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
                        <div className="stat-value">{analysisData.userRoles.team1.avg}개</div>
                        <div className="stat-value">{analysisData.userRoles.team1.min}개</div>
                        <div className="stat-value">{analysisData.userRoles.team1.max}개</div>
                        <div className="stat-value">{analysisData.userRoles.team1.stdev}</div>
                      </div>
                      <div className="stats-row">
                        <div className="stat-label">두번째 팀</div>
                        <div className="stat-value">{analysisData.userRoles.team2.avg}개</div>
                        <div className="stat-value">{analysisData.userRoles.team2.min}개</div>
                        <div className="stat-value">{analysisData.userRoles.team2.max}개</div>
                        <div className="stat-value">{analysisData.userRoles.team2.stdev}</div>
                      </div>
                      <div className="stats-row">
                        <div className="stat-label">세번째 팀</div>
                        <div className="stat-value">{analysisData.userRoles.team3.avg}개</div>
                        <div className="stat-value">{analysisData.userRoles.team3.min}개</div>
                        <div className="stat-value">{analysisData.userRoles.team3.max}개</div>
                        <div className="stat-value">{analysisData.userRoles.team3.stdev}</div>
                      </div>
                      <div className="stats-row total-row">
                        <div className="stat-label">전체</div>
                        <div className="stat-value">{analysisData.userRoles.total.avg}개</div>
                        <div className="stat-value">{analysisData.userRoles.total.min}개</div>
                        <div className="stat-value">{analysisData.userRoles.total.max}개</div>
                        <div className="stat-value">{analysisData.userRoles.total.stdev}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 역할 분포 시각화 - 스택 바 차트 */}
            <div className="analysis-section role-distribution-section">
              <h3>📊 역할 분포 비율 (스택 바 차트)</h3>
              
              <div className="stacked-chart-container">
                {/* 전체 (AI + 사용자) */}
                <div className="stacked-chart-group">
                  <h4>👥 전체 (AI + 사용자)</h4>
                  <div className="stacked-chart-sections">
                    <div className="stacked-chart-item">
                      <div className="stacked-chart-label">Team 1</div>
                      <div className="stacked-bar">
                        <div className="stacked-segment generation" style={{width: `${analysisData.rolePercentages.team1.total.generation}%`}} title={`생성: ${analysisData.rolePercentages.team1.total.generation}%`}>
                          {analysisData.rolePercentages.team1.total.generation > 10 ? `${analysisData.rolePercentages.team1.total.generation}%` : ''}
                        </div>
                        <div className="stacked-segment evaluation" style={{width: `${analysisData.rolePercentages.team1.total.evaluation}%`}} title={`평가: ${analysisData.rolePercentages.team1.total.evaluation}%`}>
                          {analysisData.rolePercentages.team1.total.evaluation > 10 ? `${analysisData.rolePercentages.team1.total.evaluation}%` : ''}
                        </div>
                        <div className="stacked-segment feedback" style={{width: `${analysisData.rolePercentages.team1.total.feedback}%`}} title={`피드백: ${analysisData.rolePercentages.team1.total.feedback}%`}>
                          {analysisData.rolePercentages.team1.total.feedback > 10 ? `${analysisData.rolePercentages.team1.total.feedback}%` : ''}
                        </div>
                        <div className="stacked-segment request" style={{width: `${analysisData.rolePercentages.team1.total.request}%`}} title={`요청: ${analysisData.rolePercentages.team1.total.request}%`}>
                          {analysisData.rolePercentages.team1.total.request > 10 ? `${analysisData.rolePercentages.team1.total.request}%` : ''}
                        </div>
                      </div>
                      <div className="role-assignment-rates">
                        <small>담당률: 생성 {analysisData.roleAssignmentRates.total.generation} | 평가 {analysisData.roleAssignmentRates.total.evaluation} | 피드백 {analysisData.roleAssignmentRates.total.feedback} | 요청 {analysisData.roleAssignmentRates.total.request}</small>
                      </div>
                    </div>
                    <div className="stacked-chart-item">
                      <div className="stacked-chart-label">Team 2</div>
                      <div className="stacked-bar">
                        <div className="stacked-segment generation" style={{width: `${analysisData.rolePercentages.team2.total.generation}%`}} title={`생성: ${analysisData.rolePercentages.team2.total.generation}%`}>
                          {analysisData.rolePercentages.team2.total.generation > 10 ? `${analysisData.rolePercentages.team2.total.generation}%` : ''}
                        </div>
                        <div className="stacked-segment evaluation" style={{width: `${analysisData.rolePercentages.team2.total.evaluation}%`}} title={`평가: ${analysisData.rolePercentages.team2.total.evaluation}%`}>
                          {analysisData.rolePercentages.team2.total.evaluation > 10 ? `${analysisData.rolePercentages.team2.total.evaluation}%` : ''}
                        </div>
                        <div className="stacked-segment feedback" style={{width: `${analysisData.rolePercentages.team2.total.feedback}%`}} title={`피드백: ${analysisData.rolePercentages.team2.total.feedback}%`}>
                          {analysisData.rolePercentages.team2.total.feedback > 10 ? `${analysisData.rolePercentages.team2.total.feedback}%` : ''}
                        </div>
                        <div className="stacked-segment request" style={{width: `${analysisData.rolePercentages.team2.total.request}%`}} title={`요청: ${analysisData.rolePercentages.team2.total.request}%`}>
                          {analysisData.rolePercentages.team2.total.request > 10 ? `${analysisData.rolePercentages.team2.total.request}%` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="stacked-chart-item">
                      <div className="stacked-chart-label">Team 3</div>
                      <div className="stacked-bar">
                        <div className="stacked-segment generation" style={{width: `${analysisData.rolePercentages.team3.total.generation}%`}} title={`생성: ${analysisData.rolePercentages.team3.total.generation}%`}>
                          {analysisData.rolePercentages.team3.total.generation > 10 ? `${analysisData.rolePercentages.team3.total.generation}%` : ''}
                        </div>
                        <div className="stacked-segment evaluation" style={{width: `${analysisData.rolePercentages.team3.total.evaluation}%`}} title={`평가: ${analysisData.rolePercentages.team3.total.evaluation}%`}>
                          {analysisData.rolePercentages.team3.total.evaluation > 10 ? `${analysisData.rolePercentages.team3.total.evaluation}%` : ''}
                        </div>
                        <div className="stacked-segment feedback" style={{width: `${analysisData.rolePercentages.team3.total.feedback}%`}} title={`피드백: ${analysisData.rolePercentages.team3.total.feedback}%`}>
                          {analysisData.rolePercentages.team3.total.feedback > 10 ? `${analysisData.rolePercentages.team3.total.feedback}%` : ''}
                        </div>
                        <div className="stacked-segment request" style={{width: `${analysisData.rolePercentages.team3.total.request}%`}} title={`요청: ${analysisData.rolePercentages.team3.total.request}%`}>
                          {analysisData.rolePercentages.team3.total.request > 10 ? `${analysisData.rolePercentages.team3.total.request}%` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="stacked-chart-item">
                      <div className="stacked-chart-label">Total</div>
                      <div className="stacked-bar">
                        <div className="stacked-segment generation" style={{width: `${analysisData.rolePercentages.total.total.generation}%`}} title={`생성: ${analysisData.rolePercentages.total.total.generation}%`}>
                          {parseFloat(analysisData.rolePercentages.total.total.generation) > 10 ? `${analysisData.rolePercentages.total.total.generation}%` : ''}
                        </div>
                        <div className="stacked-segment evaluation" style={{width: `${analysisData.rolePercentages.total.total.evaluation}%`}} title={`평가: ${analysisData.rolePercentages.total.total.evaluation}%`}>
                          {parseFloat(analysisData.rolePercentages.total.total.evaluation) > 10 ? `${analysisData.rolePercentages.total.total.evaluation}%` : ''}
                        </div>
                        <div className="stacked-segment feedback" style={{width: `${analysisData.rolePercentages.total.total.feedback}%`}} title={`피드백: ${analysisData.rolePercentages.total.total.feedback}%`}>
                          {parseFloat(analysisData.rolePercentages.total.total.feedback) > 10 ? `${analysisData.rolePercentages.total.total.feedback}%` : ''}
                        </div>
                        <div className="stacked-segment request" style={{width: `${analysisData.rolePercentages.total.total.request}%`}} title={`요청: ${analysisData.rolePercentages.total.total.request}%`}>
                          {parseFloat(analysisData.rolePercentages.total.total.request) > 10 ? `${analysisData.rolePercentages.total.total.request}%` : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* AI 에이전트만 */}
                <div className="stacked-chart-group">
                  <h4>🤖 AI 에이전트만</h4>
                  <div className="stacked-chart-sections">
                    <div className="stacked-chart-item">
                      <div className="stacked-chart-label">Team 1</div>
                      <div className="stacked-bar">
                        <div className="stacked-segment generation" style={{width: `${analysisData.rolePercentages.team1.agents.generation}%`}} title={`생성: ${analysisData.rolePercentages.team1.agents.generation}%`}>
                          {analysisData.rolePercentages.team1.agents.generation > 10 ? `${analysisData.rolePercentages.team1.agents.generation}%` : ''}
                        </div>
                        <div className="stacked-segment evaluation" style={{width: `${analysisData.rolePercentages.team1.agents.evaluation}%`}} title={`평가: ${analysisData.rolePercentages.team1.agents.evaluation}%`}>
                          {analysisData.rolePercentages.team1.agents.evaluation > 10 ? `${analysisData.rolePercentages.team1.agents.evaluation}%` : ''}
                        </div>
                        <div className="stacked-segment feedback" style={{width: `${analysisData.rolePercentages.team1.agents.feedback}%`}} title={`피드백: ${analysisData.rolePercentages.team1.agents.feedback}%`}>
                          {analysisData.rolePercentages.team1.agents.feedback > 10 ? `${analysisData.rolePercentages.team1.agents.feedback}%` : ''}
                        </div>
                        <div className="stacked-segment request" style={{width: `${analysisData.rolePercentages.team1.agents.request}%`}} title={`요청: ${analysisData.rolePercentages.team1.agents.request}%`}>
                          {analysisData.rolePercentages.team1.agents.request > 10 ? `${analysisData.rolePercentages.team1.agents.request}%` : ''}
                        </div>
                      </div>
                      <div className="role-assignment-rates">
                        <small>담당률: 생성 {analysisData.roleAssignmentRates.agents.generation} | 평가 {analysisData.roleAssignmentRates.agents.evaluation} | 피드백 {analysisData.roleAssignmentRates.agents.feedback} | 요청 {analysisData.roleAssignmentRates.agents.request}</small>
                      </div>
                    </div>
                    <div className="stacked-chart-item">
                      <div className="stacked-chart-label">Team 2</div>
                      <div className="stacked-bar">
                        <div className="stacked-segment generation" style={{width: `${analysisData.rolePercentages.team2.agents.generation}%`}} title={`생성: ${analysisData.rolePercentages.team2.agents.generation}%`}>
                          {analysisData.rolePercentages.team2.agents.generation > 10 ? `${analysisData.rolePercentages.team2.agents.generation}%` : ''}
                        </div>
                        <div className="stacked-segment evaluation" style={{width: `${analysisData.rolePercentages.team2.agents.evaluation}%`}} title={`평가: ${analysisData.rolePercentages.team2.agents.evaluation}%`}>
                          {analysisData.rolePercentages.team2.agents.evaluation > 10 ? `${analysisData.rolePercentages.team2.agents.evaluation}%` : ''}
                        </div>
                        <div className="stacked-segment feedback" style={{width: `${analysisData.rolePercentages.team2.agents.feedback}%`}} title={`피드백: ${analysisData.rolePercentages.team2.agents.feedback}%`}>
                          {analysisData.rolePercentages.team2.agents.feedback > 10 ? `${analysisData.rolePercentages.team2.agents.feedback}%` : ''}
                        </div>
                        <div className="stacked-segment request" style={{width: `${analysisData.rolePercentages.team2.agents.request}%`}} title={`요청: ${analysisData.rolePercentages.team2.agents.request}%`}>
                          {analysisData.rolePercentages.team2.agents.request > 10 ? `${analysisData.rolePercentages.team2.agents.request}%` : ''}
                        </div>
                      </div>
                      <div className="role-assignment-rates">
                        <small>담당률: 생성 {analysisData.roleAssignmentRates.agents.generation} | 평가 {analysisData.roleAssignmentRates.agents.evaluation} | 피드백 {analysisData.roleAssignmentRates.agents.feedback} | 요청 {analysisData.roleAssignmentRates.agents.request}</small>
                      </div>
                    </div>
                    <div className="stacked-chart-item">
                      <div className="stacked-chart-label">Team 3</div>
                      <div className="stacked-bar">
                        <div className="stacked-segment generation" style={{width: `${analysisData.rolePercentages.team3.agents.generation}%`}} title={`생성: ${analysisData.rolePercentages.team3.agents.generation}%`}>
                          {analysisData.rolePercentages.team3.agents.generation > 10 ? `${analysisData.rolePercentages.team3.agents.generation}%` : ''}
                        </div>
                        <div className="stacked-segment evaluation" style={{width: `${analysisData.rolePercentages.team3.agents.evaluation}%`}} title={`평가: ${analysisData.rolePercentages.team3.agents.evaluation}%`}>
                          {analysisData.rolePercentages.team3.agents.evaluation > 10 ? `${analysisData.rolePercentages.team3.agents.evaluation}%` : ''}
                        </div>
                        <div className="stacked-segment feedback" style={{width: `${analysisData.rolePercentages.team3.agents.feedback}%`}} title={`피드백: ${analysisData.rolePercentages.team3.agents.feedback}%`}>
                          {analysisData.rolePercentages.team3.agents.feedback > 10 ? `${analysisData.rolePercentages.team3.agents.feedback}%` : ''}
                        </div>
                        <div className="stacked-segment request" style={{width: `${analysisData.rolePercentages.team3.agents.request}%`}} title={`요청: ${analysisData.rolePercentages.team3.agents.request}%`}>
                          {analysisData.rolePercentages.team3.agents.request > 10 ? `${analysisData.rolePercentages.team3.agents.request}%` : ''}
                        </div>
                      </div>
                      <div className="role-assignment-rates">
                        <small>담당률: 생성 {analysisData.roleAssignmentRates.agents.generation} | 평가 {analysisData.roleAssignmentRates.agents.evaluation} | 피드백 {analysisData.roleAssignmentRates.agents.feedback} | 요청 {analysisData.roleAssignmentRates.agents.request}</small>
                      </div>
                    </div>
                    <div className="stacked-chart-item">
                      <div className="stacked-chart-label">Total</div>
                      <div className="stacked-bar">
                        <div className="stacked-segment generation" style={{width: `${analysisData.rolePercentages.total.agents.generation}%`}} title={`생성: ${analysisData.rolePercentages.total.agents.generation}%`}>
                          {analysisData.rolePercentages.total.agents.generation > 10 ? `${analysisData.rolePercentages.total.agents.generation}%` : ''}
                        </div>
                        <div className="stacked-segment evaluation" style={{width: `${analysisData.rolePercentages.total.agents.evaluation}%`}} title={`평가: ${analysisData.rolePercentages.total.agents.evaluation}%`}>
                          {analysisData.rolePercentages.total.agents.evaluation > 10 ? `${analysisData.rolePercentages.total.agents.evaluation}%` : ''}
                        </div>
                        <div className="stacked-segment feedback" style={{width: `${analysisData.rolePercentages.total.agents.feedback}%`}} title={`피드백: ${analysisData.rolePercentages.total.agents.feedback}%`}>
                          {analysisData.rolePercentages.total.agents.feedback > 10 ? `${analysisData.rolePercentages.total.agents.feedback}%` : ''}
                        </div>
                        <div className="stacked-segment request" style={{width: `${analysisData.rolePercentages.total.agents.request}%`}} title={`요청: ${analysisData.rolePercentages.total.agents.request}%`}>
                          {analysisData.rolePercentages.total.agents.request > 10 ? `${analysisData.rolePercentages.total.agents.request}%` : ''}
                        </div>
                      </div>
                      <div className="role-assignment-rates">
                        <small>담당률: 생성 {analysisData.roleAssignmentRates.agents.generation} | 평가 {analysisData.roleAssignmentRates.agents.evaluation} | 피드백 {analysisData.roleAssignmentRates.agents.feedback} | 요청 {analysisData.roleAssignmentRates.agents.request}</small>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 사용자만 */}
                <div className="stacked-chart-group">
                  <h4>👤 사용자만</h4>
                  <div className="stacked-chart-sections">
                    <div className="stacked-chart-item">
                      <div className="stacked-chart-label">Team 1</div>
                      <div className="stacked-bar">
                        <div className="stacked-segment generation" style={{width: `${analysisData.rolePercentages.team1.users.generation}%`}} title={`생성: ${analysisData.rolePercentages.team1.users.generation}%`}>
                          {analysisData.rolePercentages.team1.users.generation > 10 ? `${analysisData.rolePercentages.team1.users.generation}%` : ''}
                        </div>
                        <div className="stacked-segment evaluation" style={{width: `${analysisData.rolePercentages.team1.users.evaluation}%`}} title={`평가: ${analysisData.rolePercentages.team1.users.evaluation}%`}>
                          {analysisData.rolePercentages.team1.users.evaluation > 10 ? `${analysisData.rolePercentages.team1.users.evaluation}%` : ''}
                        </div>
                        <div className="stacked-segment feedback" style={{width: `${analysisData.rolePercentages.team1.users.feedback}%`}} title={`피드백: ${analysisData.rolePercentages.team1.users.feedback}%`}>
                          {analysisData.rolePercentages.team1.users.feedback > 10 ? `${analysisData.rolePercentages.team1.users.feedback}%` : ''}
                        </div>
                        <div className="stacked-segment request" style={{width: `${analysisData.rolePercentages.team1.users.request}%`}} title={`요청: ${analysisData.rolePercentages.team1.users.request}%`}>
                          {analysisData.rolePercentages.team1.users.request > 10 ? `${analysisData.rolePercentages.team1.users.request}%` : ''}
                        </div>
                      </div>
                      <div className="role-assignment-rates">
                        <small>담당률: 생성 {analysisData.roleAssignmentRates.users.generation} | 평가 {analysisData.roleAssignmentRates.users.evaluation} | 피드백 {analysisData.roleAssignmentRates.users.feedback} | 요청 {analysisData.roleAssignmentRates.users.request}</small>
                      </div>
                    </div>
                    <div className="stacked-chart-item">
                      <div className="stacked-chart-label">Team 2</div>
                      <div className="stacked-bar">
                        <div className="stacked-segment generation" style={{width: `${analysisData.rolePercentages.team2.users.generation}%`}} title={`생성: ${analysisData.rolePercentages.team2.users.generation}%`}>
                          {analysisData.rolePercentages.team2.users.generation > 10 ? `${analysisData.rolePercentages.team2.users.generation}%` : ''}
                        </div>
                        <div className="stacked-segment evaluation" style={{width: `${analysisData.rolePercentages.team2.users.evaluation}%`}} title={`평가: ${analysisData.rolePercentages.team2.users.evaluation}%`}>
                          {analysisData.rolePercentages.team2.users.evaluation > 10 ? `${analysisData.rolePercentages.team2.users.evaluation}%` : ''}
                        </div>
                        <div className="stacked-segment feedback" style={{width: `${analysisData.rolePercentages.team2.users.feedback}%`}} title={`피드백: ${analysisData.rolePercentages.team2.users.feedback}%`}>
                          {analysisData.rolePercentages.team2.users.feedback > 10 ? `${analysisData.rolePercentages.team2.users.feedback}%` : ''}
                        </div>
                        <div className="stacked-segment request" style={{width: `${analysisData.rolePercentages.team2.users.request}%`}} title={`요청: ${analysisData.rolePercentages.team2.users.request}%`}>
                          {analysisData.rolePercentages.team2.users.request > 10 ? `${analysisData.rolePercentages.team2.users.request}%` : ''}
                        </div>
                      </div>
                      <div className="role-assignment-rates">
                        <small>담당률: 생성 {analysisData.roleAssignmentRates.users.generation} | 평가 {analysisData.roleAssignmentRates.users.evaluation} | 피드백 {analysisData.roleAssignmentRates.users.feedback} | 요청 {analysisData.roleAssignmentRates.users.request}</small>
                      </div>
                    </div>
                    <div className="stacked-chart-item">
                      <div className="stacked-chart-label">Team 3</div>
                      <div className="stacked-bar">
                        <div className="stacked-segment generation" style={{width: `${analysisData.rolePercentages.team3.users.generation}%`}} title={`생성: ${analysisData.rolePercentages.team3.users.generation}%`}>
                          {analysisData.rolePercentages.team3.users.generation > 10 ? `${analysisData.rolePercentages.team3.users.generation}%` : ''}
                        </div>
                        <div className="stacked-segment evaluation" style={{width: `${analysisData.rolePercentages.team3.users.evaluation}%`}} title={`평가: ${analysisData.rolePercentages.team3.users.evaluation}%`}>
                          {analysisData.rolePercentages.team3.users.evaluation > 10 ? `${analysisData.rolePercentages.team3.users.evaluation}%` : ''}
                        </div>
                        <div className="stacked-segment feedback" style={{width: `${analysisData.rolePercentages.team3.users.feedback}%`}} title={`피드백: ${analysisData.rolePercentages.team3.users.feedback}%`}>
                          {analysisData.rolePercentages.team3.users.feedback > 10 ? `${analysisData.rolePercentages.team3.users.feedback}%` : ''}
                        </div>
                        <div className="stacked-segment request" style={{width: `${analysisData.rolePercentages.team3.users.request}%`}} title={`요청: ${analysisData.rolePercentages.team3.users.request}%`}>
                          {analysisData.rolePercentages.team3.users.request > 10 ? `${analysisData.rolePercentages.team3.users.request}%` : ''}
                        </div>
                      </div>
                      <div className="role-assignment-rates">
                        <small>담당률: 생성 {analysisData.roleAssignmentRates.users.generation} | 평가 {analysisData.roleAssignmentRates.users.evaluation} | 피드백 {analysisData.roleAssignmentRates.users.feedback} | 요청 {analysisData.roleAssignmentRates.users.request}</small>
                      </div>
                    </div>
                    <div className="stacked-chart-item">
                      <div className="stacked-chart-label">Total</div>
                      <div className="stacked-bar">
                        <div className="stacked-segment generation" style={{width: `${analysisData.rolePercentages.total.users.generation}%`}} title={`생성: ${analysisData.rolePercentages.total.users.generation}%`}>
                          {analysisData.rolePercentages.total.users.generation > 10 ? `${analysisData.rolePercentages.total.users.generation}%` : ''}
                        </div>
                        <div className="stacked-segment evaluation" style={{width: `${analysisData.rolePercentages.total.users.evaluation}%`}} title={`평가: ${analysisData.rolePercentages.total.users.evaluation}%`}>
                          {analysisData.rolePercentages.total.users.evaluation > 10 ? `${analysisData.rolePercentages.total.users.evaluation}%` : ''}
                        </div>
                        <div className="stacked-segment feedback" style={{width: `${analysisData.rolePercentages.total.users.feedback}%`}} title={`피드백: ${analysisData.rolePercentages.total.users.feedback}%`}>
                          {analysisData.rolePercentages.total.users.feedback > 10 ? `${analysisData.rolePercentages.total.users.feedback}%` : ''}
                        </div>
                        <div className="stacked-segment request" style={{width: `${analysisData.rolePercentages.total.users.request}%`}} title={`요청: ${analysisData.rolePercentages.total.users.request}%`}>
                          {analysisData.rolePercentages.total.users.request > 10 ? `${analysisData.rolePercentages.total.users.request}%` : ''}
                        </div>
                      </div>
                      <div className="role-assignment-rates">
                        <small>담당률: 생성 {analysisData.roleAssignmentRates.users.generation} | 평가 {analysisData.roleAssignmentRates.users.evaluation} | 피드백 {analysisData.roleAssignmentRates.users.feedback} | 요청 {analysisData.roleAssignmentRates.users.request}</small>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 총합 (첫번째+두번째+세번째) */}
                <div className="stacked-chart-group">
                  <h4>📊 총합 (1st+2nd+3rd)</h4>
                  <div className="stacked-chart-sections">
                    <div className="stacked-chart-item">
                      <div className="stacked-chart-label">👥 전체 (AI + 사용자)</div>
                      <div className="stacked-bar">
                        <div className="stacked-segment generation" style={{width: `${analysisData.rolePercentages.total.total.generation}%`}} title={`생성: ${analysisData.rolePercentages.total.total.generation}%`}>
                          {parseFloat(analysisData.rolePercentages.total.total.generation) > 10 ? `${analysisData.rolePercentages.total.total.generation}%` : ''}
                        </div>
                        <div className="stacked-segment evaluation" style={{width: `${analysisData.rolePercentages.total.total.evaluation}%`}} title={`평가: ${analysisData.rolePercentages.total.total.evaluation}%`}>
                          {parseFloat(analysisData.rolePercentages.total.total.evaluation) > 10 ? `${analysisData.rolePercentages.total.total.evaluation}%` : ''}
                        </div>
                        <div className="stacked-segment feedback" style={{width: `${analysisData.rolePercentages.total.total.feedback}%`}} title={`피드백: ${analysisData.rolePercentages.total.total.feedback}%`}>
                          {parseFloat(analysisData.rolePercentages.total.total.feedback) > 10 ? `${analysisData.rolePercentages.total.total.feedback}%` : ''}
                        </div>
                        <div className="stacked-segment request" style={{width: `${analysisData.rolePercentages.total.total.request}%`}} title={`요청: ${analysisData.rolePercentages.total.total.request}%`}>
                          {parseFloat(analysisData.rolePercentages.total.total.request) > 10 ? `${analysisData.rolePercentages.total.total.request}%` : ''}
                        </div>
                      </div>
                      <div className="role-assignment-rates">
                        <small>담당률: 생성 {analysisData.roleAssignmentRates.total.generation} | 평가 {analysisData.roleAssignmentRates.total.evaluation} | 피드백 {analysisData.roleAssignmentRates.total.feedback} | 요청 {analysisData.roleAssignmentRates.total.request}</small>
                      </div>
                    </div>
                    <div className="stacked-chart-item">
                      <div className="stacked-chart-label">🤖 AI 에이전트만</div>
                      <div className="stacked-bar">
                        <div className="stacked-segment generation" style={{width: `${analysisData.rolePercentages.total.agents.generation}%`}} title={`생성: ${analysisData.rolePercentages.total.agents.generation}%`}>
                          {parseFloat(analysisData.rolePercentages.total.agents.generation) > 10 ? `${analysisData.rolePercentages.total.agents.generation}%` : ''}
                        </div>
                        <div className="stacked-segment evaluation" style={{width: `${analysisData.rolePercentages.total.agents.evaluation}%`}} title={`평가: ${analysisData.rolePercentages.total.agents.evaluation}%`}>
                          {parseFloat(analysisData.rolePercentages.total.agents.evaluation) > 10 ? `${analysisData.rolePercentages.total.agents.evaluation}%` : ''}
                        </div>
                        <div className="stacked-segment feedback" style={{width: `${analysisData.rolePercentages.total.agents.feedback}%`}} title={`피드백: ${analysisData.rolePercentages.total.agents.feedback}%`}>
                          {parseFloat(analysisData.rolePercentages.total.agents.feedback) > 10 ? `${analysisData.rolePercentages.total.agents.feedback}%` : ''}
                        </div>
                        <div className="stacked-segment request" style={{width: `${analysisData.rolePercentages.total.agents.request}%`}} title={`요청: ${analysisData.rolePercentages.total.agents.request}%`}>
                          {parseFloat(analysisData.rolePercentages.total.agents.request) > 10 ? `${analysisData.rolePercentages.total.agents.request}%` : ''}
                        </div>
                      </div>
                      <div className="role-assignment-rates">
                        <small>담당률: 생성 {analysisData.roleAssignmentRates.agents.generation} | 평가 {analysisData.roleAssignmentRates.agents.evaluation} | 피드백 {analysisData.roleAssignmentRates.agents.feedback} | 요청 {analysisData.roleAssignmentRates.agents.request}</small>
                      </div>
                    </div>
                    <div className="stacked-chart-item">
                      <div className="stacked-chart-label">👤 사용자만</div>
                      <div className="stacked-bar">
                        <div className="stacked-segment generation" style={{width: `${analysisData.rolePercentages.total.users.generation}%`}} title={`생성: ${analysisData.rolePercentages.total.users.generation}%`}>
                          {parseFloat(analysisData.rolePercentages.total.users.generation) > 10 ? `${analysisData.rolePercentages.total.users.generation}%` : ''}
                        </div>
                        <div className="stacked-segment evaluation" style={{width: `${analysisData.rolePercentages.total.users.evaluation}%`}} title={`평가: ${analysisData.rolePercentages.total.users.evaluation}%`}>
                          {parseFloat(analysisData.rolePercentages.total.users.evaluation) > 10 ? `${analysisData.rolePercentages.total.users.evaluation}%` : ''}
                        </div>
                        <div className="stacked-segment feedback" style={{width: `${analysisData.rolePercentages.total.users.feedback}%`}} title={`피드백: ${analysisData.rolePercentages.total.users.feedback}%`}>
                          {parseFloat(analysisData.rolePercentages.total.users.feedback) > 10 ? `${analysisData.rolePercentages.total.users.feedback}%` : ''}
                        </div>
                        <div className="stacked-segment request" style={{width: `${analysisData.rolePercentages.total.users.request}%`}} title={`요청: ${analysisData.rolePercentages.total.users.request}%`}>
                          {parseFloat(analysisData.rolePercentages.total.users.request) > 10 ? `${analysisData.rolePercentages.total.users.request}%` : ''}
                        </div>
                      </div>
                      <div className="role-assignment-rates">
                        <small>담당률: 생성 {analysisData.roleAssignmentRates.users.generation} | 평가 {analysisData.roleAssignmentRates.users.evaluation} | 피드백 {analysisData.roleAssignmentRates.users.feedback} | 요청 {analysisData.roleAssignmentRates.users.request}</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="role-legend">
                <div className="legend-item">
                  <div className="legend-color generation"></div>
                  <span>아이디어 생성하기</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color evaluation"></div>
                  <span>아이디어 평가하기</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color feedback"></div>
                  <span>피드백하기</span>
                </div>
                <div className="legend-item">
                  <div className="legend-color request"></div>
                  <span>요청하기</span>
                </div>
              </div>
            </div>

          </div>
        )}

        {activeTab === 'mental-model' && (
          <div className="analysis-grid mental-model-tab">
            {/* 공유 멘탈 모델 길이 분석 */}
            <div className="analysis-section">
              <h3>🧠 공유 멘탈 모델 길이 분석 (Syllable 기준)</h3>
              <p className="analysis-description">
                36개 팀의 공유 멘탈 모델 길이를 음절(syllable) 단위로 분석한 결과입니다.
              </p>
              
              <div className="mental-model-stats">
                <div className="team-stats-table">
                  <div className="stats-header">
                    <div className="stat-label">구분</div>
                    <div className="stat-value">평균 (Syllables)</div>
                    <div className="stat-value">최소 (Syllables)</div>
                    <div className="stat-value">최대 (Syllables)</div>
                    <div className="stat-value">표준편차</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">첫번째 팀 (Team 1)</div>
                    <div className="stat-value">{analysisData.sharedMentalModel.team1.avg}</div>
                    <div className="stat-value">
                      {analysisData.sharedMentalModel.team1.min}
                      {analysisData.sharedMentalModel.team1.minTeam && (
                        <span className="team-info"> ({analysisData.sharedMentalModel.team1.minTeam})</span>
                      )}
                    </div>
                    <div className="stat-value">
                      {analysisData.sharedMentalModel.team1.max}
                      {analysisData.sharedMentalModel.team1.maxTeam && (
                        <span className="team-info"> ({analysisData.sharedMentalModel.team1.maxTeam})</span>
                      )}
                    </div>
                    <div className="stat-value">{analysisData.sharedMentalModel.team1.stdev}</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">두번째 팀 (Team 2)</div>
                    <div className="stat-value">{analysisData.sharedMentalModel.team2.avg}</div>
                    <div className="stat-value">
                      {analysisData.sharedMentalModel.team2.min}
                      {analysisData.sharedMentalModel.team2.minTeam && (
                        <span className="team-info"> ({analysisData.sharedMentalModel.team2.minTeam})</span>
                      )}
                    </div>
                    <div className="stat-value">
                      {analysisData.sharedMentalModel.team2.max}
                      {analysisData.sharedMentalModel.team2.maxTeam && (
                        <span className="team-info"> ({analysisData.sharedMentalModel.team2.maxTeam})</span>
                      )}
                    </div>
                    <div className="stat-value">{analysisData.sharedMentalModel.team2.stdev}</div>
                  </div>
                  <div className="stats-row">
                    <div className="stat-label">세번째 팀 (Team 3)</div>
                    <div className="stat-value">{analysisData.sharedMentalModel.team3.avg}</div>
                    <div className="stat-value">
                      {analysisData.sharedMentalModel.team3.min}
                      {analysisData.sharedMentalModel.team3.minTeam && (
                        <span className="team-info"> ({analysisData.sharedMentalModel.team3.minTeam})</span>
                      )}
                    </div>
                    <div className="stat-value">
                      {analysisData.sharedMentalModel.team3.max}
                      {analysisData.sharedMentalModel.team3.maxTeam && (
                        <span className="team-info"> ({analysisData.sharedMentalModel.team3.maxTeam})</span>
                      )}
                    </div>
                    <div className="stat-value">{analysisData.sharedMentalModel.team3.stdev}</div>
                  </div>
                  <div className="stats-row total-row">
                    <div className="stat-label">전체 (Total)</div>
                    <div className="stat-value">{analysisData.sharedMentalModel.total.avg}</div>
                    <div className="stat-value">
                      {analysisData.sharedMentalModel.total.min}
                      {analysisData.sharedMentalModel.total.minTeam && (
                        <span className="team-info"> ({analysisData.sharedMentalModel.total.minTeam})</span>
                      )}
                    </div>
                    <div className="stat-value">
                      {analysisData.sharedMentalModel.total.max}
                      {analysisData.sharedMentalModel.total.maxTeam && (
                        <span className="team-info"> ({analysisData.sharedMentalModel.total.maxTeam})</span>
                      )}
                    </div>
                    <div className="stat-value">{analysisData.sharedMentalModel.total.stdev}</div>
                  </div>
                </div>
              </div>
              
              <div className="mental-model-insights">
                <h4>📊 주요 인사이트</h4>
                <div className="insights-grid">
                  <div className="insight-card">
                    <h5>팀별 비교</h5>
                    <p>
                      Team 1: 평균 {analysisData.sharedMentalModel.team1.avg} syllables<br/>
                      Team 2: 평균 {analysisData.sharedMentalModel.team2.avg} syllables<br/>
                      Team 3: 평균 {analysisData.sharedMentalModel.team3.avg} syllables
                    </p>
                  </div>
                  <div className="insight-card">
                    <h5>범위 분석</h5>
                    <p>
                      전체 범위: {analysisData.sharedMentalModel.total.min} ~ {analysisData.sharedMentalModel.total.max} syllables<br/>
                      표준편차: {analysisData.sharedMentalModel.total.stdev}<br/>
                      평균 길이: {analysisData.sharedMentalModel.total.avg} syllables
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 참가자별 멘탈 모델 변경 분석 */}
            <div className="analysis-section">
              <h3>👤 참가자별 멘탈 모델 변경 분석</h3>
              <p className="analysis-description">
                각 참가자가 팀1 → 팀2 → 팀3으로 진행하면서 공유 멘탈 모델을 어떻게 수정했는지 분석한 결과입니다.
              </p>
              
              <div className="participant-changes-container">
                {Object.entries(analysisData.participantMentalModelChanges).map(([participantName, data]) => (
                  <div key={participantName} className="participant-change-card">
                    <div className="participant-header">
                      <h4>
                        {participantName} 
                        <span className="participant-meta">
                          ({data.totalTeams}개 팀 | {data.hasAnyChanges ? '변경 있음' : '동일 유지'})
                        </span>
                      </h4>
                      {data.significantChanges > 0 && (
                        <span className="significant-changes-badge">
                          중요 변경 {data.significantChanges}회
                        </span>
                      )}
                    </div>
                    
                    <div className="mental-model-timeline">
                      {data.changes.map((change, index) => (
                        <div key={index} className={`change-item ${change.isIdentical ? 'identical' : change.isSignificantChange ? 'significant' : 'minor'}`}>
                          <div className="change-header">
                            <span className="team-transition">
                              Team {change.fromTeam} → Team {change.toTeam}
                            </span>
                            <span className="change-status">
                              {change.isIdentical ? '동일' : 
                               change.isSignificantChange ? '대폭 변경' : '소폭 변경'}
                            </span>
                            <span className="similarity-score">
                              유사도: {(change.similarity * 100).toFixed(1)}%
                            </span>
                          </div>
                          
                          <div className="length-change">
                            길이 변화: {change.prevLength} → {change.currLength} syllables 
                            ({change.lengthChange > 0 ? '+' : ''}{change.lengthChange})
                          </div>
                          
                          {!change.isIdentical && (
                            <div className="model-diff">
                              <div className="model-section">
                                <strong>Team {change.fromTeam}:</strong>
                                <div className="model-text prev-model">
                                  {change.prevModel ? change.prevModel.substring(0, 150) + (change.prevModel.length > 150 ? '...' : '') : '내용 없음'}
                                </div>
                              </div>
                              <div className="model-section">
                                <strong>Team {change.toTeam}:</strong>
                                <div className="model-text curr-model">
                                  {change.currModel ? change.currModel.substring(0, 150) + (change.currModel.length > 150 ? '...' : '') : '내용 없음'}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="change-summary">
                <h4>📈 변경 요약</h4>
                <div className="summary-stats">
                  <div className="summary-item">
                    <strong>총 참가자 수:</strong> {Object.keys(analysisData.participantMentalModelChanges).length}명
                  </div>
                  <div className="summary-item">
                    <strong>변경한 참가자:</strong> {Object.values(analysisData.participantMentalModelChanges).filter(p => p.hasAnyChanges).length}명
                  </div>
                  <div className="summary-item">
                    <strong>동일 유지 참가자:</strong> {Object.values(analysisData.participantMentalModelChanges).filter(p => !p.hasAnyChanges).length}명
                  </div>
                  <div className="summary-item">
                    <strong>중요 변경이 있는 참가자:</strong> {Object.values(analysisData.participantMentalModelChanges).filter(p => p.significantChanges > 0).length}명
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        </>
      </div>
    </div>
  );
};

export default AnalysisReportClean;