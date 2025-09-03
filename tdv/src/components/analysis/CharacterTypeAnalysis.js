import React, { useState } from 'react';
import '../AnalysisReport.css';

const CharacterTypeAnalysis = ({ teams }) => {
  const [activeTab, setActiveTab] = useState('clustering');
  const [expandedClusters, setExpandedClusters] = useState({});
  const [expandedBelbinRoles, setExpandedBelbinRoles] = useState({});

  if (!teams || teams.length === 0) {
    return <div>데이터를 로딩 중입니다...</div>;
  }

  // 개인별 데이터 추출 (에이전트 + 사용자) - 중복 포함하여 전체 카운트
  const getAllPersons = () => {
    const persons = [];
    
    // 모든 팀의 사용자(owner) 추가 - 중복 포함
    teams.forEach(team => {
      const participantName = team.owner_info?.name;
      if (participantName) {
        const userInfo = team.owner_info || {};
        
        persons.push({
          type: 'user',
          name: participantName,
          age: userInfo.age || null,
          gender: userInfo.gender || null,
          personality: userInfo.personality || null,
          education: userInfo.education || null,
          skills: userInfo.skills || null,
          professional: userInfo.professional || null,
          preferences: userInfo.preferences || null,
          dislikes: userInfo.dislikes || null,
          workStyle: userInfo.workStyle || null
        });
      }
    });

    // 모든 팀의 에이전트 데이터 추출 - 중복 포함
    teams.forEach(team => {
      const agents = team.agents || [];
      agents.forEach(agent => {
        const agentInfo = agent.agent_info || {};
        
        if (agentInfo.name) {
          persons.push({
            type: 'agent',
            name: agentInfo.name,
            age: agentInfo.age || null,
            gender: agentInfo.gender || null,
            personality: agentInfo.personality || null,
            education: agentInfo.education || null,
            skills: agentInfo.skills || null,
            professional: agentInfo.professional || null,
            preferences: agentInfo.preferences || null,
            dislikes: agentInfo.dislikes || null,
            workStyle: agentInfo.workStyle || null
          });
        }
      });
    });

    return persons;
  };

  // 1. 데이터 기반 자동 클러스터링
  const performAutoClustering = (persons) => {
    // 9개 특성을 의미있게 벡터화
    const vectorizeFeatures = (person) => {
      return {
        // 1. 나이 (연속형 -> 구간화)
        age: person.age ? (person.age < 25 ? 0 : person.age < 35 ? 1 : person.age < 45 ? 2 : 3) : -1,
        
        // 2. 성별 (이진)
        gender: person.gender === '남성' ? 0 : person.gender === '여성' ? 1 : -1,
        
        // 3. 교육수준 (순서형)
        education: person.education ? (
          person.education.includes('고등학교') ? 0 :
          person.education.includes('대학교') && !person.education.includes('대학원') ? 1 :
          person.education.includes('대학원') || person.education.includes('석사') ? 2 :
          person.education.includes('박사') ? 3 : 1
        ) : -1,
        
        // 4. 성격 유형 (키워드 기반 벡터화)
        personality: vectorizePersonality(person.personality),
        
        // 5. 스킬 레벨 (기술 복잡도 기반)
        skillLevel: vectorizeSkills(person.skills),
        
        // 6. 직업 레벨 (전문성 기반)
        professional: vectorizeProfessional(person.professional),
        
        // 7. 선호도 (협업/개인 성향)
        preferences: vectorizePreferences(person.preferences),
        
        // 8. 비선호 (부정적 요소)
        dislikes: vectorizeDislikes(person.dislikes),
        
        // 9. 업무 스타일 (체계성/유연성)
        workStyle: vectorizeWorkStyle(person.workStyle)
      };
    };

    // 성격 벡터화 (MBTI, 키워드 기반)
    const vectorizePersonality = (personality) => {
      if (!personality) return -1;
      const p = personality.toLowerCase();
      
      // 외향/내향, 직관/감각, 사고/감정, 판단/인식 기반 점수
      let score = 0;
      
      // 외향성 (+1), 내향성 (0)
      if (p.includes('e') || p.includes('외향') || p.includes('활발') || p.includes('사교')) score += 1;
      
      // 직관형 (+2), 감각형 (0)  
      if (p.includes('n') || p.includes('직관') || p.includes('창의') || p.includes('혁신')) score += 2;
      
      // 사고형 (+4), 감정형 (0)
      if (p.includes('t') || p.includes('논리') || p.includes('분석') || p.includes('객관')) score += 4;
      
      // 판단형 (+8), 인식형 (0)
      if (p.includes('j') || p.includes('체계') || p.includes('계획') || p.includes('조직')) score += 8;
      
      return Math.min(score, 15); // 0-15 범위
    };

    // 스킬 벡터화 (기술 복잡도와 개수)
    const vectorizeSkills = (skills) => {
      if (!skills) return -1;
      
      const skillList = typeof skills === 'string' ? 
        skills.split(',').map(s => s.trim().toLowerCase()) : 
        (Array.isArray(skills) ? skills.map(s => s.toLowerCase()) : []);
      
      let complexity = 0;
      const techSkills = ['프로그래밍', 'python', 'javascript', 'java', 'ai', '머신러닝', '데이터분석'];
      const designSkills = ['디자인', 'ui', 'ux', 'photoshop', '일러스트'];
      const managementSkills = ['기획', '관리', '리더십', '프로젝트'];
      
      skillList.forEach(skill => {
        if (techSkills.some(tech => skill.includes(tech))) complexity += 3;
        else if (designSkills.some(design => skill.includes(design))) complexity += 2;
        else if (managementSkills.some(mgmt => skill.includes(mgmt))) complexity += 2;
        else complexity += 1;
      });
      
      return Math.min(complexity + skillList.length, 20); // 복잡도 + 개수
    };

    // 직업 벡터화 (전문성 레벨)
    const vectorizeProfessional = (professional) => {
      if (!professional) return -1;
      const p = professional.toLowerCase();
      
      // 전문직 (의사, 변호사, 교수) = 5
      if (p.includes('의사') || p.includes('변호사') || p.includes('교수') || p.includes('박사')) return 5;
      
      // 고급 기술직 (개발자, 연구원, 컨설턴트) = 4  
      if (p.includes('개발자') || p.includes('연구원') || p.includes('컨설턴트') || p.includes('아키텍트')) return 4;
      
      // 관리직 (매니저, 팀장, 임원) = 4
      if (p.includes('매니저') || p.includes('팀장') || p.includes('이사') || p.includes('임원')) return 4;
      
      // 전문 기술직 (디자이너, 기획자, 분석가) = 3
      if (p.includes('디자이너') || p.includes('기획') || p.includes('분석') || p.includes('마케팅')) return 3;
      
      // 일반 사무직 = 2
      if (p.includes('사무') || p.includes('직원') || p.includes('assistant')) return 2;
      
      // 학생, 인턴 = 1
      if (p.includes('학생') || p.includes('인턴')) return 1;
      
      return 2; // 기본값
    };

    // 선호도 벡터화 (협업 vs 개인 성향)
    const vectorizePreferences = (preferences) => {
      if (!preferences) return -1;
      const p = preferences.toLowerCase();
      
      let score = 0;
      
      // 협업 지향 (+)
      if (p.includes('팀') || p.includes('협력') || p.includes('소통') || p.includes('함께')) score += 2;
      if (p.includes('회의') || p.includes('토론') || p.includes('브레인스토밍')) score += 1;
      
      // 혁신/창의 지향 (+)
      if (p.includes('창의') || p.includes('혁신') || p.includes('새로운') || p.includes('도전')) score += 2;
      
      // 체계/안정 지향 (+)
      if (p.includes('계획') || p.includes('체계') || p.includes('안정') || p.includes('규칙')) score += 1;
      
      return Math.min(score, 10);
    };

    // 비선호 벡터화 (회피하는 상황의 강도)
    const vectorizeDislikes = (dislikes) => {
      if (!dislikes) return -1;
      const d = dislikes.toLowerCase();
      
      let intensity = 0;
      
      // 강한 거부감 (갈등, 스트레스)
      if (d.includes('갈등') || d.includes('스트레스') || d.includes('압박')) intensity += 3;
      
      // 중간 거부감 (반복, 단조로움)
      if (d.includes('반복') || d.includes('단조') || d.includes('루틴')) intensity += 2;
      
      // 약한 거부감 (늦은 시간, 복잡함)
      if (d.includes('늦은') || d.includes('복잡') || d.includes('불확실')) intensity += 1;
      
      return Math.min(intensity, 10);
    };

    // 업무 스타일 벡터화 (체계성 vs 유연성)
    const vectorizeWorkStyle = (workStyle) => {
      if (!workStyle) return -1;
      const w = workStyle.toLowerCase();
      
      let systematicScore = 0;
      
      // 체계적 (+)
      if (w.includes('계획') || w.includes('체계') || w.includes('단계')) systematicScore += 2;
      if (w.includes('순서') || w.includes('정리') || w.includes('문서')) systematicScore += 1;
      
      // 유연함 (기본값에서 차감하지 않고 별도 점수)
      let flexibleScore = 0;
      if (w.includes('유연') || w.includes('즉흥') || w.includes('자유')) flexibleScore += 2;
      if (w.includes('적응') || w.includes('변화')) flexibleScore += 1;
      
      // 체계성과 유연성의 조합으로 0-10 점수 생성
      return Math.min(systematicScore * 2 + flexibleScore, 10);
    };


    // K-means 알고리즘 단순화 버전
    const performKMeans = (vectors, k = 7) => {
      // 초기 중심점 랜덤 설정
      const centroids = [];
      for (let i = 0; i < k; i++) {
        const randomVector = vectors[Math.floor(Math.random() * vectors.length)];
        centroids.push({ ...randomVector });
      }

      const clusters = Array(k).fill().map(() => []);
      
      // 각 벡터를 가장 가까운 중심점에 할당
      vectors.forEach((vector, index) => {
        let minDistance = Infinity;
        let closestCluster = 0;

        centroids.forEach((centroid, clusterIndex) => {
          const distance = calculateEuclideanDistance(vector, centroid);
          if (distance < minDistance) {
            minDistance = distance;
            closestCluster = clusterIndex;
          }
        });

        clusters[closestCluster].push(index);
      });

      return clusters;
    };

    // 유클리드 거리 계산
    const calculateEuclideanDistance = (v1, v2) => {
      const keys = Object.keys(v1);
      let sum = 0;
      keys.forEach(key => {
        const diff = (v1[key] || 0) - (v2[key] || 0);
        sum += diff * diff;
      });
      return Math.sqrt(sum);
    };

    const vectors = persons.map(vectorizeFeatures);
    const clusters = performKMeans(vectors, 7);
    
    // 빈 클러스터 제거 및 결과 생성
    const nonEmptyClusters = clusters.filter(cluster => cluster.length > 0);
    
    const clusterResults = nonEmptyClusters.map((cluster, index) => {
      const members = cluster.map(memberIndex => persons[memberIndex]);
      const characteristics = analyzeClusterCharacteristics(members);
      
      return {
        id: index + 1,
        name: '', // 나중에 설정
        members: members,
        size: cluster.length,
        characteristics: characteristics
      };
    });
    
    // 모든 클러스터에 고유한 이름 부여
    const usedNames = new Set();
    clusterResults.forEach((cluster, index) => {
      cluster.name = generateUniqueClusterName(cluster.members, index, usedNames);
      usedNames.add(cluster.name);
    });
    
    return clusterResults;
  };

  // 고유한 클러스터 이름 생성 (중복 방지)
  const generateUniqueClusterName = (members, clusterIndex, usedNames) => {
    if (members.length === 0) return '👻 유령 클러스터';
    
    // 특성 분석
    const personalityProfile = analyzePersonalityProfile(members);
    const skillProfile = analyzeSkillProfile(members);
    const ageProfile = analyzeAgeProfile(members);
    const workStyleProfile = analyzeWorkStyleProfile(members);
    
    // 특성 점수 계산
    const scores = {
      tech: skillProfile.techScore,
      creative: skillProfile.creativeScore,
      leadership: skillProfile.leadershipScore,
      analytical: personalityProfile.analyticalScore,
      collaborative: personalityProfile.collaborativeScore,
      innovative: personalityProfile.innovativeScore,
      systematic: workStyleProfile.systematicScore,
      flexible: workStyleProfile.flexibleScore
    };
    
    // 가장 강한 특성 2개 찾기
    const topTraits = Object.entries(scores)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 2);
    
    const primaryTrait = topTraits[0][0];
    const secondaryTrait = topTraits.length > 1 ? topTraits[1][0] : null;
    
    // 연령대별 수식어
    const ageModifier = ageProfile.avgAge < 28 ? '🌱' : 
                      ageProfile.avgAge < 38 ? '⚡' : '🎯';
    
    // 직관적이고 이해하기 쉬운 이름들로 구성
    const allPossibleNames = [
      // 개발/기술 전문가형
      '💻 개발자 그룹', '🤖 AI 전문가팀', '⚙️ 기술 엔지니어',
      '🔧 시스템 개발자', '📱 앱 개발팀', '🌐 웹 전문가',
      '🔌 프로그래머 집단', '💾 데이터 엔지니어', '🖥️ IT 전문팀',
      
      // 디자인/창작자형  
      '🎨 디자이너 그룹', '✏️ 크리에이티브팀', '🖌️ 아티스트 집단',
      '📐 UI/UX 전문가', '🎭 콘텐츠 크리에이터', '🌈 시각 디자이너',
      '📸 미디어 아티스트', '🎬 영상 제작팀', '🎪 브랜딩 전문가',
      
      // 관리/리더십형
      '👔 관리자 그룹', '📊 기획자팀', '🎯 전략 수립자',
      '📋 프로젝트 매니저', '🏢 비즈니스 리더', '📈 성장 전략가',
      '🤵 팀 리더십', '🎖️ 의사결정자', '👑 경영진 그룹',
      
      // 분석/연구자형
      '📊 데이터 분석가', '🔬 연구원 그룹', '📈 통계 전문가',
      '🧮 수치 분석팀', '📉 시장 조사자', '🔍 정보 수집가',
      '💡 인사이트 발굴자', '🎯 문제 해결사', '📑 보고서 작성자',
      
      // 소통/협업형
      '🤝 소통 전문가', '💬 커뮤니케이터', '🌐 네트워킹 그룹',
      '📞 고객 응대팀', '🎤 발표 전문가', '📝 콘텐츠 기획자',
      '🏃 업무 조율자', '🤲 중재자 그룹', '💪 팀워크 마스터',
      
      // 기획/아이디어형
      '💡 아이디어 뱅크', '🚀 혁신 추진팀', '🌟 기획 전문가',
      '🎨 컨셉 개발자', '📋 전략 기획자', '🔮 미래 설계사',
      '⭐ 브레인스토머', '🎯 목표 설정자', '🌈 비전 제시자',
      
      // 실행/완결형
      '✅ 실행력 그룹', '⚡ 빠른 처리팀', '🎯 목표 달성자',
      '📌 업무 완료자', '🔥 추진력 있는팀', '💪 성과 창출자',
      '🏁 마무리 전문가', '⏰ 데드라인 지키미', '💯 퀄리티 관리자',
      
      // 균형/다재다능형
      '🌟 올라운더팀', '⚖️ 균형잡힌 그룹', '🎪 다재다능팀',
      '🌈 다양성 그룹', '💎 멀티 플레이어', '🎭 융합형 인재',
      '🔄 적응력 그룹', '🌊 유연한 팀', '🎨 창의적 해결사'
    ];
    
    // 특성 점수를 기반으로 우선순위 계산
    const getNamePriority = (name) => {
      let priority = 0;
      
      // 주요 특성에 따른 우선순위 부여
      if (primaryTrait === 'tech' && (name.includes('개발자') || name.includes('프로그래머') || name.includes('엔지니어') || name.includes('IT'))) priority += 10;
      if (primaryTrait === 'creative' && (name.includes('디자이너') || name.includes('크리에이티브') || name.includes('아티스트') || name.includes('콘텐츠'))) priority += 10;
      if (primaryTrait === 'leadership' && (name.includes('관리자') || name.includes('리더') || name.includes('매니저') || name.includes('경영'))) priority += 10;
      if (primaryTrait === 'analytical' && (name.includes('분석가') || name.includes('연구원') || name.includes('데이터') || name.includes('통계'))) priority += 10;
      if (primaryTrait === 'collaborative' && (name.includes('소통') || name.includes('팀워크') || name.includes('커뮤니케이터') || name.includes('조율'))) priority += 10;
      if (primaryTrait === 'innovative' && (name.includes('아이디어') || name.includes('혁신') || name.includes('기획') || name.includes('브레인스토머'))) priority += 10;
      
      // 보조 특성 보너스
      if (secondaryTrait && scores[secondaryTrait] > 2) {
        if (secondaryTrait === 'systematic' && (name.includes('전략') || name.includes('기획') || name.includes('체계') || name.includes('완료'))) priority += 5;
        if (secondaryTrait === 'flexible' && (name.includes('유연') || name.includes('적응') || name.includes('다재다능') || name.includes('균형'))) priority += 5;
      }
      
      // 연령대 매칭 보너스 (젊은층은 새로운 기술, 베테랑은 전문성)
      if (ageProfile.avgAge < 28 && (name.includes('앱') || name.includes('AI') || name.includes('빠른'))) priority += 3;
      if (ageProfile.avgAge >= 40 && (name.includes('전문가') || name.includes('마스터') || name.includes('시니어'))) priority += 3;
      
      return priority;
    };
    
    // 사용 가능한 이름들을 우선순위별로 정렬
    const availableNames = allPossibleNames
      .filter(name => !usedNames.has(`${ageModifier} ${name}`))
      .map(name => ({ name, priority: getNamePriority(name) }))
      .sort((a, b) => b.priority - a.priority);
    
    // 우선순위가 높은 이름 선택, 없으면 클러스터 인덱스 기반 선택
    let baseName;
    if (availableNames.length > 0) {
      // 같은 우선순위 내에서는 클러스터 인덱스로 결정적 선택
      const topPriority = availableNames[0].priority;
      const topNames = availableNames.filter(item => item.priority === topPriority);
      baseName = topNames[clusterIndex % topNames.length].name;
    } else {
      // 모든 이름이 사용된 경우 (거의 불가능하지만) 인덱스 기반 생성
      baseName = `특별 그룹 ${clusterIndex + 1}`;
    }
    
    // 연령 수식어와 함께 최종 이름 생성
    return `${ageModifier} ${baseName}`;
  };

  // 특성별 분석 함수들
  const analyzePersonalityProfile = (members) => {
    let analyticalScore = 0;
    let collaborativeScore = 0;
    let innovativeScore = 0;
    
    members.forEach(member => {
      if (member.personality) {
        const p = member.personality.toLowerCase();
        if (p.includes('논리') || p.includes('분석') || p.includes('t') || p.includes('객관')) analyticalScore++;
        if (p.includes('협력') || p.includes('팀') || p.includes('소통') || p.includes('사회')) collaborativeScore++;
        if (p.includes('창의') || p.includes('혁신') || p.includes('n') || p.includes('상상')) innovativeScore++;
      }
      
      if (member.preferences) {
        const pref = member.preferences.toLowerCase();
        if (pref.includes('팀') || pref.includes('협력') || pref.includes('함께')) collaborativeScore++;
        if (pref.includes('창의') || pref.includes('새로운') || pref.includes('도전')) innovativeScore++;
        if (pref.includes('분석') || pref.includes('논리') || pref.includes('체계')) analyticalScore++;
      }
    });
    
    return { analyticalScore, collaborativeScore, innovativeScore };
  };

  const analyzeSkillProfile = (members) => {
    let techScore = 0;
    let creativeScore = 0;
    let leadershipScore = 0;
    
    members.forEach(member => {
      if (member.skills) {
        const skills = typeof member.skills === 'string' ? member.skills.toLowerCase() : '';
        if (skills.includes('프로그래밍') || skills.includes('python') || skills.includes('개발') || skills.includes('ai')) techScore++;
        if (skills.includes('디자인') || skills.includes('ui') || skills.includes('창작') || skills.includes('아트')) creativeScore++;
        if (skills.includes('리더십') || skills.includes('관리') || skills.includes('기획') || skills.includes('전략')) leadershipScore++;
      }
      
      if (member.professional) {
        const prof = member.professional.toLowerCase();
        if (prof.includes('개발') || prof.includes('엔지니어') || prof.includes('프로그래머')) techScore++;
        if (prof.includes('디자이너') || prof.includes('크리에이터') || prof.includes('아티스트')) creativeScore++;
        if (prof.includes('매니저') || prof.includes('리더') || prof.includes('팀장') || prof.includes('임원')) leadershipScore++;
      }
    });
    
    return { techScore, creativeScore, leadershipScore };
  };

  const analyzeAgeProfile = (members) => {
    const ages = members.map(m => parseInt(m.age)).filter(age => !isNaN(age));
    const avgAge = ages.length > 0 ? ages.reduce((sum, age) => sum + age, 0) / ages.length : 30;
    
    return { avgAge, ageCount: ages.length };
  };

  const analyzeWorkStyleProfile = (members) => {
    let systematicScore = 0;
    let flexibleScore = 0;
    
    members.forEach(member => {
      if (member.workStyle) {
        const ws = member.workStyle.toLowerCase();
        if (ws.includes('계획') || ws.includes('체계') || ws.includes('단계') || ws.includes('순서')) systematicScore++;
        if (ws.includes('유연') || ws.includes('즉흥') || ws.includes('적응') || ws.includes('자유')) flexibleScore++;
      }
      
      if (member.personality) {
        const p = member.personality.toLowerCase();
        if (p.includes('j') || p.includes('체계') || p.includes('계획')) systematicScore++;
        if (p.includes('p') || p.includes('유연') || p.includes('적응')) flexibleScore++;
      }
    });
    
    return { systematicScore, flexibleScore };
  };


  // 클러스터 특성 분석 (선호도, 비선호, 업무스타일 포함)
  const analyzeClusterCharacteristics = (members) => {
    const characteristics = {
      dominantAge: getDominantValue(members, 'age'),
      dominantGender: getDominantValue(members, 'gender'),
      dominantEducation: getDominantValue(members, 'education'),
      commonSkills: getCommonSkills(members),
      dominantPersonality: getDominantValue(members, 'personality'),
      
      // 새로 추가된 특성들
      commonPreferences: getCommonPreferences(members),
      commonDislikes: getCommonDislikes(members),
      commonWorkStyles: getCommonWorkStyles(members),
      commonPersonalities: getCommonPersonalities(members),
      preferencesStats: getPreferencesStats(members),
      dislikesStats: getDislikesStats(members),
      workStyleStats: getWorkStyleStats(members),
      personalityStats: getPersonalityStats(members)
    };
    
    return characteristics;
  };

  // 공통 선호도 추출
  const getCommonPreferences = (members) => {
    const allPreferences = [];
    members.forEach(member => {
      if (member.preferences) {
        const prefs = typeof member.preferences === 'string' ? 
          member.preferences.split(',').map(p => p.trim()) : [];
        allPreferences.push(...prefs);
      }
    });
    
    const prefCounts = {};
    allPreferences.forEach(pref => {
      if (pref) prefCounts[pref] = (prefCounts[pref] || 0) + 1;
    });
    
    return Object.entries(prefCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([pref, count]) => ({ pref, count }));
  };

  // 공통 비선호 추출
  const getCommonDislikes = (members) => {
    const allDislikes = [];
    members.forEach(member => {
      if (member.dislikes) {
        const dislikes = typeof member.dislikes === 'string' ? 
          member.dislikes.split(',').map(d => d.trim()) : [];
        allDislikes.push(...dislikes);
      }
    });
    
    const dislikeCounts = {};
    allDislikes.forEach(dislike => {
      if (dislike) dislikeCounts[dislike] = (dislikeCounts[dislike] || 0) + 1;
    });
    
    return Object.entries(dislikeCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([dislike, count]) => ({ dislike, count }));
  };

  // 공통 업무스타일 추출
  const getCommonWorkStyles = (members) => {
    const allWorkStyles = [];
    members.forEach(member => {
      if (member.workStyle) {
        const styles = typeof member.workStyle === 'string' ? 
          member.workStyle.split(',').map(s => s.trim()) : [];
        allWorkStyles.push(...styles);
      }
    });
    
    const styleCounts = {};
    allWorkStyles.forEach(style => {
      if (style) styleCounts[style] = (styleCounts[style] || 0) + 1;
    });
    
    return Object.entries(styleCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([style, count]) => ({ style, count }));
  };

  // 선호도 통계 (키워드 기반 분류)
  const getPreferencesStats = (members) => {
    const stats = {
      teamwork: 0,    // 팀워크/협력 지향
      creative: 0,    // 창의/혁신 지향  
      systematic: 0,  // 체계/계획 지향
      flexible: 0,    // 유연/자유 지향
      learning: 0,    // 학습/성장 지향
      challenge: 0    // 도전/성취 지향
    };
    
    members.forEach(member => {
      if (member.preferences) {
        const prefs = member.preferences.toLowerCase();
        if (prefs.includes('팀') || prefs.includes('협력') || prefs.includes('소통') || prefs.includes('함께')) stats.teamwork++;
        if (prefs.includes('창의') || prefs.includes('새로운') || prefs.includes('혁신') || prefs.includes('아이디어')) stats.creative++;
        if (prefs.includes('계획') || prefs.includes('체계') || prefs.includes('안정') || prefs.includes('규칙')) stats.systematic++;
        if (prefs.includes('유연') || prefs.includes('자유') || prefs.includes('변화') || prefs.includes('다양')) stats.flexible++;
        if (prefs.includes('학습') || prefs.includes('성장') || prefs.includes('발전') || prefs.includes('공부')) stats.learning++;
        if (prefs.includes('도전') || prefs.includes('성취') || prefs.includes('목표') || prefs.includes('성공')) stats.challenge++;
      }
    });
    
    return stats;
  };

  // 비선호 통계 (회피 패턴 분류)
  const getDislikesStats = (members) => {
    const stats = {
      conflict: 0,      // 갈등/대립 회피
      pressure: 0,      // 압박/스트레스 회피
      routine: 0,       // 반복/단조로움 회피
      uncertainty: 0,   // 불확실성 회피
      micromanage: 0,   // 간섭/통제 회피
      isolation: 0      // 고립/소외 회피
    };
    
    members.forEach(member => {
      if (member.dislikes) {
        const dislikes = member.dislikes.toLowerCase();
        if (dislikes.includes('갈등') || dislikes.includes('다툼') || dislikes.includes('대립')) stats.conflict++;
        if (dislikes.includes('압박') || dislikes.includes('스트레스') || dislikes.includes('재촉')) stats.pressure++;
        if (dislikes.includes('반복') || dislikes.includes('단조') || dislikes.includes('루틴')) stats.routine++;
        if (dislikes.includes('불확실') || dislikes.includes('애매') || dislikes.includes('모호')) stats.uncertainty++;
        if (dislikes.includes('간섭') || dislikes.includes('통제') || dislikes.includes('제약')) stats.micromanage++;
        if (dislikes.includes('혼자') || dislikes.includes('고립') || dislikes.includes('소외')) stats.isolation++;
      }
    });
    
    return stats;
  };

  // 업무스타일 통계 (작업 방식 분류)
  const getWorkStyleStats = (members) => {
    const stats = {
      systematic: 0,    // 체계적/계획적
      collaborative: 0, // 협업 지향적
      independent: 0,   // 독립적/자율적
      detailOriented: 0,// 세심/완벽주의
      quickExecution: 0,// 빠른 실행력
      innovative: 0     // 혁신/창의적
    };
    
    members.forEach(member => {
      if (member.workStyle) {
        const style = member.workStyle.toLowerCase();
        if (style.includes('계획') || style.includes('체계') || style.includes('단계') || style.includes('순서')) stats.systematic++;
        if (style.includes('협업') || style.includes('팀') || style.includes('소통') || style.includes('공유')) stats.collaborative++;
        if (style.includes('독립') || style.includes('자율') || style.includes('개인') || style.includes('혼자')) stats.independent++;
        if (style.includes('세심') || style.includes('완벽') || style.includes('꼼꼼') || style.includes('정확')) stats.detailOriented++;
        if (style.includes('빠른') || style.includes('즉시') || style.includes('신속') || style.includes('바로')) stats.quickExecution++;
        if (style.includes('창의') || style.includes('새로운') || style.includes('혁신') || style.includes('다양')) stats.innovative++;
      }
    });
    
    return stats;
  };

  // 공통 성격 특성 추출
  const getCommonPersonalities = (members) => {
    const allPersonalities = [];
    members.forEach(member => {
      if (member.personality) {
        const personalities = typeof member.personality === 'string' ? 
          member.personality.split(',').map(p => p.trim()) : [];
        allPersonalities.push(...personalities);
      }
    });
    
    const personalityCounts = {};
    allPersonalities.forEach(personality => {
      if (personality) personalityCounts[personality] = (personalityCounts[personality] || 0) + 1;
    });
    
    return Object.entries(personalityCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([personality, count]) => ({ personality, count }));
  };

  // 성격 통계 (MBTI 및 성향 기반 분류)
  const getPersonalityStats = (members) => {
    const stats = {
      extrovert: 0,      // 외향적
      introvert: 0,      // 내향적
      intuitive: 0,      // 직관적
      sensing: 0,        // 감각적
      thinking: 0,       // 사고형
      feeling: 0,        // 감정형
      judging: 0,        // 판단형
      perceiving: 0,     // 인식형
      // 추가 성향 분류
      analytical: 0,     // 분석적
      creative: 0,       // 창의적
      leadership: 0,     // 리더십
      collaborative: 0,  // 협력적
      detail_oriented: 0,// 세심한
      adaptable: 0       // 적응적
    };
    
    members.forEach(member => {
      if (member.personality) {
        const personality = member.personality.toLowerCase();
        
        // MBTI 기반 분석
        if (personality.includes('e') || personality.includes('외향') || personality.includes('활발') || personality.includes('사교')) stats.extrovert++;
        if (personality.includes('i') || personality.includes('내향') || personality.includes('조용') || personality.includes('신중')) stats.introvert++;
        if (personality.includes('n') || personality.includes('직관') || personality.includes('상상') || personality.includes('미래')) stats.intuitive++;
        if (personality.includes('s') || personality.includes('감각') || personality.includes('현실') || personality.includes('실용')) stats.sensing++;
        if (personality.includes('t') || personality.includes('사고') || personality.includes('논리') || personality.includes('객관')) stats.thinking++;
        if (personality.includes('f') || personality.includes('감정') || personality.includes('공감') || personality.includes('조화')) stats.feeling++;
        if (personality.includes('j') || personality.includes('판단') || personality.includes('계획') || personality.includes('체계')) stats.judging++;
        if (personality.includes('p') || personality.includes('인식') || personality.includes('유연') || personality.includes('즉흥')) stats.perceiving++;
        
        // 추가 성향 분석
        if (personality.includes('분석') || personality.includes('논리') || personality.includes('체계') || personality.includes('합리')) stats.analytical++;
        if (personality.includes('창의') || personality.includes('상상') || personality.includes('예술') || personality.includes('독창')) stats.creative++;
        if (personality.includes('리더') || personality.includes('주도') || personality.includes('이끌') || personality.includes('통솔')) stats.leadership++;
        if (personality.includes('협력') || personality.includes('팀') || personality.includes('배려') || personality.includes('소통')) stats.collaborative++;
        if (personality.includes('세심') || personality.includes('꼼꼼') || personality.includes('정확') || personality.includes('완벽')) stats.detail_oriented++;
        if (personality.includes('적응') || personality.includes('유연') || personality.includes('변화') || personality.includes('개방')) stats.adaptable++;
      }
    });
    
    return stats;
  };

  const getDominantValue = (members, field) => {
    const counts = {};
    members.forEach(member => {
      const value = member[field];
      if (value) {
        counts[value] = (counts[value] || 0) + 1;
      }
    });
    
    return Object.entries(counts).sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';
  };

  const getCommonSkills = (members) => {
    const skillCounts = {};
    members.forEach(member => {
      if (member.skills) {
        member.skills.split(',').forEach(skill => {
          const trimmedSkill = skill.trim();
          skillCounts[trimmedSkill] = (skillCounts[trimmedSkill] || 0) + 1;
        });
      }
    });
    
    return Object.entries(skillCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([skill]) => skill);
  };

  // 2. 벨빈 팀 역할 분류
  const classifyBelbinRoles = (persons) => {
    const classifyPerson = (person) => {
      const scores = {
        Plant: 0,           // 창조자
        ResourceInvestigator: 0, // 자원탐색가  
        Coordinator: 0,     // 조정자
        Shaper: 0,         // 추진자
        MonitorEvaluator: 0, // 냉철판단자
        Specialist: 0,      // 전문가
        Implementer: 0,     // 실행자
        Teamworker: 0,      // 분위기조성자
        Finisher: 0         // 완결자
      };

      // 성격 기반 점수 계산
      if (person.personality) {
        const personality = person.personality.toLowerCase();
        
        // MBTI 기반 추론
        if (personality.includes('entp') || personality.includes('enfp')) {
          scores.Plant += 3;
          scores.ResourceInvestigator += 2;
        }
        if (personality.includes('estj') || personality.includes('entj')) {
          scores.Coordinator += 3;
          scores.Shaper += 2;
        }
        if (personality.includes('intp') || personality.includes('intj')) {
          scores.MonitorEvaluator += 3;
          scores.Plant += 1;
        }
        if (personality.includes('isfj') || personality.includes('esfj')) {
          scores.Teamworker += 3;
          scores.Implementer += 2;
        }
        if (personality.includes('istj') || personality.includes('isfp')) {
          scores.Implementer += 3;
          scores.Finisher += 2;
        }
        
        // 키워드 기반 추론
        if (personality.includes('창의') || personality.includes('혁신')) {
          scores.Plant += 2;
        }
        if (personality.includes('리더') || personality.includes('지도')) {
          scores.Coordinator += 2;
          scores.Shaper += 1;
        }
        if (personality.includes('분석') || personality.includes('논리')) {
          scores.MonitorEvaluator += 2;
        }
        if (personality.includes('협력') || personality.includes('팀워크')) {
          scores.Teamworker += 2;
        }
        if (personality.includes('완벽') || personality.includes('세심')) {
          scores.Finisher += 2;
        }
      }

      // 스킬 기반 점수 계산
      if (person.skills) {
        const skills = person.skills.toLowerCase();
        
        if (skills.includes('프로그래밍') || skills.includes('개발')) {
          scores.Specialist += 2;
          scores.Implementer += 1;
        }
        if (skills.includes('디자인') || skills.includes('창작')) {
          scores.Plant += 2;
        }
        if (skills.includes('관리') || skills.includes('기획')) {
          scores.Coordinator += 2;
        }
        if (skills.includes('분석') || skills.includes('데이터')) {
          scores.MonitorEvaluator += 2;
          scores.Specialist += 1;
        }
        if (skills.includes('소통') || skills.includes('커뮤니케이션')) {
          scores.ResourceInvestigator += 2;
          scores.Teamworker += 1;
        }
      }

      // 직업 기반 점수 계산
      if (person.professional) {
        const job = person.professional.toLowerCase();
        
        if (job.includes('개발자') || job.includes('엔지니어')) {
          scores.Specialist += 2;
          scores.Implementer += 1;
        }
        if (job.includes('매니저') || job.includes('팀장')) {
          scores.Coordinator += 3;
        }
        if (job.includes('연구') || job.includes('분석')) {
          scores.MonitorEvaluator += 2;
          scores.Specialist += 1;
        }
        if (job.includes('디자인') || job.includes('기획')) {
          scores.Plant += 2;
        }
        if (job.includes('영업') || job.includes('마케팅')) {
          scores.ResourceInvestigator += 3;
        }
      }

      // 선호/비선호 기반 점수 계산
      if (person.preferences) {
        const prefs = person.preferences.toLowerCase();
        
        if (prefs.includes('새로운') || prefs.includes('창의')) {
          scores.Plant += 1;
        }
        if (prefs.includes('협력') || prefs.includes('팀')) {
          scores.Teamworker += 1;
        }
        if (prefs.includes('체계') || prefs.includes('계획')) {
          scores.Implementer += 1;
          scores.Finisher += 1;
        }
      }

      // 가장 높은 점수의 역할 반환
      const topRole = Object.entries(scores).sort(([,a], [,b]) => b - a)[0];
      return {
        role: topRole[0],
        score: topRole[1],
        person: person
      };
    };

    const classifications = persons.map(classifyPerson);
    
    // 벨빈 역할별로 그룹화
    const roleGroups = {
      Plant: [],
      ResourceInvestigator: [],
      Coordinator: [],
      Shaper: [],
      MonitorEvaluator: [],
      Specialist: [],
      Implementer: [],
      Teamworker: [],
      Finisher: []
    };

    classifications.forEach(classification => {
      roleGroups[classification.role].push(classification);
    });

    return roleGroups;
  };

  // 벨빈 역할 한국어 이름 매핑
  const belbinRoleNames = {
    Plant: '창조자',
    ResourceInvestigator: '자원탐색가',
    Coordinator: '조정자', 
    Shaper: '추진자',
    MonitorEvaluator: '냉철판단자',
    Specialist: '전문가',
    Implementer: '실행자',
    Teamworker: '분위기조성자',
    Finisher: '완결자'
  };

  // 벨빈 역할 설명 매핑
  const belbinRoleDescriptions = {
    Plant: '새로운 아이디어를 끊임없이 떠올리는 혁신적인 역할',
    ResourceInvestigator: '외부 자원을 탐색하고, 아이디어를 현실화하는 데 적극적',
    Coordinator: '팀의 목표를 명확히 하고, 구성원들이 목표를 향해 나아가도록 도움',
    Shaper: '장애물을 제거하고, 팀의 목표 달성을 위해 적극적으로 행동',
    MonitorEvaluator: '객관적인 관점에서 상황을 분석하고, 최선의 의사결정을 도움',
    Specialist: '특정 분야의 전문 지식과 기술을 제공하여 팀의 기술적 과제를 해결',
    Implementer: '아이디어를 실현하고, 계획을 체계적으로 수행',
    Teamworker: '팀원 간의 관계를 원만하게 유지하고, 팀워크를 향상',
    Finisher: '작업의 세부적인 부분까지 꼼꼼하게 챙기고, 기한 내에 완료되도록 관리'
  };

  const persons = getAllPersons();
  const clusters = performAutoClustering(persons);
  const belbinClassification = classifyBelbinRoles(persons);

  return (
    <div className="character-type-analysis">
      <div className="analysis-header">
        <h2>🎭 캐릭터 유형 분석</h2>
        <p>총 {persons.length}명 (에이전트 {persons.filter(p => p.type === 'agent').length}명, 사용자 {persons.filter(p => p.type === 'user').length}명)</p>
      </div>

      <div className="analysis-tabs">
        <button 
          className={`tab-button ${activeTab === 'clustering' ? 'active' : ''}`}
          onClick={() => setActiveTab('clustering')}
        >
          🔍 자동 클러스터링
        </button>
        <button 
          className={`tab-button ${activeTab === 'belbin' ? 'active' : ''}`}
          onClick={() => setActiveTab('belbin')}
        >
          🎯 벨빈 팀 역할
        </button>
      </div>

      <div className="analysis-tab-content">
        {activeTab === 'clustering' && (
          <div className="clustering-analysis">
            <h3>📊 데이터 기반 자동 클러스터링</h3>
            <p className="section-description">
              9개 특성(나이, 성별, 성격, 학력, 스킬, 직업, 선호, 싫어, 업무)을 벡터화하여 
              유사한 특성을 가진 인원들을 자동으로 그룹화했습니다.
            </p>
            
            <div className="clusters-container">
              {clusters.map(cluster => (
                <div key={cluster.id} className="cluster-card">
                  <div className="cluster-header">
                    <h4>🏷️ {cluster.name}</h4>
                    <span className="cluster-size">{cluster.size}명</span>
                  </div>
                  
                  <div className="cluster-characteristics">
                    <div className="characteristic-item">
                      <strong>주요 연령대:</strong> {cluster.characteristics.dominantAge}
                    </div>
                    <div className="characteristic-item">
                      <strong>주요 성별:</strong> {cluster.characteristics.dominantGender}
                    </div>
                    <div className="characteristic-item">
                      <strong>주요 학력:</strong> {cluster.characteristics.dominantEducation}
                    </div>
                    <div className="characteristic-item">
                      <strong>공통 스킬:</strong> {cluster.characteristics.commonSkills.join(', ') || '없음'}
                    </div>
                    
                    {/* 선호도 특성 */}
                    {cluster.characteristics.commonPreferences.length > 0 && (
                      <div className="characteristic-item">
                        <strong>💝 공통 선호:</strong> {cluster.characteristics.commonPreferences.map(item => `${item.pref} (${item.count}명)`).join(', ')}
                      </div>
                    )}
                    
                    {/* 비선호 특성 */}
                    {cluster.characteristics.commonDislikes.length > 0 && (
                      <div className="characteristic-item">
                        <strong>😫 공통 비선호:</strong> {cluster.characteristics.commonDislikes.map(item => `${item.dislike} (${item.count}명)`).join(', ')}
                      </div>
                    )}
                    
                    {/* 업무스타일 특성 */}
                    {cluster.characteristics.commonWorkStyles.length > 0 && (
                      <div className="characteristic-item">
                        <strong>⚙️ 업무스타일:</strong> {cluster.characteristics.commonWorkStyles.map(item => `${item.style} (${item.count}명)`).join(', ')}
                      </div>
                    )}
                    
                    {/* 성격 특성 */}
                    {cluster.characteristics.commonPersonalities.length > 0 && (
                      <div className="characteristic-item">
                        <strong>🧠 공통 성격:</strong> {cluster.characteristics.commonPersonalities.map(item => `${item.personality} (${item.count}명)`).join(', ')}
                      </div>
                    )}
                    
                    {/* 선호도 패턴 분석 */}
                    <div className="characteristic-patterns">
                      <div className="pattern-section">
                        <strong>🎯 선호 패턴:</strong>
                        {(() => {
                          const prefs = cluster.characteristics.preferencesStats;
                          const topPrefs = Object.entries(prefs).filter(([,count]) => count > 0).sort(([,a], [,b]) => b - a).slice(0, 3);
                          const prefLabels = {
                            teamwork: '팀워크 지향',
                            creative: '창의 지향', 
                            systematic: '체계 지향',
                            flexible: '유연 지향',
                            learning: '학습 지향',
                            challenge: '도전 지향'
                          };
                          return topPrefs.map(([key, count]) => `${prefLabels[key]} (${count}명)`).join(', ') || '없음';
                        })()}
                      </div>
                      
                      <div className="pattern-section">
                        <strong>🚫 회피 패턴:</strong>
                        {(() => {
                          const dislikes = cluster.characteristics.dislikesStats;
                          const topDislikes = Object.entries(dislikes).filter(([,count]) => count > 0).sort(([,a], [,b]) => b - a).slice(0, 3);
                          const dislikeLabels = {
                            conflict: '갈등 회피',
                            pressure: '압박 회피',
                            routine: '반복 회피',
                            uncertainty: '불확실성 회피',
                            micromanage: '간섭 회피',
                            isolation: '고립 회피'
                          };
                          return topDislikes.map(([key, count]) => `${dislikeLabels[key]} (${count}명)`).join(', ') || '없음';
                        })()}
                      </div>
                      
                      <div className="pattern-section">
                        <strong>💼 작업 방식:</strong>
                        {(() => {
                          const workStyles = cluster.characteristics.workStyleStats;
                          const topStyles = Object.entries(workStyles).filter(([,count]) => count > 0).sort(([,a], [,b]) => b - a).slice(0, 3);
                          const styleLabels = {
                            systematic: '체계적',
                            collaborative: '협업적',
                            independent: '독립적',
                            detailOriented: '세심함',
                            quickExecution: '신속함',
                            innovative: '혁신적'
                          };
                          return topStyles.map(([key, count]) => `${styleLabels[key]} (${count}명)`).join(', ') || '없음';
                        })()}
                      </div>
                      
                      <div className="pattern-section">
                        <strong>🧠 성격 패턴:</strong>
                        {(() => {
                          const personalities = cluster.characteristics.personalityStats;
                          const mbtiPatterns = [];
                          const traitPatterns = [];
                          
                          // MBTI 패턴 분석
                          if (personalities.extrovert > personalities.introvert) mbtiPatterns.push(`외향형 (${personalities.extrovert}명)`);
                          else if (personalities.introvert > personalities.extrovert) mbtiPatterns.push(`내향형 (${personalities.introvert}명)`);
                          
                          if (personalities.intuitive > personalities.sensing) mbtiPatterns.push(`직관형 (${personalities.intuitive}명)`);
                          else if (personalities.sensing > personalities.intuitive) mbtiPatterns.push(`감각형 (${personalities.sensing}명)`);
                          
                          if (personalities.thinking > personalities.feeling) mbtiPatterns.push(`사고형 (${personalities.thinking}명)`);
                          else if (personalities.feeling > personalities.thinking) mbtiPatterns.push(`감정형 (${personalities.feeling}명)`);
                          
                          if (personalities.judging > personalities.perceiving) mbtiPatterns.push(`판단형 (${personalities.judging}명)`);
                          else if (personalities.perceiving > personalities.judging) mbtiPatterns.push(`인식형 (${personalities.perceiving}명)`);
                          
                          // 추가 성향 패턴
                          const topTraits = Object.entries({
                            analytical: personalities.analytical,
                            creative: personalities.creative,
                            leadership: personalities.leadership,
                            collaborative: personalities.collaborative,
                            detail_oriented: personalities.detail_oriented,
                            adaptable: personalities.adaptable
                          }).filter(([,count]) => count > 0).sort(([,a], [,b]) => b - a).slice(0, 2);
                          
                          const traitLabels = {
                            analytical: '분석적',
                            creative: '창의적',
                            leadership: '리더십',
                            collaborative: '협력적',
                            detail_oriented: '세심함',
                            adaptable: '적응적'
                          };
                          
                          topTraits.forEach(([key, count]) => {
                            traitPatterns.push(`${traitLabels[key]} (${count}명)`);
                          });
                          
                          const allPatterns = [...mbtiPatterns, ...traitPatterns];
                          return allPatterns.join(', ') || '없음';
                        })()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="cluster-members">
                    <div 
                      className="members-header-clickable"
                      onClick={() => setExpandedClusters(prev => ({
                        ...prev,
                        [cluster.id]: !prev[cluster.id]
                      }))}
                      style={{ cursor: 'pointer', padding: '8px 0' }}
                    >
                      <h5>
                        구성원 ({cluster.size}명) - 
                        사용자 {cluster.members.filter(m => m.type === 'user').length}명, 
                        AI 에이전트 {cluster.members.filter(m => m.type === 'agent').length}명
                        <span style={{ marginLeft: '8px' }}>
                          {expandedClusters[cluster.id] ? '▼' : '▶'}
                        </span>
                      </h5>
                    </div>
                    {expandedClusters[cluster.id] && (
                      <div className="members-list">
                        {cluster.members.map((member, index) => (
                          <div key={index} className="member-item">
                            <span className={`member-type ${member.type}`}>
                              {member.type === 'agent' ? '🤖' : '👤'}
                            </span>
                            <span className="member-name">{member.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'belbin' && (
          <div className="belbin-analysis">
            <h3>🎯 벨빈 9가지 팀 역할 분석</h3>
            <p className="section-description">
              개인의 성격, 스킬, 직업, 선호도를 분석하여 벨빈의 9가지 팀 역할에 따라 분류했습니다.
              균형잡힌 팀 구성을 위한 참고자료로 활용하세요.
            </p>

            <div className="belbin-roles-container">
              {Object.entries(belbinClassification).map(([role, members]) => (
                <div key={role} className={`belbin-role-card ${members.length === 0 ? 'empty' : ''}`}>
                  <div className="role-header">
                    <h4>{belbinRoleNames[role]}</h4>
                    <span className="role-count">{members.length}명</span>
                  </div>
                  
                  <div className="role-description">
                    {belbinRoleDescriptions[role]}
                  </div>
                  
                  {members.length > 0 && (
                    <div className="role-members">
                      <div 
                        className="members-header-clickable"
                        onClick={() => setExpandedBelbinRoles(prev => ({
                          ...prev,
                          [role]: !prev[role]
                        }))}
                        style={{ cursor: 'pointer', padding: '8px 0' }}
                      >
                        <h5>
                          구성원 ({members.length}명) - 
                          사용자 {members.filter(m => m.person.type === 'user').length}명, 
                          AI 에이전트 {members.filter(m => m.person.type === 'agent').length}명
                          <span style={{ marginLeft: '8px' }}>
                            {expandedBelbinRoles[role] ? '▼' : '▶'}
                          </span>
                        </h5>
                      </div>
                      {expandedBelbinRoles[role] && (
                        <div className="members-grid">
                          {members.map((member, index) => (
                            <div key={index} className="belbin-member-item">
                              <div className="member-info">
                                <span className={`member-type ${member.person.type}`}>
                                  {member.person.type === 'agent' ? '🤖' : '👤'}
                                </span>
                                <span className="member-name">{member.person.name}</span>
                                <span className="member-score">({member.score}점)</span>
                              </div>
                              <div className="member-details">
                                {member.person.professional && (
                                  <small>💼 {member.person.professional}</small>
                                )}
                                {member.person.personality && (
                                  <small>🧠 {member.person.personality.substring(0, 20)}...</small>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  {members.length === 0 && (
                    <div className="empty-role">
                      <p>해당 역할에 분류된 인원이 없습니다.</p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* 벨빈 역할 균형도 분석 */}
            <div className="belbin-balance-analysis">
              <h4>📊 팀 역할 균형도 분석</h4>
              <div className="balance-chart">
                {Object.entries(belbinClassification).map(([role, members]) => {
                  const percentage = (members.length / persons.length) * 100;
                  return (
                    <div key={role} className="balance-item">
                      <div className="balance-label">
                        {belbinRoleNames[role]}
                      </div>
                      <div className="balance-bar">
                        <div 
                          className="balance-fill"
                          style={{ width: `${percentage}%`, backgroundColor: '#4A90E2' }}
                        />
                        <span className="balance-value">
                          {members.length}명 ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CharacterTypeAnalysis;