-- Add scheduled days to routines (0=Sun, 1=Mon, ..., 6=Sat)
alter table routines add column if not exists days int2[] not null default '{}';
