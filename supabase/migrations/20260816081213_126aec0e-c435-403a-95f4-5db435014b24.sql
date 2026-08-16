CREATE OR REPLACE FUNCTION public.reset_release_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.release_date IS DISTINCT FROM OLD.release_date THEN
    NEW.release_notified_at = NULL;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS reset_release_notification_on_date_change ON public.games;
CREATE TRIGGER reset_release_notification_on_date_change
BEFORE UPDATE ON public.games
FOR EACH ROW
EXECUTE FUNCTION public.reset_release_notification();