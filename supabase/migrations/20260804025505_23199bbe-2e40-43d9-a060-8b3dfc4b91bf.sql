revoke execute on function public.has_role(uuid, public.app_role) from anon, public;
revoke execute on function public.ensure_profile(text, text, text) from anon, public;
revoke execute on function public.apply_referral(text) from anon, public;
revoke execute on function public.join_tournament(uuid) from anon, public;
revoke execute on function public.resolve_request(uuid, boolean) from anon, public;
revoke execute on function public.submit_result(uuid, integer, integer, integer, integer) from anon, public;
revoke execute on function public.set_user_role(uuid, boolean) from anon, public;
revoke execute on function public.admin_list_users() from anon, public;
revoke execute on function public.admin_user_ids() from anon, public;

grant execute on function public.has_role(uuid, public.app_role) to authenticated;
grant execute on function public.ensure_profile(text, text, text) to authenticated;
grant execute on function public.apply_referral(text) to authenticated;
grant execute on function public.join_tournament(uuid) to authenticated;
grant execute on function public.resolve_request(uuid, boolean) to authenticated;
grant execute on function public.submit_result(uuid, integer, integer, integer, integer) to authenticated;
grant execute on function public.set_user_role(uuid, boolean) to authenticated;
grant execute on function public.admin_list_users() to authenticated;
grant execute on function public.admin_user_ids() to authenticated;