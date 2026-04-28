-- Mesas iniciais para gerar QR Codes e validar o fluxo presencial logo após o setup.
insert into mesas (numero, ativa)
select numero, true
from generate_series(1, 15) as numero
on conflict (numero) do update
set ativa = excluded.ativa;
