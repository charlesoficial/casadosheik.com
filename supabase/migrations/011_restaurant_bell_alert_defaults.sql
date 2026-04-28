-- Keep existing order settings compatible while standardizing the production alert tone.
-- This is a non-destructive data/config update: no schema, policies, or real order data are changed.
update public.order_settings
set
  alert_sound = 'Alerta 1',
  alert_frequency = 'repeat_while_pending',
  updated_at = now()
where alert_sound is distinct from 'Alerta 1'
   or alert_frequency is distinct from 'repeat_while_pending';
