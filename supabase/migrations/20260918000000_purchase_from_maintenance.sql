-- A purchase request can come from a maintenance request (a part the machine needs). The link lets the maintenance
-- list show the status of the part and the purchases page show what it is for. Deleting the maintenance request keeps
-- the purchase (the link is just cleared).

alter table public.purchase_requests
    add column maintenance_request_id uuid,
    add constraint purchase_requests_maintenance_request_id_fkey
        foreign key (maintenance_request_id) references public.maintenance_requests (id) on delete set null;

create index purchase_requests_maintenance_request_idx on public.purchase_requests (maintenance_request_id)
    where maintenance_request_id is not null;
