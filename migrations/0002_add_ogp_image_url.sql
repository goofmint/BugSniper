-- Migration: Add ogp_image_url column to scores table
-- Created: 2025-11-23

ALTER TABLE scores ADD COLUMN ogp_image_url TEXT;
