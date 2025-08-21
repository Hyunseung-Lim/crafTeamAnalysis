# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

CrafTeamAnalysis is a team collaboration data visualization system that processes and visualizes AI-powered team formation data. It consists of a React web application for interactive visualization and Python data processing scripts.

## Development Commands

### Frontend (React Application in /tdv)
```bash
# Install dependencies
cd tdv && npm install

# Run development server (port 3000)
npm start

# Run tests
npm test

# Run specific test file
npm test -- TeamCard.test.js

# Build for production
npm run build

# Run tests with coverage
npm test -- --coverage
```

### Data Processing (Python)
```bash
# Process Redis export to JSON
python processRedisToJson.py

# Test data processing
python test_data_processing.py

# Verify CSV mappings
python verify_csv_data.py
```

## Architecture

### Data Flow
1. **Redis Export** → `redis_export.json` contains raw team formation data
2. **Python Processing** → `processRedisToJson.py` transforms data with CSV evaluation mappings
3. **JSON Output** → `teams_data.json` structured for frontend consumption
4. **React Visualization** → Interactive team cards, network graphs, and filtering

### Frontend Structure (/tdv/src)
- **Components**: TeamCard, TeamDetail, NetworkGraph - modular visualization components
- **Data Model**: Team objects with agents, users, evaluations, and prompts
- **Filtering System**: Real-time participant-based filtering across all teams
- **Korean UI**: Full UTF-8 support with Korean language interface

### Backend Processing
- **CSV Mapping**: `evaluation_v3.csv` contains person-ID-evaluation mappings
- **Data Transformation**: Converts Redis key-value pairs to structured team objects
- **Validation**: Test scripts ensure data integrity during processing

## Key Considerations

### Data Sensitivity
- Contains personal evaluation data and team assessments
- User IDs and evaluation scores are sensitive information
- Ensure proper data handling when modifying processing scripts

### Performance
- Large datasets with multiple teams and complex relationships
- Filtering operations should remain client-side for responsiveness
- Network graph rendering optimized for performance

### Testing
- Frontend tests use Jest and React Testing Library
- Python scripts have custom validation tests
- Test data processing thoroughly before production use