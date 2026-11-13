-- =====================================================================
-- 009  Draw-based exams, per-exam allowed marks, project chapters
-- ---------------------------------------------------------------------
-- Run as ONE transaction. Safe to read top to bottom:
--   0. Guard (stops if old multi-CSA project rows still exist)
--   1. Audit log: new entity types / actions
--   2. Exams: draws_per_student + derived practical maximum
--   3. Exam skills: paper numbers, one compulsory, equal drawn marks
--   4. Allowed-marks change -> recalculate stored scaled scores + audit
--   5. Rubric lock once scores exist
--   6. Exam CSA roster (replaces per-skill CSA assignment for access)
--   7. Skill assessments: one per student+skill, draw limit, claim lock
--   8. Project components (chapters) + per-chapter scores
--   9. RLS policies rewritten for the roster model
--  10. Progress / claim lookup function (no scores exposed)
--  11. Skill library numbers (paper numbers default to them)
--  12. Admin-only functions: remove student from exam, remove skill from
--      exam, delete exam, reassign a wrong paper number, release a claim
--  13. Retire the per-skill / per-project CSA assignment tables
-- Run AFTER wipe_all_data.sql (all exam data deleted, accounts kept).
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 0. Guard
-- ---------------------------------------------------------------------
do $$
begin
  if exists (
    select 1 from project_assessments
    group by exam_id, student_id having count(*) > 1
  ) then
    raise exception 'Some students have project scores from more than one CSA (SAMPLE data). Delete the SAMPLE data first, then run 009.';
  end if;
  if exists (
    select 1 from skill_assessments
    group by exam_skill_id, student_id having count(*) > 1
  ) then
    raise exception 'Some students have the same skill scored by more than one CSA. Resolve these before running 009.';
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 1. Audit log
-- ---------------------------------------------------------------------
alter table audit_log drop constraint audit_log_entity_type_check;
alter table audit_log add constraint audit_log_entity_type_check
  check (entity_type in ('skill_assessment', 'project_assessment', 'exam_skill', 'project_component',
                         'user', 'exam', 'student', 'skill'));

alter table audit_log drop constraint audit_log_action_check;
alter table audit_log add constraint audit_log_action_check
  check (action in ('submit', 'admin_edit', 'marks_change', 'reassign', 'release_claim', 'rename',
                    'remove_from_exam', 'remove_skill', 'delete_exam', 'delete_skill'));

-- ---------------------------------------------------------------------
-- 2. Exams
-- ---------------------------------------------------------------------
alter table exams
  add column draws_per_student integer not null default 3
  check (draws_per_student between 0 and 20);

-- practical_target_total becomes DERIVED: compulsory marks + N x drawn marks.
create or replace function recompute_exam_practical_max(p_exam_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_comp numeric;
  v_drawn numeric;
  v_n integer;
begin
  select coalesce(max(assigned_marks) filter (where is_compulsory), 0),
         coalesce(max(assigned_marks) filter (where not is_compulsory), 0)
    into v_comp, v_drawn
    from exam_skills where exam_id = p_exam_id;
  select draws_per_student into v_n from exams where id = p_exam_id;
  update exams
     set practical_target_total = v_comp + coalesce(v_n, 0) * v_drawn,
         updated_at = now()
   where id = p_exam_id
     and practical_target_total is distinct from v_comp + coalesce(v_n, 0) * v_drawn;
end $$;

create or replace function trg_exams_draws_changed()
returns trigger language plpgsql set search_path = public as $$
begin
  perform recompute_exam_practical_max(new.id);
  return null;
end $$;

create trigger trg_exams_practical_max
  after insert or update of draws_per_student on exams
  for each row execute function trg_exams_draws_changed();

-- An exam can only be OPENED when it is a valid draw exam.
create or replace function enforce_exam_open_rules()
returns trigger language plpgsql set search_path = public as $$
declare
  v_comp integer;
  v_pool integer;
begin
  if new.status = 'open' and old.status is distinct from 'open' then
    select count(*) filter (where is_compulsory), count(*) filter (where not is_compulsory)
      into v_comp, v_pool from exam_skills where exam_id = new.id;
    if v_comp <> 1 then
      raise exception 'An exam needs exactly one compulsory skill before it can be opened.';
    end if;
    if v_pool < new.draws_per_student then
      raise exception 'The draw pool has % skill(s) but each student draws %. Add skills or lower the number of draws.', v_pool, new.draws_per_student;
    end if;
  end if;
  return new;
end $$;

create trigger trg_exam_open_rules
  before update of status on exams
  for each row execute function enforce_exam_open_rules();

-- ---------------------------------------------------------------------
-- 3. Exam skills: paper numbers, one compulsory, equal drawn marks
-- ---------------------------------------------------------------------
alter table exam_skills add column paper_number integer check (paper_number > 0);

-- Backfill: drawn skills numbered 1..n per exam by display order.
with numbered as (
  select id, row_number() over (partition by exam_id order by display_order nulls last, id) as n
  from exam_skills where not is_compulsory
)
update exam_skills es set paper_number = numbered.n from numbered where numbered.id = es.id;

alter table exam_skills add constraint exam_skills_paper_number_rule
  check ((is_compulsory and paper_number is null) or (not is_compulsory and paper_number is not null));
alter table exam_skills add constraint exam_skills_exam_paper_unique unique (exam_id, paper_number);
create unique index exam_skills_one_compulsory on exam_skills (exam_id) where is_compulsory;

-- Every drawn skill in an exam carries the same marks. Deferred to commit,
-- so the Admin can change the whole pool in one statement / transaction.
create or replace function enforce_equal_drawn_marks()
returns trigger language plpgsql set search_path = public as $$
begin
  if exists (
    select 1 from exam_skills
    where exam_id = new.exam_id and not is_compulsory
    having count(distinct assigned_marks) > 1
  ) then
    raise exception 'All drawn skills in an exam must carry the same allowed marks.';
  end if;
  return null;
end $$;

create constraint trigger trg_equal_drawn_marks
  after insert or update of assigned_marks, is_compulsory on exam_skills
  deferrable initially deferred
  for each row execute function enforce_equal_drawn_marks();

-- Keep the exam's practical maximum in step with its skills.
create or replace function trg_exam_skills_practical_max()
returns trigger language plpgsql set search_path = public as $$
begin
  perform recompute_exam_practical_max(coalesce(new.exam_id, old.exam_id));
  return null;
end $$;

create trigger trg_exam_skills_practical_max
  after insert or delete or update of assigned_marks, is_compulsory on exam_skills
  for each row execute function trg_exam_skills_practical_max();

-- ---------------------------------------------------------------------
-- 4. Allowed marks changed after scores exist -> recalculate + audit
--    Same formula as scaleScore(): round(raw / native * marks, 1).
--    Runs inside the same transaction as the marks update, so either
--    everything changes or nothing does.
-- ---------------------------------------------------------------------
create or replace function recalc_scores_on_marks_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_native numeric;
  v_count integer;
begin
  if new.assigned_marks is not distinct from old.assigned_marks then
    return null;
  end if;
  select native_total into v_native from skills where id = new.skill_id;

  update skill_assessments
     set scaled_score = case when coalesce(v_native, 0) = 0 then 0
                             else round(raw_score / v_native * new.assigned_marks, 1) end,
         updated_at = now()
   where exam_skill_id = new.id and raw_score is not null;
  get diagnostics v_count = row_count;
  if v_count = 0 then
    return null; -- no scores yet: ordinary setup, nothing to audit
  end if;

  insert into audit_log (entity_type, entity_id, action, actor_id, previous_value, new_value)
  values ('exam_skill', new.id, 'marks_change', current_app_user_id(),
          jsonb_build_object('assigned_marks', old.assigned_marks),
          jsonb_build_object('assigned_marks', new.assigned_marks, 'scores_recalculated', v_count));
  return null;
end $$;

create trigger trg_recalc_on_marks_change
  after update of assigned_marks on exam_skills
  for each row execute function recalc_scores_on_marks_change();

-- ---------------------------------------------------------------------
-- 5. Rubric lock: once any score exists for a skill (in any exam),
--    steps cannot be added, removed, or have their marks changed.
--    Wording (description) and order may still be corrected.
-- ---------------------------------------------------------------------
create or replace function enforce_rubric_lock()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_skill uuid := coalesce(new.skill_id, old.skill_id);
begin
  if tg_op = 'UPDATE'
     and new.max_marks is not distinct from old.max_marks
     and new.skill_id is not distinct from old.skill_id then
    return new; -- wording / order change only
  end if;
  if exists (
    select 1 from skill_assessments sa join exam_skills es on es.id = sa.exam_skill_id
    where es.skill_id = v_skill
  ) then
    raise exception 'This skill already has scores, so its rubric steps and marks are locked.';
  end if;
  return coalesce(new, old);
end $$;

create trigger trg_rubric_lock
  before insert or update or delete on skill_steps
  for each row execute function enforce_rubric_lock();

-- ---------------------------------------------------------------------
-- 6. Exam CSA roster
-- ---------------------------------------------------------------------
create table exam_csas (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  csa_id uuid not null references users(id),
  created_at timestamptz not null default now(),
  unique (exam_id, csa_id)
);
create index idx_exam_csas_csa on exam_csas (csa_id);
alter table exam_csas enable row level security;


create or replace function is_exam_csa(p_exam_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from exam_csas where exam_id = p_exam_id and csa_id = current_app_user_id())
$$;

-- ---------------------------------------------------------------------
-- 7. Skill assessments
-- ---------------------------------------------------------------------
alter table skill_assessments add column draw_order smallint check (draw_order > 0);

-- One assessment per student per skill: this IS the "two CSAs can't score
-- the same student + skill" lock. The first CSA's draft holds the slot.
alter table skill_assessments drop constraint skill_assessments_exam_skill_id_student_id_csa_id_key;
alter table skill_assessments add constraint skill_assessments_exam_skill_student_unique
  unique (exam_skill_id, student_id);

-- Backfill draw_order for existing drawn scores.
with ordered as (
  select sa.id, row_number() over (partition by es.exam_id, sa.student_id order by sa.created_at, sa.id) as n
  from skill_assessments sa join exam_skills es on es.id = sa.exam_skill_id
  where not es.is_compulsory
)
update skill_assessments sa set draw_order = ordered.n from ordered where ordered.id = sa.id;

create or replace function enforce_draw_rules()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_exam uuid;
  v_comp boolean;
  v_n integer;
  v_status text;
  v_taken integer;
  v_holder text;
begin
  select es.exam_id, es.is_compulsory, e.draws_per_student, e.status
    into v_exam, v_comp, v_n, v_status
    from exam_skills es join exams e on e.id = es.exam_id
   where es.id = new.exam_skill_id;

  -- CSAs cannot write to a closed exam (Admin corrections still allowed).
  if current_app_role() = 'csa' and v_status = 'closed' then
    raise exception 'This examination is closed. Ask the Admin to make changes.';
  end if;

  if not exists (select 1 from exam_eligibility where exam_id = v_exam and student_id = new.student_id) then
    raise exception 'This student is not on the roster for this examination.';
  end if;

  -- Same student + skill already held (draft) or scored by someone.
  select u.full_name into v_holder
    from skill_assessments sa join users u on u.id = sa.csa_id
   where sa.exam_skill_id = new.exam_skill_id and sa.student_id = new.student_id and sa.id <> new.id
   limit 1;
  if v_holder is not null then
    raise exception 'This skill is already recorded for this student (by %).', v_holder
      using errcode = 'unique_violation';
  end if;

  if v_comp then
    new.draw_order := null;
  elsif tg_op = 'INSERT' or new.exam_skill_id is distinct from old.exam_skill_id then
    -- Serialise draws for this student in this exam so two CSAs can't
    -- both record the "last" draw at the same moment.
    perform pg_advisory_xact_lock(hashtextextended(v_exam::text || new.student_id::text, 0));
    select count(*) into v_taken
      from skill_assessments sa join exam_skills es on es.id = sa.exam_skill_id
     where es.exam_id = v_exam and not es.is_compulsory
       and sa.student_id = new.student_id and sa.id <> new.id;
    if v_taken >= v_n then
      raise exception 'This student has already drawn % skill(s), the limit for this exam.', v_n;
    end if;
    if new.draw_order is null or tg_op = 'INSERT' then
      new.draw_order := v_taken + 1;
    end if;
  end if;
  return new;
end $$;

create trigger trg_draw_rules
  before insert or update of exam_skill_id, student_id on skill_assessments
  for each row execute function enforce_draw_rules();

-- ---------------------------------------------------------------------
-- 8. Project components (chapters)
-- ---------------------------------------------------------------------
create table exam_project_components (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  max_marks numeric not null check (max_marks > 0),
  display_order integer not null default 1,
  created_at timestamptz not null default now()
);
create index idx_project_components_exam on exam_project_components (exam_id);
alter table exam_project_components enable row level security;

create table project_component_scores (
  id uuid primary key default gen_random_uuid(),
  project_assessment_id uuid not null references project_assessments(id) on delete cascade,
  component_id uuid not null references exam_project_components(id),
  score numeric not null check (score >= 0),
  unique (project_assessment_id, component_id)
);
create index idx_component_scores_component on project_component_scores (component_id);
alter table project_component_scores enable row level security;

-- One project assessment per student per exam.
alter table project_assessments drop constraint project_assessments_exam_id_student_id_csa_id_key;
alter table project_assessments add constraint project_assessments_exam_student_unique unique (exam_id, student_id);


-- Project maximum = sum of component maxima, kept on the exam.
create or replace function trg_components_project_max()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_exam uuid := coalesce(new.exam_id, old.exam_id);
begin
  update exams set project_max_total =
    (select coalesce(sum(max_marks), 0) from exam_project_components where exam_id = v_exam),
    updated_at = now()
  where id = v_exam;
  update project_assessments set max_marks =
    (select coalesce(sum(max_marks), 0) from exam_project_components where exam_id = v_exam)
  where exam_id = v_exam;
  return null;
end $$;

create trigger trg_components_project_max
  after insert or delete or update of max_marks on exam_project_components
  for each row execute function trg_components_project_max();

-- New project exams start with Chapter 1-5 at 4 marks each (20 total);
-- the Admin can rename, re-mark, add or remove chapters before scoring.
-- Switching an exam to practical-only removes its chapters (blocked by the
-- chapter lock if project scores already exist).
create or replace function trg_exam_default_components()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.exam_type = 'practical_and_project' then
    if not exists (select 1 from exam_project_components where exam_id = new.id) then
      insert into exam_project_components (exam_id, name, max_marks, display_order)
      select new.id, 'Chapter ' || g, 4, g from generate_series(1, 5) g;
    end if;
  elsif tg_op = 'UPDATE' then
    delete from exam_project_components where exam_id = new.id;
  end if;
  return null;
end $$;

create trigger trg_exam_default_components
  after insert or update of exam_type on exams
  for each row execute function trg_exam_default_components();

insert into exam_project_components (exam_id, name, max_marks, display_order)
select e.id, 'Chapter ' || g, 4, g
  from exams e cross join generate_series(1, 5) g
 where e.exam_type = 'practical_and_project'
   and not exists (select 1 from exam_project_components c where c.exam_id = e.id);

-- Chapter marks locked once any chapter score exists for the exam.
create or replace function enforce_component_lock()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and new.max_marks is not distinct from old.max_marks then
    return new; -- rename / reorder only
  end if;
  if exists (
    select 1 from project_component_scores s join exam_project_components c on c.id = s.component_id
    where c.exam_id = coalesce(new.exam_id, old.exam_id)
  ) then
    raise exception 'Project scores already exist for this exam, so chapters and their marks are locked.';
  end if;
  return coalesce(new, old);
end $$;

create trigger trg_component_lock
  before insert or update or delete on exam_project_components
  for each row execute function enforce_component_lock();

-- Each chapter score must be within that chapter's max and belong to the
-- same exam; closed exams block CSA writes.
create or replace function enforce_component_score_limits()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_max numeric;
  v_comp_exam uuid;
  v_pa_exam uuid;
  v_status text;
begin
  select max_marks, exam_id into v_max, v_comp_exam from exam_project_components where id = new.component_id;
  select pa.exam_id, e.status into v_pa_exam, v_status
    from project_assessments pa join exams e on e.id = pa.exam_id
   where pa.id = new.project_assessment_id;
  if v_comp_exam is distinct from v_pa_exam then
    raise exception 'That chapter does not belong to this examination.';
  end if;
  if new.score < 0 or new.score > v_max then
    raise exception 'Chapter score % is outside 0..%', new.score, v_max;
  end if;
  if current_app_role() = 'csa' and v_status = 'closed' then
    raise exception 'This examination is closed. Ask the Admin to make changes.';
  end if;
  return new;
end $$;

create trigger trg_component_score_limits
  before insert or update on project_component_scores
  for each row execute function enforce_component_score_limits();

-- Project total = sum of chapter scores (kept on project_assessments).
create or replace function trg_component_scores_total()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_pa uuid := coalesce(new.project_assessment_id, old.project_assessment_id);
begin
  update project_assessments set
    score = (select round(coalesce(sum(score), 0), 1) from project_component_scores where project_assessment_id = v_pa),
    updated_at = now()
  where id = v_pa;
  return null;
end $$;

create trigger trg_component_scores_total
  after insert or update or delete on project_component_scores
  for each row execute function trg_component_scores_total();

-- Replace 008's project limit check: max now comes from the chapters.
create or replace function enforce_project_assessment_limits()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_max numeric;
  v_status text;
begin
  select coalesce(sum(max_marks), 0) into v_max from exam_project_components where exam_id = new.exam_id;
  select status into v_status from exams where id = new.exam_id;
  if v_max = 0 then
    v_max := new.max_marks; -- legacy row on an exam without chapters
  end if;
  new.max_marks := v_max;
  if new.score is not null and (new.score < 0 or new.score > v_max) then
    raise exception 'Project score % is outside 0..%', new.score, v_max;
  end if;
  if current_app_role() = 'csa' and v_status = 'closed' then
    raise exception 'This examination is closed. Ask the Admin to make changes.';
  end if;
  if current_app_role() = 'csa'
     and not exists (select 1 from exam_eligibility where exam_id = new.exam_id and student_id = new.student_id) then
    raise exception 'This student is not on the roster for this examination.';
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------
-- 9. RLS policies (roster model)
-- ---------------------------------------------------------------------
-- exam_csas
create policy admin_all_exam_csas on exam_csas for all using (current_app_role() = 'admin');
create policy csa_read_own_exam_csas on exam_csas for select
  using (current_app_role() = 'csa' and csa_id = current_app_user_id());

-- exam_skills: any skill in an exam the CSA is rostered on
drop policy csa_read_own_exam_skills on exam_skills;
create policy csa_read_roster_exam_skills on exam_skills for select
  using (current_app_role() = 'csa' and is_exam_csa(exam_id));

-- students: eligible for an exam the CSA is rostered on
drop policy csa_read_eligible_students on students;
create policy csa_read_eligible_students on students for select
  using (current_app_role() = 'csa' and exists (
    select 1 from exam_eligibility e where e.student_id = students.id and is_exam_csa(e.exam_id)));

-- skill_assessments: insert for any rostered exam; own rows only otherwise
drop policy csa_insert_own_skill_assessments on skill_assessments;
create policy csa_insert_own_skill_assessments on skill_assessments for insert
  with check (
    current_app_role() = 'csa'
    and csa_id = current_app_user_id()
    and exists (select 1 from exam_skills es where es.id = skill_assessments.exam_skill_id and is_exam_csa(es.exam_id))
  );
-- (csa_select_own_skill_assessments and csa_update_own_draft_skill_assessments stay as they are)
create policy csa_delete_own_draft_skill_assessments on skill_assessments for delete
  using (current_app_role() = 'csa' and csa_id = current_app_user_id() and status = 'draft');

-- Step scores: a CSA may read their own, but only WRITE while the assessment
-- is still a draft (closes a gap where submitted step scores could change).
drop policy csa_own_step_scores on skill_assessment_step_scores;
create policy csa_read_own_step_scores on skill_assessment_step_scores for select
  using (current_app_role() = 'csa' and exists (
    select 1 from skill_assessments sa
    where sa.id = skill_assessment_step_scores.skill_assessment_id and sa.csa_id = current_app_user_id()));
create policy csa_write_own_draft_step_scores on skill_assessment_step_scores for all
  using (current_app_role() = 'csa' and exists (
    select 1 from skill_assessments sa
    where sa.id = skill_assessment_step_scores.skill_assessment_id
      and sa.csa_id = current_app_user_id() and sa.status = 'draft'))
  with check (current_app_role() = 'csa' and exists (
    select 1 from skill_assessments sa
    where sa.id = skill_assessment_step_scores.skill_assessment_id
      and sa.csa_id = current_app_user_id() and sa.status = 'draft'));

-- project_assessments: any rostered CSA may score the project
drop policy csa_insert_own_project_assessments on project_assessments;
create policy csa_insert_own_project_assessments on project_assessments for insert
  with check (current_app_role() = 'csa' and csa_id = current_app_user_id() and is_exam_csa(exam_id));

-- project components / scores
create policy admin_all_project_components on exam_project_components for all using (current_app_role() = 'admin');
create policy csa_read_project_components on exam_project_components for select
  using (current_app_role() = 'csa' and is_exam_csa(exam_id));

create policy admin_all_component_scores on project_component_scores for all using (current_app_role() = 'admin');
create policy csa_own_draft_component_scores on project_component_scores for all
  using (current_app_role() = 'csa' and exists (
    select 1 from project_assessments pa
    where pa.id = project_component_scores.project_assessment_id
      and pa.csa_id = current_app_user_id()))
  with check (current_app_role() = 'csa' and exists (
    select 1 from project_assessments pa
    where pa.id = project_component_scores.project_assessment_id
      and pa.csa_id = current_app_user_id() and pa.status = 'draft'));

-- ---------------------------------------------------------------------
-- 10. Progress / claim lookup for CSAs (who holds which slot, NO scores)
-- ---------------------------------------------------------------------
create or replace function exam_assessment_progress(p_exam_id uuid)
returns table (
  assessment_id uuid,
  student_id uuid,
  exam_skill_id uuid,
  is_compulsory boolean,
  paper_number integer,
  draw_order smallint,
  status text,
  csa_id uuid,
  csa_name text
) language sql stable security definer set search_path = public as $$
  select sa.id, sa.student_id, sa.exam_skill_id, es.is_compulsory, es.paper_number, sa.draw_order,
         sa.status, sa.csa_id, u.full_name
    from skill_assessments sa
    join exam_skills es on es.id = sa.exam_skill_id
    join users u on u.id = sa.csa_id
   where es.exam_id = p_exam_id
     and (current_app_role() = 'admin' or is_exam_csa(p_exam_id))
$$;

-- Same for the project: who holds each student's project, NO scores.
create or replace function exam_project_progress(p_exam_id uuid)
returns table (assessment_id uuid, student_id uuid, status text, csa_id uuid, csa_name text)
language sql stable security definer set search_path = public as $$
  select pa.id, pa.student_id, pa.status, pa.csa_id, u.full_name
    from project_assessments pa join users u on u.id = pa.csa_id
   where pa.exam_id = p_exam_id
     and (current_app_role() = 'admin' or is_exam_csa(p_exam_id))
$$;

-- ---------------------------------------------------------------------
-- 11. Skill library numbers
--     Every skill in the library gets a permanent number (Skill 7 = Blood
--     pressure, say). When a skill joins an exam's draw pool its paper
--     number defaults to that library number; the Admin may override it.
-- ---------------------------------------------------------------------
create sequence if not exists skills_skill_number_seq;
alter table skills add column skill_number integer;
-- Existing skills are numbered 1..n in the order they were created (then by name).
with ordered as (select id, row_number() over (order by created_at, name, id) as n from skills)
update skills s set skill_number = ordered.n from ordered where ordered.id = s.id;
select setval('skills_skill_number_seq', greatest((select coalesce(max(skill_number), 0) from skills), 1),
              (select count(*) > 0 from skills));
alter table skills
  alter column skill_number set default nextval('skills_skill_number_seq'),
  alter column skill_number set not null,
  add constraint skills_skill_number_positive check (skill_number > 0),
  add constraint skills_skill_number_unique unique (skill_number);
alter sequence skills_skill_number_seq owned by skills.skill_number;

create or replace function trg_default_paper_number()
returns trigger language plpgsql set search_path = public as $$
begin
  if not new.is_compulsory and new.paper_number is null then
    select skill_number into new.paper_number from skills where id = new.skill_id;
  end if;
  if new.is_compulsory then
    new.paper_number := null;
  end if;
  return new;
end $$;

create trigger trg_default_paper_number
  before insert or update of is_compulsory, skill_id on exam_skills
  for each row execute function trg_default_paper_number();

-- ---------------------------------------------------------------------
-- 12. Admin-only functions. Each runs as one transaction, re-checks that
--     the caller is an Admin, and writes an audit entry carrying enough
--     detail to understand it after the rows are gone.
-- ---------------------------------------------------------------------
create or replace function assert_admin()
returns uuid language plpgsql stable security definer set search_path = public as $$
begin
  if current_app_role() is distinct from 'admin' then
    raise exception 'Only an Admin can do this.';
  end if;
  return current_app_user_id();
end $$;

-- Remove a student from an exam's roster, with any scores they have in it.
create or replace function admin_remove_student_from_exam(p_exam_id uuid, p_student_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_admin uuid := assert_admin();
  v_skill_scores jsonb;
  v_project jsonb;
  v_count integer;
begin
  select coalesce(jsonb_agg(jsonb_build_object('skill', s.name, 'paper', es.paper_number,
           'scaled_score', sa.scaled_score, 'status', sa.status)), '[]'::jsonb), count(*)
    into v_skill_scores, v_count
    from skill_assessments sa join exam_skills es on es.id = sa.exam_skill_id join skills s on s.id = es.skill_id
   where es.exam_id = p_exam_id and sa.student_id = p_student_id;
  select jsonb_build_object('score', score, 'status', status) into v_project
    from project_assessments where exam_id = p_exam_id and student_id = p_student_id;

  delete from skill_assessments sa using exam_skills es
   where es.id = sa.exam_skill_id and es.exam_id = p_exam_id and sa.student_id = p_student_id;
  delete from project_assessments where exam_id = p_exam_id and student_id = p_student_id;
  delete from exam_eligibility where exam_id = p_exam_id and student_id = p_student_id;
  if not found then
    raise exception 'That student is not on this exam''s roster.';
  end if;

  insert into audit_log (entity_type, entity_id, action, actor_id, previous_value, new_value)
  values ('student', p_student_id, 'remove_from_exam', v_admin,
          jsonb_build_object('skill_scores', v_skill_scores, 'project', v_project),
          jsonb_build_object('exam', (select title from exams where id = p_exam_id),
                             'student', (select full_name from students where id = p_student_id),
                             'scores_deleted', v_count + case when v_project is null then 0 else 1 end));
  return v_count;
end $$;

-- Remove a skill from an exam, with any scores recorded against it.
create or replace function admin_remove_exam_skill(p_exam_skill_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_admin uuid := assert_admin();
  v_exam uuid;
  v_label jsonb;
  v_count integer;
begin
  select es.exam_id, jsonb_build_object('exam', e.title, 'skill', s.name, 'paper', es.paper_number,
         'compulsory', es.is_compulsory, 'assigned_marks', es.assigned_marks)
    into v_exam, v_label
    from exam_skills es join exams e on e.id = es.exam_id join skills s on s.id = es.skill_id
   where es.id = p_exam_skill_id;
  if v_exam is null then
    raise exception 'That skill is no longer on this exam.';
  end if;
  delete from skill_assessments where exam_skill_id = p_exam_skill_id;
  get diagnostics v_count = row_count;
  delete from exam_skills where id = p_exam_skill_id;

  insert into audit_log (entity_type, entity_id, action, actor_id, previous_value, new_value)
  values ('exam_skill', p_exam_skill_id, 'remove_skill', v_admin, v_label,
          jsonb_build_object('scores_deleted', v_count));
  return v_count;
end $$;

-- Delete an entire exam and everything recorded under it.
create or replace function admin_delete_exam(p_exam_id uuid, p_confirm_title text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_admin uuid := assert_admin();
  v_title text;
  v_summary jsonb;
begin
  select title into v_title from exams where id = p_exam_id;
  if v_title is null then
    raise exception 'That exam no longer exists.';
  end if;
  if trim(p_confirm_title) is distinct from trim(v_title) then
    raise exception 'The title you typed does not match the exam title.';
  end if;
  select jsonb_build_object(
           'title', v_title,
           'students', (select count(*) from exam_eligibility where exam_id = p_exam_id),
           'skills', (select count(*) from exam_skills where exam_id = p_exam_id),
           'skill_scores', (select count(*) from skill_assessments sa join exam_skills es on es.id = sa.exam_skill_id where es.exam_id = p_exam_id),
           'project_scores', (select count(*) from project_assessments where exam_id = p_exam_id))
    into v_summary;

  delete from skill_assessments sa using exam_skills es where es.id = sa.exam_skill_id and es.exam_id = p_exam_id;
  delete from project_assessments where exam_id = p_exam_id;
  -- Chapters are locked once scored; the scores are gone now, so lift it.
  delete from project_component_scores s using exam_project_components c where c.id = s.component_id and c.exam_id = p_exam_id;
  delete from exams where id = p_exam_id; -- skills, roster, CSAs, chapters cascade

  insert into audit_log (entity_type, entity_id, action, actor_id, previous_value, new_value)
  values ('exam', p_exam_id, 'delete_exam', v_admin, v_summary, null);
end $$;

-- A CSA recorded the wrong paper number and already submitted: move the
-- assessment to the correct skill, clear its step scores, and reopen it as a
-- draft for the same CSA to rescore. The old record is kept in the audit log.
create or replace function admin_reassign_skill_assessment(p_assessment_id uuid, p_new_exam_skill_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_admin uuid := assert_admin();
  v_old record;
  v_new_exam uuid;
  v_steps jsonb;
begin
  select sa.*, es.exam_id, s.name as skill_name, es.paper_number
    into v_old
    from skill_assessments sa join exam_skills es on es.id = sa.exam_skill_id join skills s on s.id = es.skill_id
   where sa.id = p_assessment_id;
  if v_old.id is null then
    raise exception 'That assessment no longer exists.';
  end if;
  select exam_id into v_new_exam from exam_skills where id = p_new_exam_skill_id;
  if v_new_exam is distinct from v_old.exam_id then
    raise exception 'The new skill must be on the same exam.';
  end if;
  if p_new_exam_skill_id = v_old.exam_skill_id then
    raise exception 'That is already the recorded skill.';
  end if;

  select coalesce(jsonb_object_agg(skill_step_id, score), '{}'::jsonb) into v_steps
    from skill_assessment_step_scores where skill_assessment_id = p_assessment_id;
  delete from skill_assessment_step_scores where skill_assessment_id = p_assessment_id;

  update skill_assessments
     set exam_skill_id = p_new_exam_skill_id, raw_score = null, scaled_score = null,
         status = 'draft', submitted_at = null, updated_at = now()
   where id = p_assessment_id;

  insert into audit_log (entity_type, entity_id, action, actor_id, previous_value, new_value)
  values ('skill_assessment', p_assessment_id, 'reassign', v_admin,
          jsonb_build_object('skill', v_old.skill_name, 'paper', v_old.paper_number,
                             'raw_score', v_old.raw_score, 'scaled_score', v_old.scaled_score,
                             'status', v_old.status, 'step_scores', v_steps),
          jsonb_build_object('skill', (select s.name from exam_skills es join skills s on s.id = es.skill_id where es.id = p_new_exam_skill_id),
                             'paper', (select paper_number from exam_skills where id = p_new_exam_skill_id),
                             'status', 'draft'));
end $$;

-- Free a slot held by a CSA's unfinished draft (e.g. they left mid-exam).
create or replace function admin_release_claim(p_assessment_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_admin uuid := assert_admin();
  v_row record;
begin
  select sa.status, sa.raw_score, u.full_name as csa, s.name as skill, st.full_name as student
    into v_row
    from skill_assessments sa join users u on u.id = sa.csa_id
    join exam_skills es on es.id = sa.exam_skill_id join skills s on s.id = es.skill_id
    join students st on st.id = sa.student_id
   where sa.id = p_assessment_id;
  if v_row.status is null then
    raise exception 'That assessment no longer exists.';
  end if;
  if v_row.status <> 'draft' then
    raise exception 'Only an unsubmitted draft can be released. Use Correct or Reassign for submitted scores.';
  end if;
  delete from skill_assessments where id = p_assessment_id;
  insert into audit_log (entity_type, entity_id, action, actor_id, previous_value, new_value)
  values ('skill_assessment', p_assessment_id, 'release_claim', v_admin,
          jsonb_build_object('csa', v_row.csa, 'skill', v_row.skill, 'student', v_row.student, 'raw_score', v_row.raw_score),
          null);
end $$;

revoke all on function admin_remove_student_from_exam(uuid, uuid), admin_remove_exam_skill(uuid),
  admin_delete_exam(uuid, text), admin_reassign_skill_assessment(uuid, uuid), admin_release_claim(uuid)
  from public, anon;
grant execute on function admin_remove_student_from_exam(uuid, uuid), admin_remove_exam_skill(uuid),
  admin_delete_exam(uuid, text), admin_reassign_skill_assessment(uuid, uuid), admin_release_claim(uuid)
  to authenticated;

-- ---------------------------------------------------------------------
-- 13. Retire the old assignment tables (the exam CSA roster replaces them)
-- ---------------------------------------------------------------------
drop table exam_skill_csa_assignments;
drop table exam_project_csa_assignments;

-- Recompute practical maxima for all existing exams under the new rule.
select recompute_exam_practical_max(id) from exams;

commit;
