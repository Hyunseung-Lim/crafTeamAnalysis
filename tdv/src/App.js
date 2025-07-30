import React, { useState, useEffect } from 'react';
import './App.css';
import TeamsData from './structured_teams.json';
import TeamCard from './components/TeamCard';
import TeamDetail from './components/TeamDetail';
import FilterPanel from './components/FilterPanel';

function App() {
  const [teams, setTeams] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [filteredTeams, setFilteredTeams] = useState([]);
  const [filters, setFilters] = useState({
    participant: ''
  });
  const [availableParticipants, setAvailableParticipants] = useState([]);

  useEffect(() => {
    // evaluation이 있는 팀만 필터링
    const teamsWithEvaluations = TeamsData.filter(team => 
      team.evaluations && team.evaluations.length > 0
    );
    
    // 소유자별로 그룹화하고 팀 번호 할당
    const ownerGroups = {};
    const processedTeams = [];
    
    teamsWithEvaluations.forEach((team) => {
      const ownerName = team.owner_info?.name || 'Unknown';
      
      if (!ownerGroups[ownerName]) {
        ownerGroups[ownerName] = { count: 0, participantNumber: Object.keys(ownerGroups).length + 1 };
      }
      
      ownerGroups[ownerName].count++;
      const participantNumber = ownerGroups[ownerName].participantNumber;
      const teamNumber = ownerGroups[ownerName].count;
      
      processedTeams.push({
        ...team,
        displayNumber: `P${participantNumber}_team#${teamNumber}`
      });
    });
    
    // 사용 가능한 참가자 번호 추출
    const participants = [...new Set(processedTeams.map(team => {
      const match = team.displayNumber.match(/^P(\d+)/);
      return match ? `P${match[1]}` : null;
    }).filter(Boolean))].sort((a, b) => {
      // P1, P2, ..., P9, P10, P11 순서로 정렬
      const numA = parseInt(a.substring(1));
      const numB = parseInt(b.substring(1));
      return numA - numB;
    });
    
    setTeams(processedTeams);
    setFilteredTeams(processedTeams);
    setAvailableParticipants(participants);
  }, []);

  useEffect(() => {
    let filtered = teams.filter(team => {
      const participantMatch = !filters.participant || 
        team.displayNumber.startsWith(filters.participant + '_');
      
      return participantMatch;
    });
    setFilteredTeams(filtered);
  }, [filters, teams]);

  return (
    <div className="App">
      <header className="app-header">
        <h1>Team Data Visualizer</h1>
        <p>총 {teams.length}개 팀, {filteredTeams.length}개 표시 중</p>
      </header>
      
      <div className="app-content">
        {!selectedTeam ? (
          <>
            <FilterPanel 
              filters={filters} 
              setFilters={setFilters} 
              availableParticipants={availableParticipants}
            />
            <div className="teams-grid">
              {filteredTeams.map((team) => (
                <TeamCard 
                  key={team.team_id} 
                  team={team} 
                  onSelect={() => setSelectedTeam(team)}
                />
              ))}
            </div>
          </>
        ) : (
          <TeamDetail 
            team={selectedTeam} 
            onBack={() => setSelectedTeam(null)} 
          />
        )}
      </div>
    </div>
  );
}

export default App;
