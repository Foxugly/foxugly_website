/**
 * Base de l'API REST Django (chemin relatif).
 *
 * En dev, `ng serve` proxifie `/api` vers http://127.0.0.1:8001 (voir
 * proxy.conf.json) : tout est same-origin, donc les cookies de session + CSRF
 * fonctionnent et il n'y a pas de problème CORS.
 *
 * NOTE : le backend tourne sur le port 8001 (le 8000 est pris par un autre
 * projet). Le port est défini dans proxy.conf.json.
 */
export const API_BASE = '/api';
