ALTER TABLE public.advertisements
  ADD CONSTRAINT advertisements_image_url_safe
    CHECK (image_url = '' OR image_url ~ '^https://[^[:space:]]+$'),
  ADD CONSTRAINT advertisements_link_url_safe
    CHECK (link_url = '' OR link_url ~ '^https://[^[:space:]]+$');