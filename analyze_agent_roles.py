import json
import matplotlib.pyplot as plt
import pandas as pd
import numpy as np
from collections import defaultdict, Counter
from typing import Dict, List, Tuple
from scipy import stats

def load_teams_data():
    """structured_teams.json 파일을 로드하는 함수"""
    with open('structured_teams.json', 'r', encoding='utf-8') as f:
        teams = json.load(f)
    return teams

def get_unique_owners(teams):
    """모든 팀에서 고유한 참가자 목록을 가져오는 함수"""
    owners = {}
    for team in teams:
        owner_info = team.get('owner_info', {})
        owner_id = owner_info.get('id', 'Unknown')
        owner_name = owner_info.get('name', 'Unknown')
        owners[owner_id] = owner_name
    return owners

def filter_teams_by_participants(teams, selected_participants: List[str], max_teams_per_person: int = 3):
    """선택된 참가자들의 최대 3개 팀만 필터링하는 함수 (실제 에이전트 존재 확인)"""
    filtered_teams = []
    participant_counts = defaultdict(int)
    
    # 참가자 이름으로 매핑
    name_to_id = {}
    for team in teams:
        owner_info = team.get('owner_info', {})
        owner_id = owner_info.get('id', 'Unknown')
        owner_name = owner_info.get('name', 'Unknown')
        name_to_id[owner_name] = owner_id
    
    # 참가자별로 팀들을 먼저 수집
    teams_by_participant = defaultdict(list)
    for team in teams:
        owner_info = team.get('owner_info', {})
        owner_name = owner_info.get('name', 'Unknown')
        
        if owner_name in selected_participants:
            # 실제 에이전트가 존재하는지 확인
            agents = team.get('agents', [])
            if len(agents) > 0:  # 에이전트가 실제로 존재하는 팀만
                teams_by_participant[owner_name].append(team)
    
    # 각 참가자별로 팀 정렬 및 선택
    for participant_name in selected_participants:
        participant_teams = teams_by_participant[participant_name]
        if len(participant_teams) == 0:
            continue
            
        # 생성 시간순으로 정렬
        participant_teams.sort(key=lambda x: x.get('team_info', {}).get('createdAt', ''))
        
        # 박유빈의 경우 2번째 팀 제외
        if participant_name == "박유빈" and len(participant_teams) >= 4:
            selected_teams = [participant_teams[0]] + participant_teams[2:5]  # 1,3,4번째 팀
        else:
            selected_teams = participant_teams[:max_teams_per_person]
        
        filtered_teams.extend(selected_teams)
    
    return filtered_teams

def analyze_agent_roles(team):
    """팀의 에이전트 역할을 분석하는 함수"""
    agents = team.get('agents', [])
    role_counts = []
    
    role_types = ["아이디어 생성하기", "아이디어 평가하기", "피드백하기", "요청하기"]
    
    for agent in agents:
        roles = agent.get('roles', [])
        agent_role_count = {role_type: 1 if role_type in roles else 0 for role_type in role_types}
        role_counts.append(agent_role_count)
    
    return role_counts, len(agents)

def get_user_roles(team):
    """팀에서 사용자(나)의 역할을 가져오는 함수"""
    team_info = team.get('team_info', {})
    members_str = team_info.get('members', '[]')
    
    try:
        members = json.loads(members_str)
        for member in members:
            if member.get('isUser', False):
                return member.get('roles', [])
    except json.JSONDecodeError:
        pass
    
    return []

def calculate_team_averages(teams_by_participant):
    """참가자별 팀들의 평균 역할 수를 계산하는 함수 (사용자 역할 포함/제외 분석)"""
    results = {}
    role_types = ["아이디어 생성하기", "아이디어 평가하기", "피드백하기", "요청하기"]
    
    for participant, teams in teams_by_participant.items():
        participant_results = []
        
        for i, team in enumerate(teams, 1):
            role_counts, agent_count = analyze_agent_roles(team)
            user_roles = get_user_roles(team)
            
            if agent_count > 0:
                # 에이전트별 역할 수 리스트 (에이전트만)
                roles_per_agent = [sum(agent.values()) for agent in role_counts]
                
                # 평균 역할 수 계산 (에이전트만)
                avg_roles_per_agent = sum(roles_per_agent) / len(roles_per_agent)
                
                # 사용자 포함한 전체 평균 계산
                user_role_count = len(user_roles)
                total_roles = sum(roles_per_agent) + user_role_count
                total_members = len(roles_per_agent) + 1  # 에이전트 + 사용자
                avg_roles_including_user = total_roles / total_members
                
                # 각 역할별로 몇 명의 에이전트가 담당하는지 계산
                role_assignment_counts = {}
                for role_type in role_types:
                    agents_with_role = sum(1 for agent in role_counts if agent[role_type] == 1)
                    role_assignment_counts[role_type] = agents_with_role
                
                participant_results.append({
                    'team_number': i,
                    'team_name': team.get('team_info', {}).get('teamName', f'Team {i}'),
                    'agent_count': agent_count,
                    'avg_roles_per_agent': avg_roles_per_agent,  # 에이전트만
                    'avg_roles_including_user': avg_roles_including_user,  # 사용자 포함
                    'user_role_count': user_role_count,
                    'user_roles': user_roles,
                    'roles_per_agent': roles_per_agent,
                    'role_assignment_counts': role_assignment_counts,
                    'role_counts': role_counts
                })
        
        results[participant] = participant_results
    
    return results

def visualize_role_changes(results):
    """역할 변화를 시각화하는 함수"""
    fig, axes = plt.subplots(2, 2, figsize=(15, 12))
    fig.suptitle('에이전트별 평균 역할 수 변화 분석 (Team 1 → 2 → 3)', fontsize=16, fontweight='bold')
    
    # 1. 전체 참가자의 평균 역할 수 변화 (전체 평균)
    ax1 = axes[0, 0]
    all_team_data = defaultdict(list)
    
    for participant, teams in results.items():
        for team in teams:
            team_num = team['team_number']
            all_team_data[team_num].append(team['avg_roles_per_agent'])
    
    teams = sorted(all_team_data.keys())
    overall_avg = [np.mean(all_team_data[team]) for team in teams]
    overall_std = [np.std(all_team_data[team]) for team in teams]
    
    ax1.errorbar(teams, overall_avg, yerr=overall_std, marker='o', linewidth=3, 
                capsize=5, capthick=2, label='전체 평균 ± 표준편차', color='#2E86AB')
    ax1.fill_between(teams, 
                     [avg - std for avg, std in zip(overall_avg, overall_std)], 
                     [avg + std for avg, std in zip(overall_avg, overall_std)], 
                     alpha=0.2, color='#2E86AB')
    
    ax1.set_xlabel('팀 순서')
    ax1.set_ylabel('에이전트당 평균 역할 수')
    ax1.set_title('전체 참가자 평균 역할 수 변화')
    ax1.legend()
    ax1.grid(True, alpha=0.3)
    ax1.set_xticks([1, 2, 3])
    
    # y축 범위를 데이터에 맞게 조정
    min_val = min([avg - std for avg, std in zip(overall_avg, overall_std)])
    max_val = max([avg + std for avg, std in zip(overall_avg, overall_std)])
    ax1.set_ylim(max(0, min_val - 0.2), max_val + 0.2)
    
    # 2. 개별 참가자별 평균 역할 수 변화
    ax2 = axes[0, 1]
    
    # 색상 팔레트
    colors = plt.cm.tab20(np.linspace(0, 1, len(results)))
    
    for i, (participant, teams) in enumerate(results.items()):
        team_nums = [team['team_number'] for team in teams]
        avg_roles = [team['avg_roles_per_agent'] for team in teams]
        ax2.plot(team_nums, avg_roles, marker='o', linewidth=2, 
                label=f"{participant}", alpha=0.8, color=colors[i])
    
    ax2.set_xlabel('팀 순서')
    ax2.set_ylabel('에이전트당 평균 역할 수')
    ax2.set_title('참가자별 평균 역할 수 변화')
    ax2.legend(bbox_to_anchor=(1.05, 1), loc='upper left', fontsize=8)
    ax2.grid(True, alpha=0.3)
    ax2.set_xticks([1, 2, 3])
    
    # 3. 히트맵: 참가자별 역할 변화
    ax3 = axes[1, 0]
    participants = list(results.keys())
    heatmap_data = []
    
    for participant in participants:
        teams = results[participant]
        participant_row = []
        for team in teams:
            participant_row.append(team['avg_roles_per_agent'])
        # 3개 팀이 아닌 경우 0으로 채움
        while len(participant_row) < 3:
            participant_row.append(0)
        heatmap_data.append(participant_row)
    
    im = ax3.imshow(heatmap_data, cmap='YlOrRd', aspect='auto')
    ax3.set_xticks([0, 1, 2])
    ax3.set_xticklabels(['Team 1', 'Team 2', 'Team 3'])
    ax3.set_yticks(range(len(participants)))
    ax3.set_yticklabels(participants)
    ax3.set_title('참가자별 평균 역할 수 히트맵')
    
    # 히트맵에 숫자 표시
    for i in range(len(participants)):
        for j in range(3):
            if j < len(results[participants[i]]):
                value = results[participants[i]][j]['avg_roles_per_agent']
                text = ax3.text(j, i, f'{value:.1f}', ha="center", va="center", color="black", fontweight='bold')
    
    # 컬러바 추가
    plt.colorbar(im, ax=ax3, label='평균 역할 수')
    
    # 4. 역할 분포 박스플롯
    ax4 = axes[1, 1]
    team_data = {1: [], 2: [], 3: []}
    
    for participant, teams in results.items():
        for team in teams:
            team_num = team['team_number']
            team_data[team_num].append(team['avg_roles_per_agent'])
    
    box_data = [team_data[i] for i in [1, 2, 3]]
    bp = ax4.boxplot(box_data, labels=['Team 1', 'Team 2', 'Team 3'], patch_artist=True)
    
    # 박스플롯 색상 설정
    colors_box = ['#FFE5E5', '#E5F9F6', '#E5F3FF']
    for patch, color in zip(bp['boxes'], colors_box):
        patch.set_facecolor(color)
    
    ax4.set_ylabel('에이전트당 평균 역할 수')
    ax4.set_title('팀별 평균 역할 수 분포')
    ax4.grid(True, alpha=0.3)
    
    plt.tight_layout()
    return fig

def print_overall_statistics(results):
    """전체 통계만 출력하는 함수"""
    print("="*80)
    print("🌍 전체 평균 역할 수 변화 통계 분석")
    print("="*80)
    
    # 에이전트만 계산
    agent_only_data = defaultdict(list)
    # 사용자 포함 계산
    including_user_data = defaultdict(list)
    
    for participant, teams in results.items():
        for team in teams:
            team_num = team['team_number']
            agent_only_data[team_num].append(team['avg_roles_per_agent'])
            including_user_data[team_num].append(team['avg_roles_including_user'])
    
    print(f"\n📊 에이전트만 포함한 평균 역할 수 분석:")
    print("-" * 50)
    for team_num in sorted(agent_only_data.keys()):
        data = agent_only_data[team_num]
        avg = np.mean(data)
        std = np.std(data)
        min_val = np.min(data)
        max_val = np.max(data)
        print(f"  Team {team_num}: {avg:.2f} ± {std:.2f} (범위: {min_val:.2f}~{max_val:.2f}, 참여자 {len(data)}명)")
    
    print(f"\n👥 사용자(본인) 포함한 전체 평균 역할 수 분석:")
    print("-" * 50)
    for team_num in sorted(including_user_data.keys()):
        data = including_user_data[team_num]
        avg = np.mean(data)
        std = np.std(data)
        min_val = np.min(data)
        max_val = np.max(data)
        print(f"  Team {team_num}: {avg:.2f} ± {std:.2f} (범위: {min_val:.2f}~{max_val:.2f}, 참여자 {len(data)}명)")
    
    # 변화 추이 분석 (에이전트만)
    if len(agent_only_data) > 1:
        print(f"\n📈 에이전트만 - 팀별 변화 추이:")
        print("-" * 50)
        teams_sorted = sorted(agent_only_data.keys())
        agent_avgs = [np.mean(agent_only_data[team]) for team in teams_sorted]
        
        for i in range(1, len(agent_avgs)):
            change = agent_avgs[i] - agent_avgs[i-1]
            direction = "증가" if change > 0 else "감소" if change < 0 else "동일"
            percent_change = (change / agent_avgs[i-1]) * 100 if agent_avgs[i-1] != 0 else 0
            
            print(f"    Team {teams_sorted[i-1]} → Team {teams_sorted[i]}: {agent_avgs[i-1]:.2f} → {agent_avgs[i]:.2f} ({change:+.2f}, {percent_change:+.1f}%, {direction})")
    
    # 변화 추이 분석 (사용자 포함)
    if len(including_user_data) > 1:
        print(f"\n📈 사용자 포함 - 팀별 변화 추이:")
        print("-" * 50)
        teams_sorted = sorted(including_user_data.keys())
        user_avgs = [np.mean(including_user_data[team]) for team in teams_sorted]
        
        for i in range(1, len(user_avgs)):
            change = user_avgs[i] - user_avgs[i-1]
            direction = "증가" if change > 0 else "감소" if change < 0 else "동일"
            percent_change = (change / user_avgs[i-1]) * 100 if user_avgs[i-1] != 0 else 0
            
            print(f"    Team {teams_sorted[i-1]} → Team {teams_sorted[i]}: {user_avgs[i-1]:.2f} → {user_avgs[i]:.2f} ({change:+.2f}, {percent_change:+.1f}%, {direction})")
    
    # 비교 분석
    print(f"\n🔍 에이전트 vs 사용자 포함 비교:")
    print("-" * 50)
    for team_num in sorted(agent_only_data.keys()):
        agent_avg = np.mean(agent_only_data[team_num])
        user_avg = np.mean(including_user_data[team_num])
        difference = user_avg - agent_avg
        print(f"  Team {team_num}: 에이전트만 {agent_avg:.2f} vs 사용자포함 {user_avg:.2f} (차이: {difference:+.2f})")
    
    # 역할별 상세 분석 (비율)
    print_role_specific_analysis(results)
    
    # 역할별 절대량 분석 추가
    print_role_count_analysis(results)
    
    # 역할별 총 수 분석 추가
    print_total_role_analysis(results)
    
    print(f"\n" + "="*80)

def print_role_specific_analysis(results):
    """역할별 상세 추이 분석"""
    print(f"\n🎯 역할별 할당 변화 추이:")
    print("="*60)
    
    role_types = ["아이디어 생성하기", "아이디어 평가하기", "피드백하기", "요청하기"]
    role_short_names = ["생성", "평가", "피드백", "요청"]
    
    # 각 역할별로 팀별 데이터 수집
    role_data = {}
    for role_type in role_types:
        role_data[role_type] = defaultdict(list)
    
    for participant, teams in results.items():
        for team in teams:
            team_num = team['team_number']
            agent_count = team['agent_count']
            
            # 각 역할별 비율 계산 (해당 역할을 가진 에이전트 수 / 전체 에이전트 수)
            for role_type in role_types:
                role_count = team['role_assignment_counts'][role_type]
                role_ratio = role_count / agent_count if agent_count > 0 else 0
                role_data[role_type][team_num].append(role_ratio)
    
    # 역할별 통계 출력
    for i, role_type in enumerate(role_types):
        short_name = role_short_names[i]
        print(f"\n📌 {role_type} ({short_name}) 할당 비율:")
        print("-" * 40)
        
        for team_num in sorted(role_data[role_type].keys()):
            data = role_data[role_type][team_num]
            avg = np.mean(data)
            std = np.std(data)
            min_val = np.min(data)
            max_val = np.max(data)
            print(f"  Team {team_num}: {avg:.1%} ± {std:.1%} (범위: {min_val:.1%}~{max_val:.1%})")
        
        # 변화 추이
        if len(role_data[role_type]) > 1:
            teams_sorted = sorted(role_data[role_type].keys())
            role_avgs = [np.mean(role_data[role_type][team]) for team in teams_sorted]
            
            print(f"  변화 추이:")
            for j in range(1, len(role_avgs)):
                change = role_avgs[j] - role_avgs[j-1]
                direction = "증가" if change > 0 else "감소" if change < 0 else "동일"
                percent_change = (change / role_avgs[j-1]) * 100 if role_avgs[j-1] != 0 else 0
                print(f"    Team {teams_sorted[j-1]} → {teams_sorted[j]}: {role_avgs[j-1]:.1%} → {role_avgs[j]:.1%} ({change:+.1%}, {direction})")
    
    # 역할별 요약 비교
    print(f"\n📊 역할별 전체 요약 (Team 1 → Team 3):")
    print("-" * 50)
    for i, role_type in enumerate(role_types):
        short_name = role_short_names[i]
        if len(role_data[role_type]) >= 2:
            teams_sorted = sorted(role_data[role_type].keys())
            first_avg = np.mean(role_data[role_type][teams_sorted[0]])
            last_avg = np.mean(role_data[role_type][teams_sorted[-1]])
            total_change = last_avg - first_avg
            direction = "증가" if total_change > 0 else "감소" if total_change < 0 else "동일"
            
            print(f"  {short_name}: {first_avg:.1%} → {last_avg:.1%} ({total_change:+.1%}, {direction})")
    
    # 역할별 절대량 분석 추가
    print_role_count_analysis(results)

def print_role_count_analysis(results):
    """역할별 절대량(개수) 추이 분석"""
    print(f"\n🔢 역할별 할당 개수 변화 추이:")
    print("="*60)
    
    role_types = ["아이디어 생성하기", "아이디어 평가하기", "피드백하기", "요청하기"]
    role_short_names = ["생성", "평가", "피드백", "요청"]
    
    # 각 역할별로 팀별 데이터 수집 (절대량)
    role_count_data = {}
    for role_type in role_types:
        role_count_data[role_type] = defaultdict(list)
    
    for participant, teams in results.items():
        for team in teams:
            team_num = team['team_number']
            # 각 역할별 절대 개수
            for role_type in role_types:
                role_count = team['role_assignment_counts'][role_type]
                role_count_data[role_type][team_num].append(role_count)
    
    # 역할별 통계 출력
    for i, role_type in enumerate(role_types):
        short_name = role_short_names[i]
        print(f"\n📌 {role_type} ({short_name}) 할당 개수:")
        print("-" * 40)
        
        for team_num in sorted(role_count_data[role_type].keys()):
            data = role_count_data[role_type][team_num]
            avg = np.mean(data)
            std = np.std(data)
            min_val = np.min(data)
            max_val = np.max(data)
            print(f"  Team {team_num}: {avg:.1f}개 ± {std:.1f} (범위: {min_val:.0f}~{max_val:.0f}개)")
        
        # 변화 추이
        if len(role_count_data[role_type]) > 1:
            teams_sorted = sorted(role_count_data[role_type].keys())
            role_avgs = [np.mean(role_count_data[role_type][team]) for team in teams_sorted]
            
            print(f"  변화 추이:")
            for j in range(1, len(role_avgs)):
                change = role_avgs[j] - role_avgs[j-1]
                direction = "증가" if change > 0 else "감소" if change < 0 else "동일"
                percent_change = (change / role_avgs[j-1]) * 100 if role_avgs[j-1] != 0 else 0
                # 통계적 유의성 검정 (개수)
                data1 = role_count_data[role_type][teams_sorted[j-1]]
                data2 = role_count_data[role_type][teams_sorted[j]]
                if len(data1) > 1 and len(data2) > 1:
                    t_stat, p_value = stats.ttest_rel(data2, data1)
                    significance = get_significance_stars(p_value)
                    print(f"    Team {teams_sorted[j-1]} → {teams_sorted[j]}: {role_avgs[j-1]:.1f}개 → {role_avgs[j]:.1f}개 ({change:+.1f}개, {percent_change:+.1f}%, {direction}){significance}")
                else:
                    print(f"    Team {teams_sorted[j-1]} → {teams_sorted[j]}: {role_avgs[j-1]:.1f}개 → {role_avgs[j]:.1f}개 ({change:+.1f}개, {percent_change:+.1f}%, {direction})")
    
    # 역할별 요약 비교 (절대량)
    print(f"\n📊 역할별 절대량 요약 (Team 1 → Team 3):")
    print("-" * 50)
    for i, role_type in enumerate(role_types):
        short_name = role_short_names[i]
        if len(role_count_data[role_type]) >= 2:
            teams_sorted = sorted(role_count_data[role_type].keys())
            first_avg = np.mean(role_count_data[role_type][teams_sorted[0]])
            last_avg = np.mean(role_count_data[role_type][teams_sorted[-1]])
            total_change = last_avg - first_avg
            direction = "증가" if total_change > 0 else "감소" if total_change < 0 else "동일"
            
            # 전체 변화의 통계적 유의성 검정 (개수)
            if len(role_count_data[role_type]) >= 2:
                first_data = role_count_data[role_type][teams_sorted[0]]
                last_data = role_count_data[role_type][teams_sorted[-1]]
                if len(first_data) > 1 and len(last_data) > 1:
                    t_stat, p_value = stats.ttest_rel(last_data, first_data)
                    significance = get_significance_stars(p_value)
                    print(f"  {short_name}: {first_avg:.1f}개 → {last_avg:.1f}개 ({total_change:+.1f}개, {direction}){significance}")
                else:
                    print(f"  {short_name}: {first_avg:.1f}개 → {last_avg:.1f}개 ({total_change:+.1f}개, {direction})")
            else:
                print(f"  {short_name}: {first_avg:.1f}개 → {last_avg:.1f}개 ({total_change:+.1f}개, {direction})")

def print_total_role_analysis(results):
    """역할별 총 수 추이 분석 (모든 에이전트의 역할 합계)"""
    print(f"\n📊 역할별 총 역할 수 변화 추이:")
    print("="*60)
    
    role_types = ["아이디어 생성하기", "아이디어 평가하기", "피드백하기", "요청하기"]
    role_short_names = ["생성", "평가", "피드백", "요청"]
    
    # 각 역할별로 팀별 총 데이터 수집
    role_total_data = {}
    for role_type in role_types:
        role_total_data[role_type] = defaultdict(list)
    
    for participant, teams in results.items():
        for team in teams:
            team_num = team['team_number']
            # 각 에이전트의 역할을 모두 세기
            for role_type in role_types:
                total_roles = sum(1 for agent_roles in team['role_counts'] if agent_roles[role_type] == 1)
                role_total_data[role_type][team_num].append(total_roles)
    
    # 역할별 통계 출력
    for i, role_type in enumerate(role_types):
        short_name = role_short_names[i]
        print(f"\n📌 {role_type} ({short_name}) 총 역할 수:")
        print("-" * 40)
        
        for team_num in sorted(role_total_data[role_type].keys()):
            data = role_total_data[role_type][team_num]
            avg = np.mean(data)
            std = np.std(data)
            min_val = np.min(data)
            max_val = np.max(data)
            print(f"  Team {team_num}: {avg:.1f}개 ± {std:.1f} (범위: {min_val:.0f}~{max_val:.0f}개)")
        
        # 변화 추이
        if len(role_total_data[role_type]) > 1:
            teams_sorted = sorted(role_total_data[role_type].keys())
            role_avgs = [np.mean(role_total_data[role_type][team]) for team in teams_sorted]
            
            print(f"  변화 추이:")
            for j in range(1, len(role_avgs)):
                change = role_avgs[j] - role_avgs[j-1]
                direction = "증가" if change > 0 else "감소" if change < 0 else "동일"
                percent_change = (change / role_avgs[j-1]) * 100 if role_avgs[j-1] != 0 else 0
                # 통계적 유의성 검정 (총 수)
                data1 = role_total_data[role_type][teams_sorted[j-1]]
                data2 = role_total_data[role_type][teams_sorted[j]]
                if len(data1) > 1 and len(data2) > 1:
                    t_stat, p_value = stats.ttest_rel(data2, data1)
                    significance = get_significance_stars(p_value)
                    print(f"    Team {teams_sorted[j-1]} → {teams_sorted[j]}: {role_avgs[j-1]:.1f}개 → {role_avgs[j]:.1f}개 ({change:+.1f}개, {percent_change:+.1f}%, {direction}){significance}")
                else:
                    print(f"    Team {teams_sorted[j-1]} → {teams_sorted[j]}: {role_avgs[j-1]:.1f}개 → {role_avgs[j]:.1f}개 ({change:+.1f}개, {percent_change:+.1f}%, {direction})")
    
    # 역할별 요약 비교 (총 수)
    print(f"\n📊 역할별 총 수 요약 (Team 1 → Team 3):")
    print("-" * 50)
    for i, role_type in enumerate(role_types):
        short_name = role_short_names[i]
        if len(role_total_data[role_type]) >= 2:
            teams_sorted = sorted(role_total_data[role_type].keys())
            first_avg = np.mean(role_total_data[role_type][teams_sorted[0]])
            last_avg = np.mean(role_total_data[role_type][teams_sorted[-1]])
            total_change = last_avg - first_avg
            direction = "증가" if total_change > 0 else "감소" if total_change < 0 else "동일"
            
            # 전체 변화의 통계적 유의성 검정 (총 수)
            if len(role_total_data[role_type]) >= 2:
                first_data = role_total_data[role_type][teams_sorted[0]]
                last_data = role_total_data[role_type][teams_sorted[-1]]
                if len(first_data) > 1 and len(last_data) > 1:
                    t_stat, p_value = stats.ttest_rel(last_data, first_data)
                    significance = get_significance_stars(p_value)
                    print(f"  {short_name}: {first_avg:.1f}개 → {last_avg:.1f}개 ({total_change:+.1f}개, {direction}){significance}")
                else:
                    print(f"  {short_name}: {first_avg:.1f}개 → {last_avg:.1f}개 ({total_change:+.1f}개, {direction})")
            else:
                print(f"  {short_name}: {first_avg:.1f}개 → {last_avg:.1f}개 ({total_change:+.1f}개, {direction})")
    
    # 통계적 유의성 범례
    print(f"\n📖 통계적 유의성 범례:")
    print("  *** p < 0.001 (매우 유의함)")
    print("  **  p < 0.01  (유의함)")
    print("  *   p < 0.05  (유의함)")
    print("  .   p < 0.1   (경향성)")
    print("      p ≥ 0.1   (유의하지 않음)")

def get_significance_stars(p_value):
    """p-value에 따른 유의성 표시를 반환하는 함수"""
    if p_value < 0.001:
        return " ***"
    elif p_value < 0.01:
        return " **"
    elif p_value < 0.05:
        return " *"
    elif p_value < 0.1:
        return " ."
    else:
        return ""

def visualize_statistics(results):
    """통계 결과를 그래프로 시각화하는 함수"""
    fig, axes = plt.subplots(2, 3, figsize=(18, 12))
    fig.suptitle('에이전트 역할 할당 변화 통계 분석', fontsize=16, fontweight='bold')
    
    # 1. 에이전트만 평균 역할 수 변화
    ax1 = axes[0, 0]
    agent_only_data = defaultdict(list)
    for participant, teams in results.items():
        for team in teams:
            team_num = team['team_number']
            agent_only_data[team_num].append(team['avg_roles_per_agent'])
    
    teams = sorted(agent_only_data.keys())
    means = [np.mean(agent_only_data[team]) for team in teams]
    stds = [np.std(agent_only_data[team]) for team in teams]
    
    ax1.errorbar(teams, means, yerr=stds, marker='o', linewidth=3, capsize=8, capthick=2, 
                markersize=8, color='#2E86AB')
    ax1.fill_between(teams, [m-s for m,s in zip(means, stds)], [m+s for m,s in zip(means, stds)], 
                     alpha=0.2, color='#2E86AB')
    ax1.set_xlabel('팀 순서')
    ax1.set_ylabel('평균 역할 수')
    ax1.set_title('에이전트만 - 평균 역할 수 변화')
    ax1.grid(True, alpha=0.3)
    ax1.set_xticks(teams)
    
    # 2. 사용자 포함 평균 역할 수 변화
    ax2 = axes[0, 1]
    including_user_data = defaultdict(list)
    for participant, teams in results.items():
        for team in teams:
            team_num = team['team_number']
            including_user_data[team_num].append(team['avg_roles_including_user'])
    
    teams_list = sorted(including_user_data.keys())
    means_user = [np.mean(including_user_data[team]) for team in teams_list]
    stds_user = [np.std(including_user_data[team]) for team in teams_list]
    
    ax2.errorbar(teams_list, means_user, yerr=stds_user, marker='s', linewidth=3, capsize=8, capthick=2,
                markersize=8, color='#A23B72')
    ax2.fill_between(teams_list, [m-s for m,s in zip(means_user, stds_user)], [m+s for m,s in zip(means_user, stds_user)], 
                     alpha=0.2, color='#A23B72')
    ax2.set_xlabel('팀 순서')
    ax2.set_ylabel('평균 역할 수')
    ax2.set_title('사용자 포함 - 평균 역할 수 변화')
    ax2.grid(True, alpha=0.3)
    ax2.set_xticks(teams_list)
    
    # 3. 비교 그래프 (에이전트 vs 사용자 포함)
    ax3 = axes[0, 2]
    x = np.arange(len(teams_list))
    width = 0.35
    
    ax3.bar(x - width/2, means, width, yerr=stds, label='에이전트만', 
            color='#2E86AB', alpha=0.7, capsize=5)
    ax3.bar(x + width/2, means_user, width, yerr=stds_user, label='사용자 포함',
            color='#A23B72', alpha=0.7, capsize=5)
    
    ax3.set_xlabel('팀 순서')
    ax3.set_ylabel('평균 역할 수')
    ax3.set_title('에이전트 vs 사용자 포함 비교')
    ax3.set_xticks(x)
    ax3.set_xticklabels([f'Team {t}' for t in teams_list])
    ax3.legend()
    ax3.grid(True, alpha=0.3)
    
    # 4-6. 역할별 할당 개수 변화
    role_types = ["아이디어 생성하기", "아이디어 평가하기", "피드백하기", "요청하기"]
    role_short_names = ["생성", "평가", "피드백", "요청"]
    colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4']
    
    # 역할별 데이터 수집 (절대 개수)
    role_data = {}
    for role_type in role_types:
        role_data[role_type] = defaultdict(list)
    
    for participant, teams in results.items():
        for team in teams:
            team_num = team['team_number']
            for role_type in role_types:
                role_count = team['role_assignment_counts'][role_type]
                role_data[role_type][team_num].append(role_count)
    
    # 4. 모든 역할을 하나의 그래프에
    ax4 = axes[1, 0]
    role_teams = sorted(role_data[role_types[0]].keys())  # 역할 데이터의 팀 순서
    for i, role_type in enumerate(role_types):
        role_means = [np.mean(role_data[role_type][team]) for team in role_teams]
        role_stds = [np.std(role_data[role_type][team]) for team in role_teams]
        ax4.errorbar(role_teams, role_means, yerr=role_stds, marker='o', linewidth=2, 
                    label=role_short_names[i], color=colors[i], capsize=4)
    
    ax4.set_xlabel('팀 순서')
    ax4.set_ylabel('할당 개수')
    ax4.set_title('역할별 할당 개수 변화')
    ax4.legend()
    ax4.grid(True, alpha=0.3)
    ax4.set_xticks(role_teams)
    ax4.set_ylim(0, None)  # 자동 조정
    
    # 5. 역할별 변화량 (Team 1 → Team 3)
    ax5 = axes[1, 1]
    changes = []
    role_names = []
    change_colors = []
    
    for i, role_type in enumerate(role_types):
        if len(role_data[role_type]) >= 2:
            teams_sorted = sorted(role_data[role_type].keys())
            first_avg = np.mean(role_data[role_type][teams_sorted[0]])
            last_avg = np.mean(role_data[role_type][teams_sorted[-1]])
            change = last_avg - first_avg
            changes.append(change)
            role_names.append(role_short_names[i])
            change_colors.append('#2ECC71' if change > 0 else '#E74C3C')
    
    bars = ax5.bar(role_names, changes, color=change_colors, alpha=0.7)
    ax5.axhline(y=0, color='black', linestyle='-', alpha=0.3)
    ax5.set_ylabel('변화량 (개수)')
    ax5.set_title('역할별 전체 변화량 (Team 1 → Team 3)')
    ax5.grid(True, alpha=0.3, axis='y')
    
    # 막대 위에 값 표시
    for bar, change in zip(bars, changes):
        height = bar.get_height()
        ax5.annotate(f'{change:+.1f}개',
                    xy=(bar.get_x() + bar.get_width() / 2, height),
                    xytext=(0, 3 if height > 0 else -15),
                    textcoords="offset points",
                    ha='center', va='bottom' if height > 0 else 'top',
                    fontweight='bold')
    
    # 6. 박스플롯 - 팀별 분포
    ax6 = axes[1, 2]
    agent_box_data = [agent_only_data[team] for team in teams_list]
    user_box_data = [including_user_data[team] for team in teams_list]
    
    # 두 그룹을 나란히 배치
    positions1 = [i - 0.2 for i in range(len(teams_list))]
    positions2 = [i + 0.2 for i in range(len(teams_list))]
    
    bp1 = ax6.boxplot(agent_box_data, positions=positions1, widths=0.3, patch_artist=True,
                      boxprops=dict(facecolor='#2E86AB', alpha=0.7))
    bp2 = ax6.boxplot(user_box_data, positions=positions2, widths=0.3, patch_artist=True,
                      boxprops=dict(facecolor='#A23B72', alpha=0.7))
    
    ax6.set_xlabel('팀 순서')
    ax6.set_ylabel('평균 역할 수')
    ax6.set_title('팀별 평균 역할 수 분포')
    ax6.set_xticks(range(len(teams_list)))
    ax6.set_xticklabels([f'Team {t}' for t in teams_list])
    ax6.grid(True, alpha=0.3)
    
    # 범례 추가
    ax6.plot([], [], color='#2E86AB', label='에이전트만', linewidth=5)
    ax6.plot([], [], color='#A23B72', label='사용자 포함', linewidth=5)
    ax6.legend()
    
    plt.tight_layout()
    plt.show()

def main():
    """메인 실행 함수"""
    # 한글 폰트 설정
    plt.rcParams['font.family'] = ['Arial Unicode MS', 'AppleGothic', 'Malgun Gothic', 'DejaVu Sans']
    plt.rcParams['axes.unicode_minus'] = False
    
    # 데이터 로드
    teams = load_teams_data()
    
    # 고유한 참가자 목록 확인
    owners = get_unique_owners(teams)
    print("사용 가능한 참가자 목록:")
    for owner_id, owner_name in owners.items():
        print(f"  - {owner_name}")
    
    # 분석할 참가자 선택 (12명)
    selected_participants = [
        "김태완",    # 1
        "백선우",    # 2
        "송유택",    # 3
        "임현정",    # 4
        "서익준",    # 5
        "박유빈",    # 6
        "최대호",    # 7
        "한수지",    # 8
        "김윤영",    # 9
        "정영철",    # 10
        "남호연",    # 11
        "홍가영",    # 12
    ]
    
    print(f"\n선택된 참가자: {selected_participants}")
    
    # 팀 필터링 (참가자별 최대 3개 팀)
    filtered_teams = filter_teams_by_participants(teams, selected_participants, max_teams_per_person=3)
    
    # 참가자별로 팀 그룹화
    teams_by_participant = defaultdict(list)
    for team in filtered_teams:
        owner_name = team.get('owner_info', {}).get('name', 'Unknown')
        teams_by_participant[owner_name].append(team)
    
    # 팀 번호순으로 정렬
    for participant in teams_by_participant:
        teams_by_participant[participant] = sorted(
            teams_by_participant[participant], 
            key=lambda x: x.get('team_info', {}).get('createdAt', '')
        )
    
    print(f"\n필터링된 팀 수: {len(filtered_teams)}개")
    for participant, teams in teams_by_participant.items():
        print(f"  - {participant}: {len(teams)}개 팀")
    
    # 역할 분석 수행
    results = calculate_team_averages(teams_by_participant)
    
    # 전체 통계만 출력
    print_overall_statistics(results)
    
    # 통계 결과 그래프로 시각화
    visualize_statistics(results)

if __name__ == "__main__":
    main()