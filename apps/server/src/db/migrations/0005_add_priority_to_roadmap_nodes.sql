-- Add priority column to roadmap_nodes so generated roadmap node priority persists across retrievals
ALTER TABLE roadmap_nodes
ADD COLUMN priority text NOT NULL DEFAULT 'medium';
