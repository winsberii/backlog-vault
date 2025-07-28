-- Create storage bucket for cover images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('cover-images', 'cover-images', true);

-- Create policies for cover images bucket
CREATE POLICY "Users can view cover images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'cover-images');

CREATE POLICY "Authenticated users can upload cover images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'cover-images' 
  AND auth.uid() IS NOT NULL
  AND (storage.extension(name) = ANY(ARRAY['jpg', 'jpeg', 'png', 'webp']))
);

CREATE POLICY "Users can update their own cover images" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'cover-images' 
  AND auth.uid() IS NOT NULL
);

CREATE POLICY "Users can delete their own cover images" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'cover-images' 
  AND auth.uid() IS NOT NULL
);