// Service worker minimal : necessaire pour l'installabilite PWA (TWA Android).
// KANIO est une app de donnees temps reel (cotes, solde) : on ne met rien en
// cache, on se contente de laisser passer les requetes reseau normalement.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Passthrough volontaire : pas de cache offline pour des donnees qui doivent
  // toujours etre fraiches (cotes, solde KANIO, statut des paris).
});
