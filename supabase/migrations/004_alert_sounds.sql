-- Amplia o enum de sons de alerta para oferecer perfis diferentes ao operador.
alter type alert_sound_enum add value if not exists 'Alerta 4';
alter type alert_sound_enum add value if not exists 'Alerta 5';
alter type alert_sound_enum add value if not exists 'Alerta 6';
alter type alert_sound_enum add value if not exists 'Alerta 7';
alter type alert_sound_enum add value if not exists 'Alerta 8';
