-- Remove the 'type' column from platforms table
ALTER TABLE public.platforms DROP COLUMN type;

-- Add the 'active' boolean column with default false
ALTER TABLE public.platforms ADD COLUMN active boolean NOT NULL DEFAULT false;