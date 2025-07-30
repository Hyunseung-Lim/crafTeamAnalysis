import React, { useEffect, useRef } from 'react';
import './NetworkGraph.css';

const NetworkGraph = ({ team }) => {
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
  }, [team]);

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
      
      return {
        name: ownerInfo.name || '나',
        type: 'user',
        professional: ownerInfo.professional || 'Owner',
        isLeader: userMember?.isLeader || false,
        roles: userMember?.roles || []
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

  const createPositionedLayout = (svg, team, positions, relationships, members, width, height) => {
    console.log('Positions:', positions);
    console.log('Relationships:', relationships);
    
    // 좌표를 정규화 (원본과 반대로)
    const positionArray = Object.values(positions);
    const minX = Math.min(...positionArray.map(p => p.x));
    const maxX = Math.max(...positionArray.map(p => p.x));
    const minY = Math.min(...positionArray.map(p => p.y));
    const maxY = Math.max(...positionArray.map(p => p.y));

    const padding = 60;
    const scaleX = (width - 2 * padding) / (maxX - minX || 1);
    const scaleY = (height - 2 * padding) / (maxY - minY || 1);

    const normalizedPositions = {};
    for (const [nodeId, pos] of Object.entries(positions)) {
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

    // 관계선을 agent ID에서 node key로 변환하는 로직 추가
    const processedRelationships = relationships.map(rel => {
      let fromKey = rel.from;
      let toKey = rel.to;

      // 'from'이 agent ID인 경우 node key로 변환
      if (fromKey !== '나') {
        const fromAgent = team.agents.find(agent => agent.agentId === fromKey);
        if (fromAgent) {
          fromKey = fromAgent.node_key;
        }
      }

      // 'to'가 agent ID인 경우 node key로 변환
      if (toKey !== '나') {
        const toAgent = team.agents.find(agent => agent.agentId === toKey);
        if (toAgent) {
          toKey = toAgent.node_key;
        }
      }

      return {
        from: fromKey,
        to: toKey,
        type: rel.type
      };
    });

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
    circle.setAttribute('class', `node-circle ${nodeInfo.type}`);
    
    if (nodeInfo.isLeader) {
      circle.classList.add('leader');
    }

    nodeG.appendChild(circle);

    // 노드 키 텍스트 (A, B, C, D 등)
    const keyText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    keyText.setAttribute('text-anchor', 'middle');
    keyText.setAttribute('dy', '0.35em');
    keyText.setAttribute('class', 'node-key');
    keyText.textContent = nodeId;
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

  useEffect(() => {
    // 화살표 마커 정의
    if (svgRef.current) {
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
      svgRef.current.insertBefore(defs, svgRef.current.firstChild);
    }
  }, []);

  return (
    <div className="network-graph-container">
      <svg ref={svgRef} className="network-graph-svg"></svg>
    </div>
  );
};

export default NetworkGraph;