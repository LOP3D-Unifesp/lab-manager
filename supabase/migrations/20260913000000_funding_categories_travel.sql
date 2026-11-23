-- Two more funding lines (rubricas) common in research grants: tickets (passagens) and per diems (diarias).
-- They apply to the funding of a project and to purchase requests.
alter type public.project_funding_category add value if not exists 'passagens';
alter type public.project_funding_category add value if not exists 'diarias';
