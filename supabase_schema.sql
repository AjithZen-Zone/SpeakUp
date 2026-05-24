-- ============================================
-- SPEAKUP SUPABASE SCHEMA
-- Run this in your Supabase SQL editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- PROFILES TABLE (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE,
  full_name TEXT,
  level TEXT DEFAULT 'beginner',
  streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  total_xp INTEGER DEFAULT 0,
  last_completed_date DATE,
  total_days_completed INTEGER DEFAULT 0,
  join_date TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- PROGRESS TABLE (tracks each module completion per day)
CREATE TABLE IF NOT EXISTS progress (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  module TEXT NOT NULL, -- vocab, writing, grammar, reading, accent, interview
  completed BOOLEAN DEFAULT FALSE,
  score INTEGER DEFAULT 0,
  xp INTEGER DEFAULT 0,
  data JSONB, -- store extra data like writing text, scores etc
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, date, module)
);

-- VOCABULARY LOG (words learned by user)
CREATE TABLE IF NOT EXISTS vocab_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  meaning TEXT,
  learned_at TIMESTAMP DEFAULT NOW()
);

-- WRITING LOG (writing submissions)
CREATE TABLE IF NOT EXISTS writing_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  prompt TEXT,
  response TEXT,
  clarity_score INTEGER,
  grammar_score INTEGER,
  vocab_score INTEGER,
  overall_score INTEGER,
  feedback TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- DAILY TASKS CACHE (so same user gets same tasks all day)
CREATE TABLE IF NOT EXISTS daily_tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  theme TEXT,
  writing_prompt TEXT,
  grammar_tip TEXT,
  accent_focus TEXT,
  interview_question TEXT,
  vocab_words JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ROW LEVEL SECURITY
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE vocab_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE writing_log ENABLE ROW LEVEL SECURITY;

-- POLICIES: users can only see/edit their own data
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own progress" ON progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own progress" ON progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress" ON progress FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own vocab" ON vocab_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own vocab" ON vocab_log FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own writing" ON writing_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own writing" ON writing_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Daily tasks are public (same for everyone)
ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Daily tasks are public" ON daily_tasks FOR SELECT USING (true);

-- FUNCTION: auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, username)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'username'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- TRIGGER: fire on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- INDEXES for performance
CREATE INDEX IF NOT EXISTS idx_progress_user_date ON progress(user_id, date);
CREATE INDEX IF NOT EXISTS idx_progress_user_module ON progress(user_id, module);
CREATE INDEX IF NOT EXISTS idx_vocab_log_user ON vocab_log(user_id);
CREATE INDEX IF NOT EXISTS idx_writing_log_user ON writing_log(user_id);
