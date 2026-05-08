-- Keep restaurant operation manual: accepting an order must never dispatch print jobs.
alter table if exists printers
  alter column auto_print_on_accept set default false;

update printers
set auto_print_on_accept = false
where auto_print_on_accept is distinct from false;

update order_settings
set
  auto_print_enabled = false,
  default_auto_print_printer_id = null,
  updated_at = now()
where
  auto_print_enabled is distinct from false
  or default_auto_print_printer_id is not null;
