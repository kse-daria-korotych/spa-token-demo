import Keycloak from "keycloak-js";

const keycloak = new Keycloak({
  url: "https://keycloak.192.168.151.10.nip.io",
  realm: "api-security",
  clientId: "spa-token-demo",
});

export default keycloak;
