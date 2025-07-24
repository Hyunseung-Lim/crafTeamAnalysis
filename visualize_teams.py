import json
import matplotlib.pyplot as plt
import matplotlib.patches as patches
from matplotlib.patches import FancyBboxPatch
import numpy as np
import os

def load_teams_data():
    """structured_teams.json 파일을 로드하는 함수"""
    with open('structured_teams.json', 'r', encoding='utf-8') as f:
        teams = json.load(f)
    return teams

def parse_positions(node_positions_str):
    """nodePositions JSON 문자열을 파싱하는 함수"""
    try:
        positions = json.loads(node_positions_str)
        return positions
    except json.JSONDecodeError:
        return {}

def parse_relationships(relationships_str):
    """relationships JSON 문자열을 파싱하는 함수"""
    try:
        relationships = json.loads(relationships_str)
        return relationships
    except json.JSONDecodeError:
        return []

def get_node_info(node_id, team_data):
    """노드 ID에 해당하는 정보를 가져오는 함수"""
    if node_id == "나":
        owner_info = team_data.get('owner_info', {})
        return {
            'name': owner_info.get('name', '나'),
            'type': 'user',
            'professional': 'Owner'
        }
    
    # A, B, C, D, E 형태의 node_key로 agent 찾기
    for agent in team_data.get('agents', []):
        if agent.get('node_key') == node_id:
            agent_info = agent.get('agent_info', {})
            return {
                'name': agent_info.get('name', 'Unknown'),
                'type': 'agent',
                'professional': agent_info.get('professional', 'Unknown'),
                'isLeader': agent.get('isLeader', False),
                'agentId': agent['agentId']
            }
    
    # agent ID로도 찾기 (fallback)
    for agent in team_data.get('agents', []):
        if agent['agentId'] == node_id:
            agent_info = agent.get('agent_info', {})
            return {
                'name': agent_info.get('name', 'Unknown'),
                'type': 'agent',
                'professional': agent_info.get('professional', 'Unknown'),
                'isLeader': agent.get('isLeader', False),
                'agentId': agent['agentId']
            }
    
    return {
        'name': node_id,
        'type': 'unknown',
        'professional': 'Unknown'
    }

def convert_agent_id_to_node_key(agent_id, team_data):
    """agent ID를 node_key(A, B, C, D, E)로 변환하는 함수"""
    for agent in team_data.get('agents', []):
        if agent['agentId'] == agent_id:
            return agent.get('node_key', agent_id)
    return agent_id

def create_team_network_visualization(team_data, team_index):
    """개별 팀의 네트워크 시각화를 생성하는 함수"""
    team_info = team_data['team_info']
    
    # nodePositions와 relationships 파싱
    positions = parse_positions(team_info.get('nodePositions', '{}'))
    relationships = parse_relationships(team_info.get('relationships', '[]'))
    
    # relationships에서 agent ID를 node_key로 변환
    converted_relationships = []
    for rel in relationships:
        from_node = rel['from'] if rel['from'] == '나' else convert_agent_id_to_node_key(rel['from'], team_data)
        to_node = rel['to'] if rel['to'] == '나' else convert_agent_id_to_node_key(rel['to'], team_data)
        converted_relationships.append({
            'from': from_node,
            'to': to_node,
            'type': rel['type']
        })
    relationships = converted_relationships
    
    if not positions:
        print(f"팀 {team_index + 1}: nodePositions가 없어서 스킵합니다.")
        return None
    
    # 그래프 생성
    fig, ax = plt.subplots(1, 1, figsize=(12, 8))
    ax.set_aspect('equal')
    
    # 노드 그리기
    node_colors = {'user': '#FF6B6B', 'agent': '#4ECDC4', 'unknown': '#95A5A6'}
    
    for node_id, pos in positions.items():
        x, y = pos['x'], pos['y']
        node_info = get_node_info(node_id, team_data)
        
        # 노드 색상 결정
        color = node_colors[node_info['type']]
        
        # 리더인 경우 테두리 추가
        if node_info.get('isLeader', False):
            border_color = '#E74C3C'
            linewidth = 3
        else:
            border_color = 'black'
            linewidth = 1
        
        # 노드 그리기
        circle = plt.Circle((x, y), 25, color=color, ec=border_color, linewidth=linewidth, zorder=3)
        ax.add_patch(circle)
        
        # 노드 라벨 (이름)
        ax.text(x, y-45, node_info['name'], ha='center', va='top', fontsize=9, weight='bold')
        
        # 역할 라벨 (agent인 경우만)
        if node_info['type'] == 'agent':
            # agent 정보에서 역할 가져오기
            for agent in team_data.get('agents', []):
                if agent.get('agentId') == node_info.get('agentId'):
                    roles = agent.get('roles', [])
                    # 역할을 줄여서 표시 (너무 길면 생략)
                    role_text = ', '.join([role.replace('아이디어 ', '').replace('하기', '') for role in roles])
                    if len(role_text) > 25:  # 너무 길면 줄임
                        role_text = role_text[:22] + '...'
                    ax.text(x, y-60, f"({role_text})", ha='center', va='top', fontsize=7, style='italic')
                    break
        else:
            # 사용자인 경우 직업 표시
            ax.text(x, y-60, f"({node_info['professional']})", ha='center', va='top', fontsize=7, style='italic')
    
    # 관계선 그리기
    for rel in relationships:
        from_node = rel['from']
        to_node = rel['to']
        rel_type = rel['type']
        
        if from_node in positions and to_node in positions:
            x1, y1 = positions[from_node]['x'], positions[from_node]['y']
            x2, y2 = positions[to_node]['x'], positions[to_node]['y']
            
            # 노드 반지름 (25) + 마진 (10)
            node_radius = 35
            
            # 두 점 사이의 거리와 방향 계산
            dx = x2 - x1
            dy = y2 - y1
            distance = np.sqrt(dx**2 + dy**2)
            
            if distance > 0:
                # 단위 벡터 계산
                unit_x = dx / distance
                unit_y = dy / distance
                
                # 시작점과 끝점을 노드 경계로 조정
                start_x = x1 + unit_x * node_radius
                start_y = y1 + unit_y * node_radius
                end_x = x2 - unit_x * node_radius
                end_y = y2 - unit_y * node_radius
                
                if rel_type == 'SUPERVISOR':
                    # 화살표로 그리기 (더 두껍고 명확하게)
                    ax.annotate('', xy=(end_x, end_y), xytext=(start_x, start_y),
                              arrowprops=dict(arrowstyle='->', color='black', lw=3, 
                                            shrinkA=0, shrinkB=0, mutation_scale=20),
                              zorder=2)
                elif rel_type == 'PEER':
                    # 실선으로 그리기
                    ax.plot([start_x, end_x], [start_y, end_y], color='#34495E', lw=2, zorder=1)
    
    # 제목 설정
    owner_name = team_data.get('owner_info', {}).get('name', 'Unknown')
    team_name = team_info.get('teamName', 'Unknown Team')
    ax.set_title(f'{owner_name} - {team_name}\n(Team {team_index + 1})', fontsize=14, weight='bold', pad=20)
    
    # 축 설정
    ax.set_xlim(-50, max([pos['x'] for pos in positions.values()]) + 100)
    ax.set_ylim(-100, max([pos['y'] for pos in positions.values()]) + 50)
    ax.set_xticks([])
    ax.set_yticks([])
    ax.spines['top'].set_visible(False)
    ax.spines['right'].set_visible(False)
    ax.spines['bottom'].set_visible(False)
    ax.spines['left'].set_visible(False)
    
    # 범례 추가
    legend_elements = [
        plt.Line2D([0], [0], marker='o', color='w', markerfacecolor='#FF6B6B', 
                  markersize=10, label='User (Owner)'),
        plt.Line2D([0], [0], marker='o', color='w', markerfacecolor='#4ECDC4', 
                  markersize=10, label='Agent'),
        plt.Line2D([0], [0], marker='o', color='w', markerfacecolor='#4ECDC4', 
                  markersize=10, markeredgecolor='#E74C3C', markeredgewidth=3, label='Leader Agent'),
        patches.FancyArrowPatch((0, 0), (0.3, 0), arrowstyle='->', color='black', linewidth=3, label='Supervisor (→)'),
        plt.Line2D([0], [0], color='#34495E', linewidth=2, label='Peer (—)')
    ]
    ax.legend(handles=legend_elements, loc='upper right', bbox_to_anchor=(1, 1))
    
    plt.tight_layout()
    return fig

def save_team_visualizations():
    """모든 팀의 시각화를 생성하고 저장하는 함수"""
    teams = load_teams_data()
    
    # 시각화 폴더 생성
    os.makedirs('team_visualizations', exist_ok=True)
    
    # 각 소유자별 팀 번호 카운터
    owner_team_counts = {}
    
    for i, team in enumerate(teams):
        owner_name = team.get('owner_info', {}).get('name', 'Unknown')
        
        # 해당 소유자의 팀 번호 증가
        if owner_name not in owner_team_counts:
            owner_team_counts[owner_name] = 1
        else:
            owner_team_counts[owner_name] += 1
        
        team_number = owner_team_counts[owner_name]
        
        # 시각화 생성
        fig = create_team_network_visualization(team, i)
        
        if fig is not None:
            # 파일명 생성: 사람이름_team_번호
            filename = f"{owner_name}_team_{team_number}.png"
            filepath = os.path.join('team_visualizations', filename)
            
            # 저장
            fig.savefig(filepath, dpi=300, bbox_inches='tight')
            plt.close(fig)
            
            print(f"저장 완료: {filepath}")
        else:
            print(f"팀 {i + 1} ({owner_name}): 시각화 생성 실패")

if __name__ == "__main__":
    # 한글 폰트 설정 (시스템에 따라 조정 필요)
    plt.rcParams['font.family'] = ['Arial Unicode MS', 'AppleGothic', 'Malgun Gothic', 'DejaVu Sans']
    plt.rcParams['axes.unicode_minus'] = False
    
    save_team_visualizations()
    print("모든 팀 시각화가 완료되었습니다!")