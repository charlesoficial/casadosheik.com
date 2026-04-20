-- Eleva o volume padrao dos alertas para ambiente real de restaurante.
alter table order_settings
  alter column alert_volume set default 100;

update order_settings
set
  alert_volume = 100,
  alert_frequency = 'repeat_while_pending',
  notifications_enabled = true,
  updated_at = now()
where alert_volume < 100;
