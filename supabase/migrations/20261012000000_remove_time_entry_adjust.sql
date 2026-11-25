-- Os trechos de tempo registrados não podem ser alterados por ninguém (evita adulterar o tempo trabalhado).
-- Remove a função que permitia corrigir o fim de um trecho; a pausa automática e o aviso limitam o esquecimento.
drop function public.adjust_time_entry(uuid, timestamp with time zone);
