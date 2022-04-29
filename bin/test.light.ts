import IPipe from "../src";
import axios from "axios";
import LightAccept from "../src/accept/light.accept";
import LightConnect from "../src/connect/light.connect";

(async () => {
   let ipipe = new IPipe({});
   ipipe.createAcceptServer(4321);
})();
