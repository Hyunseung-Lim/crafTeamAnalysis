import React, { useState } from 'react';

const MentalModelAnalysis = ({ analysisData }) => {
  const [selectedComparison, setSelectedComparison] = useState(null);

  if (!analysisData) return null;

  // 안전한 데이터 접근을 위한 헬퍼 함수
  const safeGet = (path, defaultValue = {}) => {
    try {
      return path || defaultValue;
    } catch (e) {
      return defaultValue;
    }
  };

  const participantChanges = safeGet(analysisData.participantMentalModelChanges, {});

  // 간단하고 정확한 diff 계산 함수
  const calculateSimpleDiff = (text1, text2) => {
    if (!text1 && !text2) return { result: [], hasChanges: false };
    if (!text1) return { 
      result: [{ type: 'added', content: text2 }], 
      hasChanges: true 
    };
    if (!text2) return { 
      result: [{ type: 'deleted', content: text1 }], 
      hasChanges: true 
    };

    // 정확히 같으면 변경 없음
    if (text1 === text2) {
      return { result: [{ type: 'same', content: text1 }], hasChanges: false };
    }

    // 단어 단위로 분리 (공백, 줄바꿈, 특수문자 경계 고려)
    const words1 = text1.split(/(\s+|[^\w\s가-힣]+)/).filter(w => w.length > 0);
    const words2 = text2.split(/(\s+|[^\w\s가-힣]+)/).filter(w => w.length > 0);
    
    const lcs = getLCS(words1, words2);
    const rawResult = buildDiffFromLCS(words1, words2, lcs);
    
    // 디버깅: 원본 diff 결과 출력
    console.log('Raw diff result:', rawResult.map(item => `[${item.type}:"${item.content}"]`).join(', '));
    
    // 연속된 같은 타입의 변경사항들 합치기
    const result = mergeConsecutiveChanges(rawResult);
    
    // 디버깅: 합쳐진 diff 결과 출력
    console.log('Merged diff result:', result.map(item => `[${item.type}:"${item.content}"]`).join(', '));
    
    const hasChanges = result.some(item => item.type !== 'same');
    return { result, hasChanges };
  };

  // 연속된 같은 타입의 변경사항들을 합치는 함수 (간단한 방식)
  const mergeConsecutiveChanges = (rawResult) => {
    if (rawResult.length === 0) return rawResult;
    
    // 단순하게 연속된 같은 타입만 합치기 (띄어쓰기 복잡한 로직 제거)
    const merged = [];
    let currentItem = { ...rawResult[0] };
    
    for (let i = 1; i < rawResult.length; i++) {
      const item = rawResult[i];
      
      // 같은 타입이면 내용을 합치기
      if (item.type === currentItem.type) {
        currentItem.content += item.content;
      } else {
        // 다른 타입이면 현재 항목을 결과에 추가하고 새로 시작
        merged.push(currentItem);
        currentItem = { ...item };
      }
    }
    
    // 마지막 항목 추가
    merged.push(currentItem);
    
    return merged;
  };

  // 렌더링용: 공격적으로 연속된 변경사항들을 합치는 함수
  const renderDiffItems = (diffResult, targetType) => {
    const elements = [];
    let i = 0;
    
    while (i < diffResult.length) {
      const item = diffResult[i];
      
      // 대상 타입에 맞지 않는 항목 스킵
      if ((targetType === 'before' && item.type === 'added') || 
          (targetType === 'after' && item.type === 'deleted')) {
        i++;
        continue;
      }
      
      // 변경사항(deleted 또는 added)인 경우 연속된 같은 타입들을 모두 합치기
      if (item.type === 'deleted' || item.type === 'added') {
        let mergedContent = item.content;
        let j = i + 1;
        
        // 앞으로 보면서 같은 타입이거나 띄어쓰기를 통해 연결된 같은 타입들을 모두 수집
        while (j < diffResult.length) {
          const nextItem = diffResult[j];
          
          // 대상 타입에 맞지 않는 항목은 스킵하고 계속 진행
          if ((targetType === 'before' && nextItem.type === 'added') || 
              (targetType === 'after' && nextItem.type === 'deleted')) {
            j++;
            continue;
          }
          
          // 같은 변경 타입이면 합치기
          if (nextItem.type === item.type) {
            mergedContent += nextItem.content;
            j++;
          }
          // 띄어쓰기면 포함하고 계속 진행
          else if (nextItem.type === 'same' && /^\s+$/.test(nextItem.content)) {
            mergedContent += nextItem.content;
            j++;
          }
          // 일반 텍스트거나 다른 변경사항이면 중단
          else {
            break;
          }
        }
        
        // 합쳐진 변경사항을 elements에 추가
        elements.push(
          <span key={elements.length} 
                className={`highlight-${item.type}`}
                title={item.type === 'deleted' ? '삭제된 부분' : '추가된 부분'}>
            {mergedContent}
          </span>
        );
        
        i = j; // 처리한 위치로 이동
      }
      // 일반 텍스트(same)인 경우
      else {
        let mergedContent = item.content;
        let j = i + 1;
        
        // 연속된 same 타입들 합치기
        while (j < diffResult.length && diffResult[j].type === 'same') {
          mergedContent += diffResult[j].content;
          j++;
        }
        
        elements.push(
          <span key={elements.length} className="highlight-same">
            {mergedContent}
          </span>
        );
        
        i = j;
      }
    }
    
    return elements;
  };


  // 정확한 LCS 계산 (완전히 같은 것만 매칭)
  const getLCS = (arr1, arr2) => {
    const m = arr1.length;
    const n = arr2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (arr1[i-1] === arr2[j-1]) {
          dp[i][j] = dp[i-1][j-1] + 1;
        } else {
          dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
        }
      }
    }
    
    // LCS 역추적
    const lcs = [];
    let i = m, j = n;
    while (i > 0 && j > 0) {
      if (arr1[i-1] === arr2[j-1]) {
        lcs.unshift({ word: arr1[i-1], pos1: i-1, pos2: j-1 });
        i--;
        j--;
      } else if (dp[i-1][j] > dp[i][j-1]) {
        i--;
      } else {
        j--;
      }
    }
    
    return lcs;
  };

  // LCS를 기반으로 기본적인 diff 결과 생성
  const buildDiffFromLCS = (words1, words2, lcs) => {
    const result = [];
    let i = 0, j = 0, lcsIdx = 0;
    
    while (i < words1.length || j < words2.length) {
      const nextLCS = lcs[lcsIdx];
      
      if (nextLCS && i === nextLCS.pos1 && j === nextLCS.pos2) {
        // LCS 매치
        result.push({ type: 'same', content: nextLCS.word });
        i++;
        j++;
        lcsIdx++;
      } else if (nextLCS && i < nextLCS.pos1 && j < nextLCS.pos2) {
        // 양쪽에 다른 내용
        result.push({ type: 'deleted', content: words1[i] });
        result.push({ type: 'added', content: words2[j] });
        i++;
        j++;
      } else if (nextLCS && i < nextLCS.pos1) {
        // 삭제된 부분
        result.push({ type: 'deleted', content: words1[i] });
        i++;
      } else if (nextLCS && j < nextLCS.pos2) {
        // 추가된 부분
        result.push({ type: 'added', content: words2[j] });
        j++;
      } else if (i < words1.length) {
        // 남은 삭제 부분
        result.push({ type: 'deleted', content: words1[i] });
        i++;
      } else if (j < words2.length) {
        // 남은 추가 부분
        result.push({ type: 'added', content: words2[j] });
        j++;
      }
    }
    
    return result;
  };

  return (
    <div className="analysis-content">
      <div className="analysis-section">
        <h3>🧠 멘탈 모델 변화 분석</h3>
        <p className="analysis-description">
          각 참가자가 팀1 → 팀2 → 팀3으로 진행하면서 공유 멘탈 모델을 어떻게 수정했는지 분석한 결과입니다.
          <br />
          <small>💡 팁: 변화 구간을 클릭하면 상세 비교를 볼 수 있습니다.</small>
        </p>
        
        <div className="participant-changes-container">
          {Object.entries(participantChanges).map(([participantName, data]) => (
            <div key={participantName} className="participant-change-card">
              <div className="participant-header">
                <h4>
                  {participantName} 
                  <span className="participant-meta">
                    ({data?.totalTeams || 0}개 팀)
                  </span>
                </h4>
                {data?.hasAnyChanges && (
                  <span className="changes-badge">
                    변경 있음
                  </span>
                )}
              </div>
              
              <div className="mental-model-progression">
                {(data?.changes || []).map((change, index) => {
                  const comparisonKey = `${participantName}-${index}`;
                  const isExpanded = selectedComparison === comparisonKey;
                  const diff = calculateSimpleDiff(change?.prevModel || '', change?.currModel || '');
                  
                  return (
                    <div key={index} className="change-progression">
                      <div 
                        className={`change-header-clickable ${diff.hasChanges ? 'has-changes' : 'no-changes'}`}
                        onClick={() => setSelectedComparison(isExpanded ? null : comparisonKey)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="progression-title">
                          <span className="team-transition">
                            팀 {change?.fromTeam || '?'} → 팀 {change?.toTeam || '?'}
                          </span>
                          <span className="expand-indicator">
                            {isExpanded ? '▼' : '▶'} {diff.hasChanges ? '변경 있음' : '변경 없음'}
                          </span>
                        </div>
                        <div className="length-info">
                          <span className={`length-change ${(change?.lengthChange || 0) > 0 ? 'increase' : (change?.lengthChange || 0) < 0 ? 'decrease' : 'same'}`}>
                            {change?.prevLength || 0} → {change?.currLength || 0} 음절 
                            ({change?.lengthChange > 0 ? '+' : ''}{change?.lengthChange || 0})
                          </span>
                        </div>
                      </div>
                      
                      {isExpanded && (
                        <div className="detailed-comparison">
                          {change?.isIdentical ? (
                            <div className="no-changes-message">
                              <p>🔄 변경 사항 없음 - 동일한 멘탈 모델 유지</p>
                              <div className="unchanged-content">
                                <strong>내용:</strong> {change?.prevModel || '내용 없음'}
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="simple-comparison">
                                <div className="comparison-column">
                                  <h6>📝 팀 {change?.fromTeam} (변경 전)</h6>
                                  <div className="model-content-with-highlights">
                                    {renderDiffItems(diff.result, 'before')}
                                  </div>
                                </div>
                                
                                <div className="comparison-column">
                                  <h6>📝 팀 {change?.toTeam} (변경 후)</h6>
                                  <div className="model-content-with-highlights">
                                    {renderDiffItems(diff.result, 'after')}
                                  </div>
                                </div>
                              </div>
                              
                              <div className="comparison-legend">
                                <span className="legend-item">
                                  <span className="highlight-deleted">삭제된 부분</span>
                                </span>
                                <span className="legend-item">
                                  <span className="highlight-added">추가된 부분</span>
                                </span>
                                <span className="legend-item">
                                  <span className="highlight-same">변경없는 부분</span>
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="change-summary">
          <h4>📈 변경 요약</h4>
          <div className="summary-stats">
            <div className="summary-item">
              <strong>총 참가자 수:</strong> {Object.keys(participantChanges).length}명
            </div>
            <div className="summary-item">
              <strong>변경한 참가자:</strong> {Object.values(participantChanges).filter(p => p?.hasAnyChanges).length}명
            </div>
            <div className="summary-item">
              <strong>동일 유지 참가자:</strong> {Object.values(participantChanges).filter(p => !p?.hasAnyChanges).length}명
            </div>
            <div className="summary-item">
              <strong>중요 변경이 있는 참가자:</strong> {Object.values(participantChanges).filter(p => p?.significantChanges > 0).length}명
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MentalModelAnalysis;