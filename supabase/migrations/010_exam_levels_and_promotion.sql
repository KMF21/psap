-- =====================================================================
-- 010  Exam level + bulk change of student level ("promotion")
-- ---------------------------------------------------------------------
--  1. exams.level: which level an exam is for (e.g. "Year 2"). Optional
--     text, same free-text values as students.level.
--  2. student_level_counts(): each level in use with its student count
--     (Admin only), for the level picker and the bulk-change tool.
--  3. admin_change_student_level(from, to): moves every student at one
--     level to another in a single audited step (e.g. Year 2 → Year 3).
--     Exams and past scores are untouched — history stays as it was.
-- =====================================================================

begin;

-- 1. Exam level ----------------------------------------------------------
alter table exams add column level text
  check (level is null or length(trim(level)) between 1 and 60);
create index idx_exams_level on exams (level);
create index if not exists idx_students_level on students (level);

-- Audit: new action for bulk level changes.
alter table audit_log drop constraint audit_log_action_check;
alter table audit_log add constraint audit_log_action_check
  check (action in ('submit', 'admin_edit', 'marks_change', 'reassign', 'release_claim', 'rename',
                    'remove_from_exam', 'remove_skill', 'delete_exam', 'delete_skill', 'change_level'));

-- 2. Levels in use -------------------------------------------------------
create or replace function student_level_counts()
returns table (level text, students bigint)
language sql stable security definer set search_path = public as $$
  select s.level, count(*)
    from students s
   where current_app_role() = 'admin'
   group by s.level
   order by s.level nulls last
$$;

-- 3. Bulk level change ---------------------------------------------------
-- p_from = null means "students with no level set".
create or replace function admin_change_student_level(p_from text, p_to text)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_admin uuid := assert_admin();
  v_to text := nullif(trim(p_to), '');
  v_from text := nullif(trim(p_from), '');
  v_count integer;
begin
  if v_to is null then
    raise exception 'Enter the new level.';
  end if;
  if length(v_to) > 60 then
    raise exception 'Level names can be at most 60 characters.';
  end if;
  if v_from is not distinct from v_to then
    raise exception 'The new level is the same as the current one.';
  end if;

  update students set level = v_to
   where level is not distinct from v_from;
  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception 'No students are at that level.';
  end if;

  insert into audit_log (entity_type, entity_id, action, actor_id, previous_value, new_value)
  values ('student', gen_random_uuid(), 'change_level', v_admin,
          jsonb_build_object('level', coalesce(v_from, '(none)')),
          jsonb_build_object('level', v_to, 'students', v_count));
  return v_count;
end $$;

revoke all on function student_level_counts(), admin_change_student_level(text, text) from public, anon;
grant execute on function student_level_counts(), admin_change_student_level(text, text) to authenticated;

commit;
