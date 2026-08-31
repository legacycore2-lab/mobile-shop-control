# Mobile Shop Control System

نظام ERP متكامل لإدارة محلات الموبايلات

## Stack
- React + TypeScript + Vite
- Supabase (PostgreSQL + Auth + RLS)
- TanStack Query
- Tailwind CSS + Lucide React

## Setup
```bash
cp .env.example .env
# أضف بيانات Supabase في .env
npm install
npm run dev
```

## Architecture
Pages → Hooks → Services → Repositories → Supabase
