import json
import csv
import shutil
import os
import sys

# 상위 디렉토리의 analyze_redis.py 모듈을 import
sys.path.append('..')
from analyze_redis import get_agent_info, get_user_info

def analyze_redis_data():
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


def load_evaluation_data():
    """AI Team 인사 평가.csv에서 평가 데이터를 로드하는 함수"""
    evaluations = []
    with open('../AI Team 인사 평가.csv', 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            evaluations.append(row)
    return evaluations

def map_evaluations_to_teams(teams_list, evaluations):
    """평가 데이터를 owner name과 팀 번호로 매핑하는 함수"""
    # 각 팀에 평가 데이터 초기화
    for team in teams_list:
        team['evaluations'] = []
    
    # 각 owner별로 팀을 그룹화하고 생성 순서로 정렬
    owner_teams = {}
    for i, team in enumerate(teams_list):
        if team['owner_info']:
            owner_name = team['owner_info'].get('name')
            if owner_name not in owner_teams:
                owner_teams[owner_name] = []
            owner_teams[owner_name].append((i, team))
    
    # 각 owner의 팀들을 생성 시간 순으로 정렬
    for owner_name in owner_teams:
        owner_teams[owner_name].sort(key=lambda x: x[1]['team_info'].get('createdAt', ''))
    
    # 박유빈 참가자의 경우 특별 처리: 두 번째 팀 제거
    teams_to_remove = []
    if '박유빈' in owner_teams:
        if len(owner_teams['박유빈']) > 1:
            # 두 번째 팀의 인덱스를 기록
            teams_to_remove.append(owner_teams['박유빈'][1][0])
    
    # 제거할 팀들을 teams_list에서 제거 (역순으로 제거하여 인덱스 문제 방지)
    for team_idx in sorted(teams_to_remove, reverse=True):
        teams_list.pop(team_idx)
    
    # owner_teams 재구성
    owner_teams = {}
    for i, team in enumerate(teams_list):
        if team['owner_info']:
            owner_name = team['owner_info'].get('name')
            if owner_name not in owner_teams:
                owner_teams[owner_name] = []
            owner_teams[owner_name].append((i, team))
    
    # 각 owner의 팀들을 생성 시간 순으로 정렬
    for owner_name in owner_teams:
        owner_teams[owner_name].sort(key=lambda x: x[1]['team_info'].get('createdAt', ''))
    
    # 평가 데이터를 owner name과 팀 번호로 매핑
    for evaluation in evaluations:
        evaluator_name = evaluation.get('당신은 이름은?', '')
        team_number = int(evaluation.get('몇 번째 팀에 대한 평가인가요?', 0))
        
        # 박유빈의 경우 평가 번호는 그대로 유지 (팀만 제거)
        
        if evaluator_name in owner_teams and 1 <= team_number <= len(owner_teams[evaluator_name]):
            # 해당 owner의 team_number번째 팀에 평가 추가
            team_index, team = owner_teams[evaluator_name][team_number - 1]
            teams_list[team_index]['evaluations'].append(evaluation)
    
    return teams_list

if __name__ == "__main__":
    teams = analyze_redis_data()
    
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
    
    # created_at 필드는 정렬용이므로 제거
    for team in teams_list:
        del team['created_at']
    
    # 평가 데이터 로드 및 매핑
    evaluations = load_evaluation_data()
    teams_list = map_evaluations_to_teams(teams_list, evaluations)
    
    # 최종 데이터 저장
    with open('src/structured_teams.json', 'w', encoding='utf-8') as f:
        json.dump(teams_list, f, ensure_ascii=False, indent=2)
    
    print(f"총 {len(teams_list)}개 팀 데이터를 src/structured_teams.json에 저장했습니다.")
    
    # 각 팀별 데이터 요약 출력
    for i, team in enumerate(teams_list, 1):
        team_id = team['team_id']
        team_name = team['team_info'].get('teamName', 'Unknown')
        owner_name = team['owner_info'].get('name', 'Unknown') if team['owner_info'] else 'Unknown'
        ideas_count = len(team['ideas'])
        chat_count = len(team['chat'])
        agents_count = len(team['agents'])
        eval_count = len(team['evaluations'])
        print(f"- 팀 {i}: {team_id} ({team_name}) [소유자: {owner_name}]: agents {agents_count}개, ideas {ideas_count}개, chat {chat_count}개, 평가 {eval_count}개")