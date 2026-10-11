-- 028_battery_below_100_is_used.sql
-- تصحيح لمرة واحدة: أي آيفون "جديد" نسبة بطاريته أقل من 100% يبقى "مستعمل".
-- بدون قاعدة دائمة (الإدخال بعد كده يدوي). بنشيل أي trigger اتعمل قبل كده.

drop trigger if exists trg_battery_below_100_is_used on public.mobile_devices;
drop function if exists public._battery_below_100_is_used();
drop function if exists public._is_iphone_model(uuid);

update public.mobile_devices d
set condition = 'used'
from public.mobile_models m
join public.mobile_brands b on b.id = m.brand_id
where d.model_id = m.id
  and d.condition = 'new' and d.battery_health is not null and d.battery_health < 100
  and (b.name ilike '%apple%' or b.name ilike '%iphone%'
    or b.name ilike '%ايفون%' or b.name ilike '%آيفون%'
    or b.name ilike '%ابل%'   or b.name ilike '%أبل%');
