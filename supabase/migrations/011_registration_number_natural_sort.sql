-- =====================================================================
-- 011  Sort students by registration number, naturally
-- ---------------------------------------------------------------------
-- Plain text order puts REG/2/10 before REG/2/9. An ICU collation with
-- numeric ordering ("kn") compares the digit runs as numbers, so every
-- list ordered by registration_number comes out the way people expect:
-- REG/2/1, REG/2/2 ... REG/2/9, REG/2/10.
-- The collation is deterministic, so uniqueness and search (ilike) are
-- unchanged. The unique index is rebuilt automatically.
-- =====================================================================
begin;
create collation if not exists natural_sort (provider = icu, locale = 'und-u-kn-true');
alter table students alter column registration_number type text collate natural_sort;
commit;
