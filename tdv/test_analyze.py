import json
import csv
import shutil
import os
import sys

# 상위 디렉토리의 analyze_redis.py 모듈을 import
sys.path.append('..')
from analyze_redis import *

# 파일 경로를 상위 디렉토리로 수정
def analyze_redis_data_modified():
    """
    redis.json에서 team 데이터를 분석하고 구조화된 데이터를 생성하는 함수
    team:team__* 패턴의 hash 데이터와 해당 팀의 idea, chat 데이터를 연결
    """
    with open('../redis.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    teams = {}
    
    # team:team_* 패턴의 키들을 찾아서 처리 (team__ 와 team_ 모두 포함)
    for key, value in data.items():
        if key.startswith('team:team_') and key.count(':') == 1:  # 기본 팀 정보 (team:team_xxx 형태만)
            team_id = key.split('team:')[1]  # team__* 부분 추출
            
            if value['type'] == 'hash':
                team_info = value['value']
                
                # members 정보에서 agent 리스트 추출
                agents = []
                if 'members' in team_info:
                    members = json.loads(team_info['members'])
                    agent_counter = 0
                    
                    for member in members:
                        if member.get('agentId'):  # agentId가 null이 아닌 경우만
                            agent_id = member['agentId']
                            agent_info = get_agent_info(data, agent_id)
                            
                            # A, B, C, D, E 순서로 node_key 할당
                            node_key = chr(65 + agent_counter)  # 65는 'A'의 ASCII 코드
                            
                            agent_data = {
                                'agentId': agent_id,
                                'node_key': node_key,
                                'roles': member.get('roles', []),
                                'isLeader': member.get('isLeader', False),
                                'agent_info': agent_info
                            }
                            agents.append(agent_data)
                            agent_counter += 1
                
                # ownerID로부터 user 정보 가져오기
                owner_info = None
                if 'ownerId' in team_info:
                    owner_info = get_user_info(data, team_info['ownerId'])
                elif 'ownerID' in team_info:
                    owner_info = get_user_info(data, team_info['ownerID'])
                
                # 팀 기본 정보 저장
                teams[team_id] = {
                    'team_info': team_info,
                    'owner_info': owner_info,
                    'agents': agents,
                    'ideas': [],
                    'chat': []
                }
                
                # 해당 팀의 ideas 데이터 찾기
                ideas_key = f"team:{team_id}:ideas"
                if ideas_key in data and data[ideas_key]['type'] == 'list':
                    teams[team_id]['ideas'] = data[ideas_key]['value']
                
                # 해당 팀의 chat 데이터 찾기
                chat_key = f"team:{team_id}:chat"
                if chat_key in data and data[chat_key]['type'] == 'list':
                    teams[team_id]['chat'] = data[chat_key]['value']
    
    return teams

def load_evaluation_data_modified():
    """AI Team 인사 평가.csv에서 평가 데이터를 로드하는 함수"""
    evaluations = []
    with open('../AI Team 인사 평가.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            evaluations.append(row)
    return evaluations

if __name__ == "__main__":
    teams = analyze_redis_data_modified()
    
    # 먼저 전체 팀 개수 확인
    print(f"전체 팀 개수: {len(teams)}")
    
    # 팀 데이터를 리스트 형태로 변환
    teams_list = []
    for team_id, team_data in teams.items():
        team_info = team_data['team_info']
        created_at = team_info.get('createdAt', '')
        
        team_entry = {
            'team_id': team_id,
            'team_info': team_info,
            'owner_info': team_data['owner_info'],
            'agents': team_data['agents'],
            'ideas': team_data['ideas'],
            'chat': team_data['chat'],
            'created_at': created_at
        }
        teams_list.append(team_entry)
    
    # createdAt 기준으로 정렬
    teams_list.sort(key=lambda x: x['created_at'])
    
    # 각 owner별 팀 개수 확인
    owner_counts = {}
    for team in teams_list:
        if team['owner_info']:
            owner_name = team['owner_info'].get('name', 'Unknown')
            owner_counts[owner_name] = owner_counts.get(owner_name, 0) + 1
    
    print("\n각 owner별 팀 개수:")
    for owner, count in owner_counts.items():
        print(f"- {owner}: {count}개 팀")
    
    # 박유빈의 팀들 확인
    print("\n박유빈의 팀들:")
    for i, team in enumerate(teams_list):
        if team['owner_info'] and team['owner_info'].get('name') == '박유빈':
            print(f"- 팀 {i+1}: {team['team_id']} (생성일: {team['created_at']})")