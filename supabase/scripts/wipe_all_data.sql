-- Wipes ALL exam data so the new draw-based model starts clean.
-- KEEPS: user accounts (public.users) so the Admin and CSAs can still sign in.
-- DELETES: scores, audit log, rosters, exams, skills + rubrics, students,
--          courses and academic sessions (recreated inline when creating an exam).
-- Irreversible. Run once, before 009.
begin;
delete from skill_assessment_step_scores;
delete from skill_assessments;
delete from project_assessments;
delete from audit_log;
delete from exam_skill_csa_assignments;
delete from exam_project_csa_assignments;
delete from exam_eligibility;
delete from exam_skills;
delete from exams;
delete from skill_steps;
delete from skills;
delete from students;
delete from courses;
delete from academic_sessions;
commit;
