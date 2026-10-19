alter table businesses add column if not exists use_logo_colors boolean not null default false;
alter table businesses add column if not exists accent_color text not null default '';
