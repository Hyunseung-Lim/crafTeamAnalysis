import React, { useEffect, useRef } from 'react';
import './NetworkGraph.css';

const NetworkGraph = ({ team, colorMode = 'default' }) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!team || !svgRef.current) return;

    const svg = svgRef.current;
    const width = 600;
    const height = 400;

    // SVG 초기화
    svg.innerHTML = '';
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    // 화살표 마커 정의 추가
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('markerWidth', '10');
    marker.setAttribute('markerHeight', '7');
    marker.setAttribute('refX', '9');
    marker.setAttribute('refY', '3.5');
    marker.setAttribute('orient', 'auto');
    
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
    polygon.setAttribute('fill', '#4a5568');
    
    marker.appendChild(polygon);
    defs.appendChild(marker);
    svg.appendChild(defs);

    // 데이터 파싱
    const positions = parseNodePositions(team.team_info?.nodePositions || '{}');
    const relationships = parseRelationships(team.team_info?.relationships || '[]');
    const members = parseMembers(team.team_info?.members || '[]');

    if (Object.keys(positions).length === 0) {
      // 포지션 정보가 없을 때 기본 레이아웃
      createDefaultLayout(svg, team, width, height);
    } else {
      // 포지션 정보가 있을 때
      createPositionedLayout(svg, team, positions, relationships, members, width, height);
    }
  }, [team, colorMode]);

  const parseNodePositions = (nodePositionsString) => {
    try {
      return JSON.parse(nodePositionsString);
    } catch {
      return {};
    }
  };

  const parseRelationships = (relationshipsString) => {
    try {
      return JSON.parse(relationshipsString);
    } catch {
      return [];
    }
  };

  const parseMembers = (membersString) => {
    try {
      return JSON.parse(membersString);
    } catch {
      return [];
    }
  };

  const getNodeInfo = (nodeId, team) => {
    if (nodeId === "나") {
      const ownerInfo = team.owner_info || {};
      // members에서 사용자의 isLeader 정보 찾기
      const members = parseMembers(team.team_info?.members || '[]');
      const userMember = members.find(member => member.isUser === true);
      
      // 사용자의 실제 아이디어 생성 여부 확인
      let actuallyGenerated = false;
      if (team.ideas && team.ideas.length > 0) {
        actuallyGenerated = team.ideas.some(idea => {
          const parsedIdea = typeof idea === 'string' ? JSON.parse(idea) : idea;
          return parsedIdea.author === '나';
        });
      }
      
      return {
        name: ownerInfo.name || '나',
        type: 'user',
        professional: ownerInfo.professional || 'Owner',
        isLeader: userMember?.isLeader || false,
        roles: userMember?.roles || [],
        actuallyGenerated: actuallyGenerated
      };
    }

    // A, B, C, D, E 형태의 node_key로 agent 찾기
    for (const agent of team.agents || []) {
      if (agent.node_key === nodeId) {
        const agentInfo = agent.agent_info || {};
        return {
          name: agentInfo.name || 'Unknown',
          type: 'agent',
          professional: agentInfo.professional || 'Unknown',
          isLeader: agent.isLeader || false,
          roles: agent.roles || [],
          agentId: agent.agentId
        };
      }
    }

    return {
      name: nodeId,
      type: 'unknown',
      professional: 'Unknown',
      isLeader: false,
      roles: []
    };
  };

  const getRoleBasedColor = (nodeInfo) => {
    if (nodeInfo.type === 'user') {
      const hasGeneration = nodeInfo.roles?.includes('아이디어 생성하기') || false;
      const hasEvaluation = nodeInfo.roles?.includes('아이디어 평가하기') || false;
      const hasFeedback = nodeInfo.roles?.includes('피드백하기') || false;
      const actuallyGenerated = nodeInfo.actuallyGenerated || false;
      
      // 사용자인 경우 실제 생성 여부도 고려
      const effectiveGeneration = hasGeneration && actuallyGenerated;
      
      // 생성(실제 생성함) + (평가 또는 피드백) = 보라색
      if (effectiveGeneration && (hasEvaluation || hasFeedback)) {
        return '#8A2BE2';
      }
      // 생성(실제 생성함)만 = 파란색
      else if (effectiveGeneration) {
        return '#0000FF';
      }
      // 평가 또는 피드백만, 또는 생성 역할 있지만 실제 생성 안함 = 빨간색
      else if (hasEvaluation || hasFeedback || (hasGeneration && !actuallyGenerated)) {
        return '#FF0000';
      }
      // 역할 없음 = 회색
      else {
        return '#95A5A6';
      }
    } else if (nodeInfo.type === 'agent') {
      const hasGeneration = nodeInfo.roles?.includes('아이디어 생성하기') || false;
      const hasEvaluation = nodeInfo.roles?.includes('아이디어 평가하기') || false;
      const hasFeedback = nodeInfo.roles?.includes('피드백하기') || false;
      
      // 에이전트는 기존 로직 유지
      if (hasGeneration && (hasEvaluation || hasFeedback)) {
        return '#8A2BE2';
      } else if (hasGeneration) {
        return '#0000FF';
      } else if (hasEvaluation || hasFeedback) {
        return '#FF0000';
      } else {
        return '#95A5A6';
      }
    } else {
      return '#95A5A6';
    }
  };

  const createPositionedLayout = (svg, team, positions, relationships, members, width, height) => {
    console.log('Positions:', positions);
    console.log('Relationships:', relationships);
    
    // 실제 존재하는 agent들의 ID를 수집
    const existingAgentIds = new Set();
    for (const agent of team.agents || []) {
      existingAgentIds.add(agent.agentId);
    }

    // positions에서 실제 존재하지 않는 agent 노드 제거
    const filteredPositions = {};
    for (const [nodeId, pos] of Object.entries(positions)) {
      if (nodeId === '나') {
        filteredPositions[nodeId] = pos;
      } else {
        // node_key를 agent_id로 변환해서 확인
        let agentId = null;
        for (const agent of team.agents || []) {
          if (agent.node_key === nodeId) {
            agentId = agent.agentId;
            break;
          }
        }
        
        if (agentId && existingAgentIds.has(agentId)) {
          filteredPositions[nodeId] = pos;
        }
      }
    }

    if (Object.keys(filteredPositions).length === 0) {
      console.log('No valid positions found, using default layout');
      createDefaultLayout(svg, team, width, height);
      return;
    }
    
    // 좌표를 정규화 (원본과 반대로)
    const positionArray = Object.values(filteredPositions);
    const minX = Math.min(...positionArray.map(p => p.x));
    const maxX = Math.max(...positionArray.map(p => p.x));
    const minY = Math.min(...positionArray.map(p => p.y));
    const maxY = Math.max(...positionArray.map(p => p.y));

    const padding = 60;
    const scaleX = (width - 2 * padding) / (maxX - minX || 1);
    const scaleY = (height - 2 * padding) / (maxY - minY || 1);

    const normalizedPositions = {};
    for (const [nodeId, pos] of Object.entries(filteredPositions)) {
      // X축은 그대로, Y축은 반대로
      normalizedPositions[nodeId] = {
        x: padding + (pos.x - minX) * scaleX,
        y: height - padding - (pos.y - minY) * scaleY  // Y축 반전
      };
    }

    console.log('Normalized positions:', normalizedPositions);

    // 관계선 먼저 그리기
    const relationshipsG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    relationshipsG.setAttribute('class', 'relationships');
    svg.appendChild(relationshipsG);

    // relationships에서 실제 존재하는 agent만 사용하도록 필터링
    const filteredRelationships = [];
    for (const rel of relationships) {
      let fromNode = rel.from;
      let toNode = rel.to;
      
      // '나'는 항상 포함, agent의 경우 실제 존재하는지 확인
      const fromExists = fromNode === '나' || existingAgentIds.has(fromNode);
      const toExists = toNode === '나' || existingAgentIds.has(toNode);
      
      if (fromExists && toExists) {
        // agent ID를 node_key로 변환
        if (fromNode !== '나') {
          const fromAgent = team.agents.find(agent => agent.agentId === fromNode);
          if (fromAgent) {
            fromNode = fromAgent.node_key;
          }
        }
        if (toNode !== '나') {
          const toAgent = team.agents.find(agent => agent.agentId === toNode);
          if (toAgent) {
            toNode = toAgent.node_key;
          }
        }
        
        filteredRelationships.push({
          from: fromNode,
          to: toNode,
          type: rel.type
        });
      }
    }

    const processedRelationships = filteredRelationships;

    console.log('Processed relationships:', processedRelationships);

    processedRelationships.forEach(rel => {
      if (normalizedPositions[rel.from] && normalizedPositions[rel.to]) {
        const fromPos = normalizedPositions[rel.from];
        const toPos = normalizedPositions[rel.to];
        console.log(`Drawing relationship from ${rel.from} to ${rel.to}:`, fromPos, toPos);
        drawRelationship(relationshipsG, fromPos, toPos, rel.type);
      } else {
        console.log(`Missing position for relationship ${rel.from} -> ${rel.to}`);
      }
    });

    // 노드 그리기
    const nodesG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodesG.setAttribute('class', 'nodes');
    svg.appendChild(nodesG);

    for (const [nodeId, pos] of Object.entries(normalizedPositions)) {
      const nodeInfo = getNodeInfo(nodeId, team);
      drawNode(nodesG, pos.x, pos.y, nodeInfo, nodeId);
    }
  };

  const createDefaultLayout = (svg, team, width, height) => {
    // 기본 원형 레이아웃
    const allMembers = [
      { id: '나', info: getNodeInfo('나', team) },
      ...team.agents.map(agent => ({ 
        id: agent.node_key || agent.agentId, 
        info: getNodeInfo(agent.node_key || agent.agentId, team) 
      }))
    ];

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.3;

    const positions = {};
    allMembers.forEach((member, index) => {
      const angle = (index * 2 * Math.PI) / allMembers.length;
      positions[member.id] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      };
    });

    // 노드 그리기
    const nodesG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodesG.setAttribute('class', 'nodes');
    svg.appendChild(nodesG);

    allMembers.forEach(member => {
      const pos = positions[member.id];
      drawNode(nodesG, pos.x, pos.y, member.info, member.id);
    });
  };

  const drawNode = (parent, x, y, nodeInfo, nodeId) => {
    const nodeG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodeG.setAttribute('class', `node ${nodeInfo.isLeader ? 'leader' : ''}`);
    nodeG.setAttribute('transform', `translate(${x}, ${y})`);

    // 노드 원
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', '25');
    
    // 색상 모드에 따라 다른 색상 적용
    if (colorMode === 'role') {
      const roleColor = getRoleBasedColor(nodeInfo);
      circle.setAttribute('fill', roleColor);
      if (nodeInfo.isLeader) {
        circle.setAttribute('stroke', '#FFD700');
        circle.setAttribute('stroke-width', '3');
      } else {
        circle.setAttribute('stroke', 'black');
        circle.setAttribute('stroke-width', '1');
      }
    } else {
      circle.setAttribute('class', `node-circle ${nodeInfo.type}`);
      if (nodeInfo.isLeader) {
        circle.classList.add('leader');
      }
    }

    nodeG.appendChild(circle);

    // 노드 키 텍스트 (A, B, C, D 등)
    const keyText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    keyText.setAttribute('text-anchor', 'middle');
    keyText.setAttribute('dy', '0.35em');
    keyText.setAttribute('class', 'node-key');
    
    // 역할별 보기에서 사용자인 경우 "ME" 표시
    if (colorMode === 'role' && nodeInfo.type === 'user') {
      keyText.textContent = 'ME';
      keyText.setAttribute('fill', 'white');
      keyText.setAttribute('font-weight', 'bold');
    } else {
      keyText.textContent = nodeId;
    }
    
    nodeG.appendChild(keyText);

    // 이름 라벨
    const nameText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    nameText.setAttribute('text-anchor', 'middle');
    nameText.setAttribute('y', '45');
    nameText.setAttribute('class', 'node-name');
    nameText.textContent = nodeInfo.name;
    nodeG.appendChild(nameText);

    // 역할 라벨
    if (nodeInfo.roles && nodeInfo.roles.length > 0) {
      const roleText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      roleText.setAttribute('text-anchor', 'middle');
      roleText.setAttribute('y', '60');
      roleText.setAttribute('class', 'node-role');
      
      const shortRoles = nodeInfo.roles.map(role => 
        role.replace('아이디어 ', '').replace('하기', '')
      ).join(', ');
      
      roleText.textContent = shortRoles.length > 20 ? shortRoles.substring(0, 17) + '...' : shortRoles;
      nodeG.appendChild(roleText);
    }

    parent.appendChild(nodeG);
  };

  const drawRelationship = (parent, fromPos, toPos, relType) => {
    const nodeRadius = 30; // 노드 반지름 + 여유 공간
    
    // 두 점 사이의 거리와 방향 계산
    const dx = toPos.x - fromPos.x;
    const dy = toPos.y - fromPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    if (distance === 0) return;
    
    // 단위 벡터
    const unitX = dx / distance;
    const unitY = dy / distance;
    
    // 시작점과 끝점을 노드 경계로 조정
    const startX = fromPos.x + unitX * nodeRadius;
    const startY = fromPos.y + unitY * nodeRadius;
    const endX = toPos.x - unitX * nodeRadius;
    const endY = toPos.y - unitY * nodeRadius;

    console.log(`Drawing ${relType} line from (${startX}, ${startY}) to (${endX}, ${endY})`);

    if (relType === 'SUPERVISOR') {
      // 화살표 라인
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', startX);
      line.setAttribute('y1', startY);
      line.setAttribute('x2', endX);
      line.setAttribute('y2', endY);
      line.setAttribute('class', 'relationship-line supervisor');
      line.setAttribute('marker-end', 'url(#arrowhead)');
      line.setAttribute('stroke', '#4a5568');
      line.setAttribute('stroke-width', '2');
      parent.appendChild(line);
    } else if (relType === 'PEER') {
      // 실선 라인
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', startX);
      line.setAttribute('y1', startY);
      line.setAttribute('x2', endX);
      line.setAttribute('y2', endY);
      line.setAttribute('class', 'relationship-line peer');
      line.setAttribute('stroke', '#718096');
      line.setAttribute('stroke-width', '2');
      parent.appendChild(line);
    }
  };


  return (
    <div className="network-graph-container">
      <svg ref={svgRef} className="network-graph-svg"></svg>
    </div>
  );
};

export default NetworkGraph;