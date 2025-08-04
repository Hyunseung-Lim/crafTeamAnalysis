import React, { useEffect, useRef } from 'react';
import './MiniNetworkGraph.css';

const MiniNetworkGraph = ({ team }) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!team || !svgRef.current) return;

    const svg = svgRef.current;
    const width = 200;
    const height = 120;

    // SVG 초기화
    svg.innerHTML = '';
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    // 화살표 마커 정의
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'mini-arrowhead');
    marker.setAttribute('markerWidth', '6');
    marker.setAttribute('markerHeight', '4');
    marker.setAttribute('refX', '5');
    marker.setAttribute('refY', '2');
    marker.setAttribute('orient', 'auto');
    
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', '0 0, 6 2, 0 4');
    polygon.setAttribute('fill', '#718096');
    
    marker.appendChild(polygon);
    defs.appendChild(marker);
    svg.appendChild(defs);

    // 데이터 파싱
    const positions = parseNodePositions(team.team_info?.nodePositions || '{}');
    const relationships = parseRelationships(team.team_info?.relationships || '[]');

    if (Object.keys(positions).length === 0) {
      // 포지션 정보가 없을 때 기본 레이아웃
      createDefaultMiniLayout(svg, team, width, height);
    } else {
      // 포지션 정보가 있을 때
      createPositionedMiniLayout(svg, team, positions, relationships, width, height);
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

  const getNodeInfo = (nodeId, team) => {
    if (nodeId === "나") {
      const ownerInfo = team.owner_info || {};
      return {
        name: ownerInfo.name || '나',
        type: 'user',
        isLeader: false
      };
    }

    // A, B, C, D, E 형태의 node_key로 agent 찾기
    for (const agent of team.agents || []) {
      if (agent.node_key === nodeId) {
        const agentInfo = agent.agent_info || {};
        return {
          name: agentInfo.name || 'Unknown',
          type: 'agent',
          isLeader: agent.isLeader || false,
          agentId: agent.agentId
        };
      }
    }

    return {
      name: nodeId,
      type: 'unknown',
      isLeader: false
    };
  };

  const createPositionedMiniLayout = (svg, team, positions, relationships, width, height) => {
    // 좌표를 미니 사이즈로 정규화
    const positionArray = Object.values(positions);
    const minX = Math.min(...positionArray.map(p => p.x));
    const maxX = Math.max(...positionArray.map(p => p.x));
    const minY = Math.min(...positionArray.map(p => p.y));
    const maxY = Math.max(...positionArray.map(p => p.y));

    const padding = 20;
    const scaleX = (width - 2 * padding) / (maxX - minX || 1);
    const scaleY = (height - 2 * padding) / (maxY - minY || 1);

    const normalizedPositions = {};
    for (const [nodeId, pos] of Object.entries(positions)) {
      normalizedPositions[nodeId] = {
        x: padding + (pos.x - minX) * scaleX,
        y: height - padding - (pos.y - minY) * scaleY  // Y축 반전
      };
    }

    // 관계선 먼저 그리기
    const relationshipsG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    relationshipsG.setAttribute('class', 'mini-relationships');
    svg.appendChild(relationshipsG);

    // 관계선을 agent ID에서 node key로 변환
    const processedRelationships = relationships.map(rel => {
      let fromKey = rel.from;
      let toKey = rel.to;

      if (fromKey !== '나') {
        const fromAgent = team.agents.find(agent => agent.agentId === fromKey);
        if (fromAgent) {
          fromKey = fromAgent.node_key;
        }
      }

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

    processedRelationships.forEach(rel => {
      if (normalizedPositions[rel.from] && normalizedPositions[rel.to]) {
        const fromPos = normalizedPositions[rel.from];
        const toPos = normalizedPositions[rel.to];
        drawMiniRelationship(relationshipsG, fromPos, toPos, rel.type);
      }
    });

    // 노드 그리기
    const nodesG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodesG.setAttribute('class', 'mini-nodes');
    svg.appendChild(nodesG);

    for (const [nodeId, pos] of Object.entries(normalizedPositions)) {
      const nodeInfo = getNodeInfo(nodeId, team);
      drawMiniNode(nodesG, pos.x, pos.y, nodeInfo, nodeId);
    }
  };

  const createDefaultMiniLayout = (svg, team, width, height) => {
    // 기본 원형 레이아웃 (미니 버전)
    const allMembers = [
      { id: '나', info: getNodeInfo('나', team) },
      ...team.agents.map(agent => ({ 
        id: agent.node_key || agent.agentId, 
        info: getNodeInfo(agent.node_key || agent.agentId, team) 
      }))
    ];

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) * 0.25;

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
    nodesG.setAttribute('class', 'mini-nodes');
    svg.appendChild(nodesG);

    allMembers.forEach(member => {
      const pos = positions[member.id];
      drawMiniNode(nodesG, pos.x, pos.y, member.info, member.id);
    });
  };

  const drawMiniNode = (parent, x, y, nodeInfo, nodeId) => {
    const nodeG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodeG.setAttribute('class', `mini-node ${nodeInfo.isLeader ? 'leader' : ''}`);
    nodeG.setAttribute('transform', `translate(${x}, ${y})`);

    // 미니 노드 원
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', '8');
    circle.setAttribute('class', `mini-node-circle ${nodeInfo.type}`);
    
    if (nodeInfo.isLeader) {
      circle.classList.add('leader');
    }

    nodeG.appendChild(circle);

    // 노드 키 텍스트 (A, B, C, D 등)
    const keyText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    keyText.setAttribute('text-anchor', 'middle');
    keyText.setAttribute('dy', '0.3em');
    keyText.setAttribute('class', 'mini-node-key');
    keyText.textContent = nodeId;
    nodeG.appendChild(keyText);

    parent.appendChild(nodeG);
  };

  const drawMiniRelationship = (parent, fromPos, toPos, relType) => {
    const nodeRadius = 10; // 미니 노드 반지름 + 여유 공간
    
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

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', startX);
    line.setAttribute('y1', startY);
    line.setAttribute('x2', endX);
    line.setAttribute('y2', endY);
    line.setAttribute('class', `mini-relationship-line ${relType.toLowerCase()}`);
    
    if (relType === 'SUPERVISOR') {
      line.setAttribute('marker-end', 'url(#mini-arrowhead)');
      line.setAttribute('stroke', '#4a5568');
    } else {
      line.setAttribute('stroke', '#718096');
    }
    
    line.setAttribute('stroke-width', '1');
    parent.appendChild(line);
  };

  return (
    <div className="mini-network-graph-container">
      <svg ref={svgRef} className="mini-network-graph-svg"></svg>
    </div>
  );
};

export default MiniNetworkGraph;