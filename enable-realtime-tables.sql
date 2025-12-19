-- Enable Supabase real-time replication for remaining tables
-- Run this in the Supabase SQL editor

-- Enable real-time for tasks table
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;

-- Enable real-time for rfis table
ALTER PUBLICATION supabase_realtime ADD TABLE rfis;

-- Enable real-time for submittals table
ALTER PUBLICATION supabase_realtime ADD TABLE submittals;

-- Enable real-time for change_orders table
ALTER PUBLICATION supabase_realtime ADD TABLE change_orders;

-- Enable real-time for documents table
ALTER PUBLICATION supabase_realtime ADD TABLE documents;

-- Verify which tables are enabled for real-time
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
ORDER BY tablename;
