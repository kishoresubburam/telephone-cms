#!/bin/bash
# Grandstream CMS — Start both backend and frontend dev servers

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "Starting Grandstream CMS..."

# Backend
cd "$ROOT/backend"
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID (http://localhost:8000)"

# Frontend dev server
cd "$ROOT/frontend"
npm run dev &
FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID (http://localhost:5173)"

echo ""
echo "CMS running:"
echo "  Frontend: http://localhost:5173"
echo "  Backend API: http://localhost:8000/docs"
echo "  Default login: admin / admin123"
echo ""
echo "Press Ctrl+C to stop all servers"

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
