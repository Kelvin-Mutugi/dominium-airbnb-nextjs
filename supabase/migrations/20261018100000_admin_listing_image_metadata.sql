alter table public.listing_images
  add column if not exists position integer,
  add column if not exists category text,
  add column if not exists room_index integer,
  add column if not exists caption text not null default '',
  add column if not exists is_cover boolean not null default false,
  add column if not exists width integer,
  add column if not exists height integer;

with ranked_images as (
  select
    id,
    row_number() over (
      partition by listing_id
      order by sort_order asc, id asc
    ) - 1 as image_position
  from public.listing_images
)
update public.listing_images as image
set position = ranked_images.image_position
from ranked_images
where ranked_images.id = image.id
  and image.position is null;

alter table public.listing_images
  alter column position set not null;

with ranked_images as (
  select
    id,
    row_number() over (
      partition by listing_id
      order by sort_order asc, id asc
    ) as image_rank
  from public.listing_images
)
update public.listing_images as image
set is_cover = ranked_images.image_rank = 1
from ranked_images
  where ranked_images.id = image.id
    and ranked_images.image_rank = 1
    and not exists (
      select 1
      from public.listing_images as existing_cover
      where existing_cover.listing_id = image.listing_id
        and existing_cover.is_cover
    );

alter table public.listing_images
  drop constraint if exists listing_images_category_check,
  drop constraint if exists listing_images_position_check,
  drop constraint if exists listing_images_room_index_check,
  drop constraint if exists listing_images_category_room_index_check,
  drop constraint if exists listing_images_caption_length_check,
  drop constraint if exists listing_images_width_check,
  drop constraint if exists listing_images_height_check;

alter table public.listing_images
  add constraint listing_images_position_check
    check (position >= 0),
  add constraint listing_images_category_check
    check (
      category is null
      or category in (
        'exterior',
        'living',
        'kitchen',
        'bedroom',
        'bathroom',
        'outdoor',
        'amenities',
        'neighborhood'
      )
    ),
  add constraint listing_images_room_index_check
    check (room_index is null or room_index between 1 and 10),
  add constraint listing_images_category_room_index_check
    check (
      category is null
      or (
        category in ('bedroom', 'bathroom')
        and room_index is not null
      )
      or (
        category not in ('bedroom', 'bathroom')
        and room_index is null
      )
    ),
  add constraint listing_images_caption_length_check
    check (char_length(caption) <= 80),
  add constraint listing_images_width_check
    check (width is null or width > 0),
  add constraint listing_images_height_check
    check (height is null or height > 0);

create unique index if not exists listing_images_one_cover_per_listing_idx
  on public.listing_images (listing_id)
  where is_cover;

create unique index if not exists listing_images_listing_position_idx
  on public.listing_images (listing_id, position);
